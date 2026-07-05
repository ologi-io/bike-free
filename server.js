'use strict';

const crypto = require('crypto');
const path = require('path');

const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

dotenv.config();

const app = express();
const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || '';
const sessionSecret = process.env.SESSION_SECRET || 'dev-only-bike-free-secret';
const port = Number(process.env.PORT || 5177);
const publicPath = path.join(__dirname, 'public');

let db;
const rateBuckets = new Map();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  name: 'bikefree.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  },
  store: mongoUrl ? MongoStore.create({
    mongoUrl,
    collectionName: 'bikefree_sessions',
    dbName: process.env.MONGO_DB_NAME || undefined,
  }) : undefined,
}));

passport.serializeUser((user, done) => done(null, String(user._id)));
passport.deserializeUser(async (id, done) => {
  try {
    if (!db || !ObjectId.isValid(id)) return done(null, false);
    const user = await db.collection('bikefree_users').findOne({ _id: new ObjectId(id) });
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      if (!db) return done(new Error('Database is not connected.'));
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      const now = new Date();
      const user = await db.collection('bikefree_users').findOneAndUpdate(
        { googleId: profile.id },
        {
          $set: {
            googleId: profile.id,
            displayName: profile.displayName || email || 'Rider',
            email,
            avatarUrl: profile.photos && profile.photos[0] && profile.photos[0].value,
            updatedAt: now,
            lastLoginAt: now,
          },
          $setOnInsert: {
            country: '',
            bestDistance: 0,
            createdAt: now,
          },
        },
        { returnDocument: 'after', upsert: true }
      );
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
}

app.use(passport.initialize());
app.use(passport.session());

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to submit a score.' });
  next();
}

function authConfigured(req, res, next) {
  if (!db) return res.status(503).send('Database is not connected.');
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).send('Google auth is not configured.');
  }
  next();
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function hashIp(ip) {
  if (!ip) return '';
  return crypto.createHash('sha256').update(`${sessionSecret}:${ip}`).digest('hex');
}

function rateLimit(name, limit, windowMs) {
  return (req, res, next) => {
    // ponytail: per-dyno memory limit; use Redis if this app runs multiple dynos.
    const now = Date.now();
    const key = name + ':' + hashIp(clientIp(req));
    const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > limit) return res.status(429).json({ error: "Slow down." });
    next();
  };
}

app.get('/auth/google', authConfigured, (req, res, next) => {
  const returnTo = String(req.query.returnTo || '');
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) req.session.returnTo = returnTo;
  next();
}, passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
}));

app.get('/auth/google/callback', authConfigured, passport.authenticate('google', {
  failureRedirect: '/leaderboard?auth=failed',
}), (req, res) => {
  const returnTo = req.session.returnTo || '/leaderboard';
  delete req.session.returnTo;
  res.redirect(returnTo);
});

app.post('/logout', (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    res.redirect('/leaderboard');
  });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.json({ user: null, authConfigured: Boolean(process.env.GOOGLE_CLIENT_ID) });
  res.json({
    user: {
      id: String(req.user._id),
      displayName: req.user.displayName,
      country: req.user.country || '',
      bestDistance: req.user.bestDistance || 0,
      avatarUrl: req.user.avatarUrl || '',
    },
    authConfigured: true,
  });
});

app.patch('/api/me', requireUser, async (req, res) => {
  const country = String(req.body.country || '').trim().slice(0, 56);
  await db.collection('bikefree_users').updateOne(
    { _id: req.user._id },
    { $set: { country, updatedAt: new Date() } }
  );
  req.user.country = country;
  res.json({ ok: true, country });
});

app.post('/api/runs', rateLimit('runs', 30, 60 * 1000), async (req, res) => {
  if (!db) return res.json({ runId: '' });
  const run = {
    _id: crypto.randomUUID(),
    userId: req.user ? req.user._id : null,
    startedAt: new Date(),
    ipHash: hashIp(clientIp(req)),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    submittedAt: null,
  };
  await db.collection('bikefree_runs').insertOne(run);
  res.json({ runId: run._id });
});

app.post('/api/scores', rateLimit('scores', 10, 60 * 1000), requireUser, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database is not connected.' });

  const runId = String(req.body.runId || '');
  const distance = Number(req.body.distance);
  if (!runId || !Number.isFinite(distance) || distance < 0) {
    return res.status(400).json({ error: 'Invalid score.' });
  }

  const run = await db.collection('bikefree_runs').findOne({ _id: runId });
  if (!run || run.submittedAt) return res.status(400).json({ error: 'Invalid run.' });
  if (run.userId && String(run.userId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Run belongs to another user.' });
  }

  const elapsedMs = Date.now() - new Date(run.startedAt).getTime();
  const maxDistance = Math.max(100, (elapsedMs / 1000) * 40);
  if (distance > maxDistance) {
    return res.status(400).json({ error: 'Score failed validation.' });
  }

  const score = {
    userId: req.user._id,
    runId,
    distance: Math.round(distance * 10) / 10,
    createdAt: new Date(),
    ipHash: hashIp(clientIp(req)),
  };
  await db.collection('bikefree_scores').insertOne(score);
  await db.collection('bikefree_runs').updateOne(
    { _id: runId },
    { $set: { submittedAt: score.createdAt, userId: req.user._id } }
  );
  await db.collection('bikefree_users').updateOne(
    { _id: req.user._id, bestDistance: { $lt: score.distance } },
    { $set: { bestDistance: score.distance, bestScoreAt: score.createdAt } }
  );

  res.json({ ok: true, score: score.distance });
});

app.get('/api/leaderboard', async (req, res) => {
  if (!db) return res.json({ scores: [] });
  const limit = Math.min(Number(req.query.limit || 50), 100);
  const scores = await db.collection('bikefree_users')
    .find({ bestDistance: { $gt: 0 } })
    .project({ displayName: 1, country: 1, bestDistance: 1, bestScoreAt: 1, avatarUrl: 1 })
    .sort({ bestDistance: -1, bestScoreAt: 1 })
    .limit(limit)
    .toArray();

  res.json({
    scores: scores.map((score, index) => ({
      rank: index + 1,
      name: score.displayName || 'Rider',
      country: score.country || '',
      distance: score.bestDistance || 0,
      bestScoreAt: score.bestScoreAt || null,
      avatarUrl: score.avatarUrl || '',
    })),
  });
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(publicPath, 'leaderboard.html'));
});

app.use(express.static(publicPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

async function start() {
  if (mongoUrl) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || undefined);
    await db.collection('bikefree_scores').createIndex({ userId: 1, distance: -1 });
    await db.collection('bikefree_users').createIndex({ bestDistance: -1 });
    await db.collection('bikefree_runs').createIndex({ startedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });
  }

  app.listen(port, () => {
    console.log(`Bike Free listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
