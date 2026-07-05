# Play Bike Free

Standalone Node/Express app for `playbike.free`.

## Local

```bash
npm install
npm run dev
```

Open `http://localhost:5177`.

## Environment

- `MONGO_URL`: Bikology MongoDB connection string.
- `MONGO_DB_NAME`: Dedicated database name. Use `playbikefree`.
- `SESSION_SECRET`: Random session secret.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth secret.
- `GOOGLE_CALLBACK_URL`: `https://playbike.free/auth/google/callback` in production.

Scores use the `bikefree_users`, `bikefree_scores`, `bikefree_runs`, and `bikefree_sessions` collections.

## Credits

Bike Free is based on [basicallydan/skifree.js](https://github.com/basicallydan/skifree.js).
