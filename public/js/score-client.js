(function () {
  var currentRunId = '';
  var currentUser = null;
  var authReady = false;
  var account = document.getElementById('game-account');
  var status = document.getElementById('score-status');
  var bestDistance = document.getElementById('best-distance');
  var travelledDistance = document.getElementById('travelled-distance');
  var modal = document.getElementById('score-modal');
  var modalContent = document.getElementById('score-modal-content');
  var instructionsTab = document.getElementById('instructions-tab');
  var leaderboardTab = document.getElementById('leaderboard-tab');
  var profileTab = document.getElementById('profile-tab');
  var headerLeaderboardButton = document.getElementById('header-leaderboard-button');
  var resumeOnModalClose = false;
  var lastTravelledText = '';
  var pendingKey = 'bikeFreePendingScore';
  var pendingScoreTtl = 10 * 60 * 1000;
  var countries = window.BikeFreeCountries;
  var profileFeedback = null;

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function formatDistance(value) {
    return (Number(value) || 0).toFixed(1) + 'm';
  }

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function setBestDistance(value) {
    if (bestDistance) bestDistance.textContent = formatDistance(value);
  }

  function setTravelledDistance(value) {
    var text = formatDistance(value);
    if (travelledDistance && text !== lastTravelledText) {
      travelledDistance.textContent = text;
      lastTravelledText = text;
    }
  }

  function bestDistanceToBeat() {
    if (currentUser) return Number(currentUser.bestDistance) || 0;
    return Number(localStorage.getItem('highScore')) || 0;
  }

  function savePendingScore(runId, distance) {
    if (!runId) return;
    sessionStorage.setItem(pendingKey, JSON.stringify({
      runId: runId,
      distance: Number(distance) || 0,
      expiresAt: Date.now() + pendingScoreTtl
    }));
  }

  function getPendingScore() {
    try {
      var pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
      if (pending && pending.expiresAt && pending.expiresAt < Date.now()) {
        clearPendingScore();
        return null;
      }
      return pending;
    } catch (error) {
      clearPendingScore();
      return null;
    }
  }

  function clearPendingScore() {
    sessionStorage.removeItem(pendingKey);
  }

  function openModal(mode) {
    if (!modal) return;
    modal.dataset.mode = mode || 'menu';
    modal.hidden = false;
  }

  function closeModal() {
    if (modal && modal.dataset.mode === 'score') clearPendingScore();
    if (modal) modal.hidden = true;
    if (resumeOnModalClose) {
      resumeOnModalClose = false;
      document.dispatchEvent(new CustomEvent('bikefree:resume'));
    }
  }

  function setActiveTab(tab) {
    if (instructionsTab) instructionsTab.classList.toggle('active', tab === 'instructions');
    if (leaderboardTab) leaderboardTab.classList.toggle('active', tab === 'leaderboard');
    if (profileTab) profileTab.classList.toggle('active', tab === 'profile');
  }

  function validateProfileUsername(value) {
    var username = String(value || '').trim();
    if (!username) return '';
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return 'Usernames must be 3-20 letters, numbers, or underscores.';
    return '';
  }

  function profileHtml() {
    if (!authReady) return '<p class="modal-note">Score storage is offline right now.</p>';
    if (currentUser) {
      return '<div class="profile-panel">' +
        '<p class="profile-signed-in">Signed in as ' + escapeHtml(currentUser.displayName) + '</p>' +
        '<form class="profile-form modal-profile-form" data-profile-form>' +
          '<input name="username" aria-label="Username" placeholder="Username" maxlength="20" autocomplete="off" value="' + escapeHtml(currentUser.username || '') + '">' +
          (countries ? countries.selectHtml(currentUser.country, 'country') : '<input name="country" aria-label="Country" placeholder="Country" value="' + escapeHtml(currentUser.country) + '">') +
          '<button>Save</button>' +
          '<p class="profile-feedback' + (profileFeedback ? ' ' + profileFeedback.type : '') + '" data-profile-feedback>' + (profileFeedback ? escapeHtml(profileFeedback.message) : '') + '</p>' +
        '</form>' +
      '</div>' +
      '<div class="profile-footer-actions">' +
        '<form method="post" action="/logout"><button class="button subtle">Sign out</button></form>' +
        '<button id="profile-start-riding-button">Start Riding</button>' +
      '</div>';
    }
    return '<div class="profile-footer-actions signed-out"><a class="button" href="/auth/google?returnTo=/%3Ftab%3Dprofile">Sign In</a><button id="profile-start-riding-button">Start Riding</button></div>';
  }

  function bindProfileForms(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-profile-form]'), function (form) {
      var feedback = form.querySelector('[data-profile-feedback]');
      function showFeedback(type, message) {
        profileFeedback = { type: type, message: message };
        if (feedback) {
          feedback.className = 'profile-feedback ' + type;
          feedback.textContent = message;
        }
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var usernameError = validateProfileUsername(event.target.username.value);
        if (usernameError) {
          showFeedback('error', usernameError);
          setStatus(usernameError);
          return;
        }

        showFeedback('pending', 'Saving profile...');
        fetch('/api/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: event.target.username.value,
            country: event.target.country.value
          })
        }).then(function (response) {
          return response.json().then(function (profile) {
            if (!response.ok) throw new Error(profile.error || 'Profile save failed.');
            return profile;
          });
        }).then(function (profile) {
          currentUser.username = profile.username;
          currentUser.country = profile.country;
          event.target.username.value = profile.username || '';
          event.target.country.value = profile.country || '';
          setStatus('Profile saved.');
          showFeedback('success', 'Profile saved.');
        }).catch(function (error) {
          var message = error.message || 'Profile save failed.';
          setStatus(message);
          showFeedback('error', message);
        });
      });
    });
  }

  function countryLabel(value) {
    var code = countries ? countries.normalize(value) : String(value || '');
    return code && countries ? countries.flag(code) + ' ' + code : '';
  }

  function icon(name, className) {
    if (name === 'right') {
      return '<svg class="svg-icon ' + (className || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
    }
    return '<span class="bikefree-icon sprite-icon-' + name + ' ' + (className || '') + '" aria-hidden="true"></span>';
  }

  function setTabLabels() {
    if (instructionsTab) instructionsTab.innerHTML = icon('book', 'tab-icon') + '<span>Instructions</span>';
    if (leaderboardTab) leaderboardTab.innerHTML = icon('trophy', 'tab-icon') + '<span>Leaderboard</span>';
    if (profileTab) profileTab.innerHTML = icon('user', 'tab-icon') + '<span>Profile</span>';
  }

  function renderInstructions() {
    if (!modalContent) return;
    setActiveTab('instructions');
    openModal('menu');
    modalContent.innerHTML =
      '<div class="modal-grid">' +
        '<section class="instructions-main">' +
          '<p class="eyebrow">Instructions</p>' +
          '<h2 id="score-modal-title">Welcome to Bike Free</h2>' +
          '<p class="instructions-lede">Avoid obstacles and ride as far as you can.</p>' +
          '<h3>How to Play</h3>' +
          '<ul class="instruction-list">' +
            '<li><span class="instruction-icon">' + icon('arrow') + '</span><span><b>Steer:</b> Move your mouse or click to steer toward a spot.</span></li>' +
            '<li><span class="instruction-icon">' + icon('controls') + '</span><span><b>Pedal &amp; Brake:</b> Use A/D or arrow keys to steer. W pedals, S brakes.</span></li>' +
            '<li><span class="instruction-icon">' + icon('lightning') + '</span><span><b>Boost:</b> Press F for a short speed boost.</span></li>' +
            '<li><span class="instruction-icon">' + icon('bike') + '</span><span><b>Trick:</b> Press T while airborne to attempt a backflip.</span></li>' +
            '<li><span class="instruction-icon">' + icon('tree') + '</span><span><b>Stay safe:</b> Avoid rocks, bushes, and trees. Land jumps cleanly.</span></li>' +
            '<li><span class="instruction-icon">' + icon('trophy') + '</span><span><b>Score:</b> You get 3 bikers per run. Sign in to save your best distance.</span></li>' +
          '</ul>' +
          '<div class="modal-actions">' +
            '<button id="start-riding-button">' + icon('bike', 'button-icon') + '<span>Start Riding</span></button>' +
            '<button class="subtle" id="instructions-leaderboard-button">' + icon('trophy', 'button-icon') + '<span>View Leaderboard</span>' + icon('right', 'button-icon') + '</button>' +
          '</div>' +
        '</section>' +
        '<aside class="modal-preview">' +
          '<section class="modal-side-card">' +
            '<h3><span class="side-card-icon">' + icon('trophy') + '</span> Top Riders</h3>' +
            '<div id="leaderboard-preview">Loading...</div>' +
            '<button class="subtle" id="view-leaderboard-button"><span>View Full Leaderboard</span>' + icon('right', 'button-icon') + '</button>' +
          '</section>' +
          '<section class="modal-side-card">' +
            '<h3><span class="side-card-icon">' + icon('bulb') + '</span> Pro Tip</h3>' +
            '<p>Use speed boosts strategically and stay centered on the track to react faster.</p>' +
          '</section>' +
        '</aside>' +
      '</div>';

    document.getElementById('start-riding-button').addEventListener('click', closeModal);
    document.getElementById('instructions-leaderboard-button').addEventListener('click', renderLeaderboard);
    document.getElementById('view-leaderboard-button').addEventListener('click', renderLeaderboard);
    renderLeaderboardPreview();
  }

  function leaderboardRows(scores, preview) {
    if (!scores.length) {
      return '<tr><td colspan="3">No scores yet.</td></tr>';
    }
    return scores.map(function (score) {
      var country = countryLabel(score.country);
      var countryHtml = country ? (preview ? '<br>' : ' ') + '<span class="muted">' + escapeHtml(country) + '</span>' : '';
      var distance = preview ? formatDistance(score.distance).replace('m', ' m') : formatDistance(score.distance);
      return '<tr>' +
        '<td>' + score.rank + '</td>' +
        '<td>' + escapeHtml(score.name) + countryHtml + '</td>' +
        '<td>' + distance + '</td>' +
      '</tr>';
    }).join('');
  }

  function fetchLeaderboard(limit) {
    return fetch('/api/leaderboard?limit=' + limit)
      .then(function (response) { return response.json(); })
      .then(function (data) { return data.scores || []; });
  }

  function renderLeaderboardPreview() {
    var preview = document.getElementById('leaderboard-preview');
    if (!preview) return;
    fetchLeaderboard(1).then(function (scores) {
      preview.innerHTML =
        '<table class="modal-leaderboard-table">' +
          '<thead><tr><th>#</th><th>Rider</th><th>Distance</th></tr></thead>' +
          '<tbody>' + leaderboardRows(scores, true) + '</tbody>' +
        '</table>';
    }).catch(function () {
      preview.textContent = 'Leaderboard unavailable.';
    });
  }

  function renderLeaderboard() {
    if (!modalContent) return;
    setActiveTab('leaderboard');
    openModal('menu');
    modalContent.innerHTML =
      '<p class="eyebrow">Leaderboard</p>' +
      '<h2 id="score-modal-title">Top Riders</h2>' +
      '<div id="modal-leaderboard">Loading...</div>' +
      '<div class="modal-actions">' +
        '<button id="back-to-instructions-button" class="subtle">Instructions</button>' +
        '<button id="close-leaderboard-button">Start Riding</button>' +
      '</div>';
    document.getElementById('back-to-instructions-button').addEventListener('click', renderInstructions);
    document.getElementById('close-leaderboard-button').addEventListener('click', closeModal);

    fetchLeaderboard(25).then(function (scores) {
      document.getElementById('modal-leaderboard').innerHTML =
        '<table class="modal-leaderboard-table">' +
          '<thead><tr><th>Rank</th><th>Rider</th><th>Distance</th></tr></thead>' +
          '<tbody>' + leaderboardRows(scores) + '</tbody>' +
        '</table>';
    }).catch(function () {
      document.getElementById('modal-leaderboard').textContent = 'Leaderboard unavailable.';
    });
  }

  function renderProfile() {
    if (!modalContent) return;
    setActiveTab('profile');
    openModal('menu');
    modalContent.innerHTML =
      '<p class="eyebrow">Profile</p>' +
      '<h2 id="score-modal-title">Rider Profile</h2>' +
      '<p class="modal-note">Choose the rider name and country shown on the leaderboard.</p>' +
      '<div class="profile-tab-panel">' + profileHtml() + '</div>';
    var startButton = document.getElementById('profile-start-riding-button');
    if (startButton) startButton.addEventListener('click', closeModal);
    bindProfileForms(modalContent);
  }

  function openPausedMenu() {
    resumeOnModalClose = true;
    document.dispatchEvent(new CustomEvent('bikefree:pause'));
    renderInstructions();
  }

  function saveScore(runId, distance) {
    if (!currentUser) {
      showScoreModal(runId, distance);
      return;
    }

    clearPendingScore();
    modalContent.querySelector('#score-modal-message').textContent = 'Saving score...';
    modalContent.querySelector('#score-modal-actions').innerHTML = '<button disabled>Saving</button>';
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: runId, distance: Number(distance) || 0 })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || 'Score save failed.');
        return data;
      });
    }).then(function (data) {
      clearPendingScore();
      currentUser.bestDistance = Math.max(currentUser.bestDistance || 0, data.score || 0);
      setBestDistance(currentUser.bestDistance);
      setStatus('Saved distance: ' + formatDistance(data.score) + '.');
      modalContent.querySelector('#score-modal-message').textContent = 'Score saved.';
      modalContent.querySelector('#score-modal-actions').innerHTML = '<button id="score-view-leaderboard">Leaderboard</button><button id="score-done-button" class="subtle">Close</button>';
      document.getElementById('score-view-leaderboard').addEventListener('click', renderLeaderboard);
      document.getElementById('score-done-button').addEventListener('click', closeModal);
    }).catch(function (error) {
      setStatus(error.message || 'Score save failed.');
      modalContent.querySelector('#score-modal-message').textContent = error.message || 'Score save failed.';
      modalContent.querySelector('#score-modal-actions').innerHTML = '<button id="score-submit-button">Try Again</button><button id="score-done-button" class="subtle">Close</button>';
      document.getElementById('score-submit-button').addEventListener('click', function () {
        saveScore(runId, distance);
      });
      document.getElementById('score-done-button').addEventListener('click', closeModal);
    });
  }

  function showScoreModal(runId, distance) {
    if (!currentUser) savePendingScore(runId, distance);
    if (!modalContent) return;
    openModal('score');
    modalContent.innerHTML =
      '<p class="eyebrow">Game Over</p>' +
      '<h2 id="score-modal-title">Submit your score</h2>' +
      '<p class="score-modal-distance">Distance: <b>' + formatDistance(distance) + '</b></p>' +
      '<p id="score-modal-message"></p>' +
      '<div class="score-modal-actions" id="score-modal-actions"></div>';

    if (!currentUser) {
      document.getElementById('score-modal-message').textContent = 'Sign in with Google to submit this score.';
      document.getElementById('score-modal-actions').innerHTML = '<a class="button" href="/auth/google?returnTo=/%3Ftab%3Dprofile">Sign in to submit</a><button id="score-done-button" class="subtle">Close</button>';
      document.getElementById('score-done-button').addEventListener('click', closeModal);
      setStatus('Sign in to submit ' + formatDistance(distance) + '.');
      return;
    }

    document.getElementById('score-modal-message').textContent = 'Submit this distance to the global leaderboard.';
    document.getElementById('score-modal-actions').innerHTML = '<button id="score-submit-button">Submit Score</button><button id="score-view-leaderboard" class="subtle">Leaderboard</button><button id="score-done-button" class="subtle">Close</button>';
    document.getElementById('score-submit-button').addEventListener('click', function () {
      saveScore(runId, distance);
    });
    document.getElementById('score-view-leaderboard').addEventListener('click', renderLeaderboard);
    document.getElementById('score-done-button').addEventListener('click', closeModal);
  }

  function showTryAgainModal(distance, best) {
    clearPendingScore();
    if (!modalContent) return;
    openModal('score');
    modalContent.innerHTML =
      '<p class="eyebrow">Game Over</p>' +
      '<h2 id="score-modal-title">Great try</h2>' +
      '<p class="score-modal-distance">Distance: <b>' + formatDistance(distance) + '</b></p>' +
      '<p id="score-modal-message">Your best is ' + formatDistance(best) + '. Try again and beat it to submit a score.</p>' +
      '<div class="score-modal-actions" id="score-modal-actions">' +
        '<button id="score-done-button">Try Again</button>' +
        '<button id="score-view-leaderboard" class="subtle">Leaderboard</button>' +
      '</div>';
    document.getElementById('score-done-button').addEventListener('click', closeModal);
    document.getElementById('score-view-leaderboard').addEventListener('click', renderLeaderboard);
  }

  function maybeResumePendingScore() {
    var pending = getPendingScore();
    if (!pending || !pending.runId || !currentUser) return;
    if ((Number(pending.distance) || 0) <= bestDistanceToBeat()) {
      clearPendingScore();
      return;
    }
    showScoreModal(pending.runId, pending.distance);
  }

  function renderAccount(data) {
    currentUser = data.user || null;
    authReady = Boolean(data.authConfigured);
    if (account) account.innerHTML = '';

    if (!data.authConfigured) {
      setStatus('Scores are local only right now.');
      return;
    }

    if (!currentUser) {
      if (account) account.innerHTML = '';
      setBestDistance(0);
      setStatus('Ride anonymous, sign in to save your distance.');
      return;
    }

    setBestDistance(currentUser.bestDistance);
    setStatus('Signed in as ' + (currentUser.username || currentUser.displayName) + '.');
    maybeResumePendingScore();
  }

  function loadAccount() {
    return fetch('/api/me')
      .then(function (response) { return response.json(); })
      .then(renderAccount)
      .catch(function () {
        setStatus('Score storage unavailable.');
      });
  }

  function startRun() {
    closeModal();
    return fetch('/api/runs', { method: 'POST' })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        currentRunId = data.runId || '';
      })
      .catch(function () {
        currentRunId = '';
      });
  }

  window.BikeFreeScores = {
    reset: function () {
      setTravelledDistance(0);
      return startRun();
    },
    updateDistance: setTravelledDistance,
    submit: function (distance) {
      distance = Number(distance) || 0;
      var best = bestDistanceToBeat();
      if (distance <= best) {
        setStatus('Great try. Beat ' + formatDistance(best) + ' to submit.');
        showTryAgainModal(distance, best);
        return;
      }
      if (!currentRunId) {
        setStatus('Score storage unavailable.');
        return;
      }
      showScoreModal(currentRunId, distance);
    }
  };

  setTabLabels();
  if (instructionsTab) instructionsTab.addEventListener('click', renderInstructions);
  if (leaderboardTab) leaderboardTab.addEventListener('click', renderLeaderboard);
  if (profileTab) profileTab.addEventListener('click', renderProfile);
  if (headerLeaderboardButton) headerLeaderboardButton.addEventListener('click', openPausedMenu);

  startRun();
  loadAccount().then(function () {
    if (getPendingScore() && currentUser) return;
    if (new URLSearchParams(window.location.search).get('tab') === 'profile') renderProfile();
    else renderInstructions();
  });
})();
