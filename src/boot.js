// Keep this entry tiny. CSS and the React graph load after the initial HTML is visible.
import('./main.jsx').catch(() => {
  if (window.LaNetStartup) window.LaNetStartup.fail();
});
