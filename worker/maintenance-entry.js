import { maintainData } from './maintenance.js';

// Scheduled only: no public URL or request endpoint, no access to image bytes.
export default {
  async scheduled(_event, env) {
    await maintainData(env);
  },
};
