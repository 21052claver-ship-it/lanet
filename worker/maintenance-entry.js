import { queueUnusedFiles, drainFileDeletions } from './file-lifecycle.js';

// Scheduled only: no public URL or request endpoint, no access to image bytes.
export default {
  async scheduled(_event, env) {
    await queueUnusedFiles(env);
    await drainFileDeletions(env);
  },
};
