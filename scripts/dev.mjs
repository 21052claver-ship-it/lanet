import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
const children = [];
const apiPort = Number(process.env.LANET_API_PORT || 8787);
const webPort = Number(process.env.LANET_WEB_PORT || 5173);
if (![apiPort, webPort].every((port) => Number.isInteger(port) && port > 0 && port <= 65535)) {
  throw new Error('LANET_API_PORT i LANET_WEB_PORT han de ser ports vàlids.');
}
process.env.LANET_API_PORT = String(apiPort);
process.env.WRANGLER_LOG_PATH ||= 'output/development.log';
function run(args) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
    children.push(c);
    c.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`El procés ha sortit amb codi ${code}`)),
    );
  });
}
function stop(code = 0) {
  for (const c of children) c.kill();
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('unhandledRejection', (error) => {
  console.error(error.message);
  stop(1);
});
if (!existsSync('.dev.vars')) copyFileSync('.dev.vars.example', '.dev.vars');
if (!existsSync('dist/index.html')) {
  mkdirSync('dist', { recursive: true });
  writeFileSync(
    'dist/index.html',
    `<!doctype html><html lang="ca"><body>La Net: obre http://127.0.0.1:${webPort}</body></html>`,
  );
}
await run([
  'node_modules/wrangler/bin/wrangler.js',
  '--config',
  'wrangler.local.jsonc',
  'd1',
  'migrations',
  'apply',
  'DB',
  '--local',
]);
await run(['scripts/seed.mjs']);
children.push(
  spawn(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      '--config',
      'wrangler.local.jsonc',
      'dev',
      '--local',
      '--port',
      String(apiPort),
      '--var',
      `DEV_ORIGIN:http://127.0.0.1:${webPort}`,
    ],
    { stdio: 'inherit', windowsHide: true },
  ),
);
await run(['node_modules/vite/bin/vite.js', '--port', String(webPort)]);
stop();
