// Classic ES5 script: runs even when the application module cannot be parsed.
(function () {
  'use strict';
  var card = document.getElementById('startup-card');
  if (!card) return;
  var title = document.getElementById('startup-title');
  var message = document.getElementById('startup-message');
  var retry = document.getElementById('startup-retry');
  var ready = false;
  var timer;
  function fail() {
    if (ready || !document.getElementById('startup-card')) return;
    title.textContent = 'No hem pogut obrir La Net';
    message.textContent =
      'La càrrega s’ha interromput o triga massa. Torna-ho a provar; les teves dades desades es conserven.';
    retry.hidden = false;
    card.setAttribute('aria-busy', 'false');
    window.clearTimeout(timer);
  }
  function resourceError(event) {
    var tag = event.target && event.target.tagName;
    if (tag === 'SCRIPT' || tag === 'LINK') fail();
  }
  function mounted() {
    ready = true;
    window.clearTimeout(timer);
    window.removeEventListener('error', resourceError, true);
    window.removeEventListener('offline', fail);
  }
  retry.onclick = function () {
    // A new query avoids reusing a stale document. Preserve route and OAuth result.
    try {
      var destination = new URL(window.location.href);
      destination.searchParams.set('_ln_reload', String(Date.now()));
      window.history.replaceState(null, '', destination.href);
      window.location.reload();
      return false;
    } catch (ignore) {
      return true;
    }
  };
  window.LaNetStartup = { ready: mounted, fail: fail };
  window.addEventListener('error', resourceError, true);
  window.addEventListener('offline', fail);
  timer = window.setTimeout(fail, 20000);
  if (window.navigator.onLine === false) fail();
})();
