(function () {
  var account = document.getElementById('account');
  var scores = document.getElementById('scores');

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function renderAccount(data) {
    if (!data.user) {
      account.innerHTML = data.authConfigured
        ? '<a class="button" href="/auth/google">Sign in</a>'
        : '<span class="muted">Auth not configured</span>';
      return;
    }

    account.innerHTML =
      '<form class="country-form" id="country-form">' +
        '<span>' + escapeHtml(data.user.displayName) + '</span>' +
        '<input name="country" placeholder="Country" value="' + escapeHtml(data.user.country) + '">' +
        '<button>Save</button>' +
      '</form>' +
      '<form method="post" action="/logout"><button class="button subtle">Sign out</button></form>';

    document.getElementById('country-form').addEventListener('submit', function (event) {
      event.preventDefault();
      fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: event.target.country.value })
      }).then(loadScores);
    });
  }

  function renderScores(data) {
    if (!data.scores.length) {
      scores.innerHTML = '<tr><td colspan="4">No scores yet.</td></tr>';
      return;
    }

    scores.innerHTML = data.scores.map(function (score) {
      return '<tr>' +
        '<td>' + score.rank + '</td>' +
        '<td>' + escapeHtml(score.name) + '</td>' +
        '<td>' + escapeHtml(score.country || '-') + '</td>' +
        '<td>' + Number(score.distance).toFixed(1) + 'm</td>' +
      '</tr>';
    }).join('');
  }

  function loadScores() {
    fetch('/api/leaderboard').then(function (response) {
      return response.json();
    }).then(renderScores);
  }

  fetch('/api/me').then(function (response) {
    return response.json();
  }).then(renderAccount);
  loadScores();
})();
