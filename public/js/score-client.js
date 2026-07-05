(function () {
  var currentRunId = '';
  var currentUser = null;
  var account = document.getElementById('game-account');
  var status = document.getElementById('score-status');
  var bestDistance = document.getElementById('best-distance');
  var travelledDistance = document.getElementById('travelled-distance');
  var modal = document.getElementById('score-modal');
  var modalDistance = document.getElementById('score-modal-distance');
  var modalMessage = document.getElementById('score-modal-message');
  var modalActions = document.getElementById('score-modal-actions');
  var pendingKey = 'bikeFreePendingScore';

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
    if (travelledDistance) travelledDistance.textContent = formatDistance(value);
  }

  function savePendingScore(runId, distance) {
    if (!runId) return;
    sessionStorage.setItem(pendingKey, JSON.stringify({ runId: runId, distance: Number(distance) || 0 }));
  }

  function getPendingScore() {
    try {
      return JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
    } catch (error) {
      return null;
    }
  }

  function clearPendingScore() {
    sessionStorage.removeItem(pendingKey);
  }

  function closeModal() {
    if (modal) modal.hidden = true;
  }

  function saveScore(runId, distance) {
    if (!currentUser) {
      showScoreModal(runId, distance);
      return;
    }

    modalMessage.textContent = 'Saving score...';
    modalActions.innerHTML = '<button disabled>Saving</button>';
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
      modalMessage.textContent = 'Score saved.';
      modalActions.innerHTML = '<a class="button" href="/leaderboard">View High Scores</a><button id="score-modal-close">Close</button>';
      document.getElementById('score-modal-close').addEventListener('click', closeModal);
    }).catch(function (error) {
      setStatus(error.message || 'Score save failed.');
      modalMessage.textContent = error.message || 'Score save failed.';
      modalActions.innerHTML = '<button id="score-submit-button">Try Again</button><button id="score-modal-close">Close</button>';
      document.getElementById('score-submit-button').addEventListener('click', function () {
        saveScore(runId, distance);
      });
      document.getElementById('score-modal-close').addEventListener('click', closeModal);
    });
  }

  function showScoreModal(runId, distance) {
    savePendingScore(runId, distance);
    if (!modal) return;
    modalDistance.textContent = formatDistance(distance);
    modal.hidden = false;

    if (!currentUser) {
      modalMessage.textContent = 'Sign in with Google to submit this score.';
      modalActions.innerHTML = '<a class="button" href="/auth/google?returnTo=/">Sign in to submit</a><button id="score-modal-close">Close</button>';
      document.getElementById('score-modal-close').addEventListener('click', closeModal);
      setStatus('Sign in to submit ' + formatDistance(distance) + '.');
      return;
    }

    modalMessage.textContent = 'Submit this distance to the global leaderboard.';
    modalActions.innerHTML = '<button id="score-submit-button">Submit Score</button><a class="button subtle" href="/leaderboard">High Scores</a><button id="score-modal-close">Close</button>';
    document.getElementById('score-submit-button').addEventListener('click', function () {
      saveScore(runId, distance);
    });
    document.getElementById('score-modal-close').addEventListener('click', closeModal);
  }

  function maybeResumePendingScore() {
    var pending = getPendingScore();
    if (pending && pending.runId && currentUser) showScoreModal(pending.runId, pending.distance);
  }

  function renderAccount(data) {
    currentUser = data.user || null;
    if (!account) return;

    if (!data.authConfigured) {
      account.innerHTML = '<span class="muted">Score storage offline</span>';
      setStatus('Scores are local only right now.');
      return;
    }

    if (!currentUser) {
      account.innerHTML = '<a class="button" href="/auth/google?returnTo=/">[P] Sign In</a>';
      setBestDistance(0);
      setStatus('Ride anonymous, sign in to save your distance.');
      return;
    }

    account.innerHTML =
      '<form class="hud-country-form" id="hud-country-form">' +
        '<span>' + escapeHtml(currentUser.displayName) + '</span>' +
        '<input name="country" placeholder="Country" value="' + escapeHtml(currentUser.country) + '">' +
        '<button>Save</button>' +
      '</form>' +
      '<form method="post" action="/logout"><button class="button subtle">Sign out</button></form>';
    setBestDistance(currentUser.bestDistance);
    setStatus('Signed in as ' + currentUser.displayName + '.');
    maybeResumePendingScore();

    document.getElementById('hud-country-form').addEventListener('submit', function (event) {
      event.preventDefault();
      fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: event.target.country.value })
      }).then(function () {
        setStatus('Country saved.');
      }).catch(function () {
        setStatus('Country save failed.');
      });
    });
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
      if (!currentRunId) {
        setStatus('Score storage unavailable.');
        return;
      }
      showScoreModal(currentRunId, distance);
    }
  };

  loadAccount();
  startRun();
})();
