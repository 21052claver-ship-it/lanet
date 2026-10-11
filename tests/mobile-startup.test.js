import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import app from '../worker/index.js';
import { clientId } from '../shared/client-id.js';

test('Google callback accepts only own result keys without Object.hasOwn', () => {
  const source = readFileSync('shared/google-auth.js', 'utf8').replaceAll('export ', '');
  const context = vm.createContext({ URL });
  vm.runInContext('Object.hasOwn = undefined;', context);
  vm.runInContext(source, context);
  for (const key of ['', 'constructor', '__proto__', 'toString', 'unknown'])
    assert.equal(
      vm.runInContext(`googleResult('https://example.test/?auth_result=${key}')`, context),
      null,
    );
  assert.equal(
    vm.runInContext("googleResult('https://example.test/?auth_result=school_only').type", context),
    'error',
  );
});

test('Legacy cryptographic UUID fallback preserves version, variant and uniqueness', () => {
  assert.equal(clientId({ randomUUID: () => 'native' }), 'native');
  const random = { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) };
  const ids = new Set(Array.from({ length: 500 }, () => clientId(random)));
  assert.equal(ids.size, 500);
  for (const id of ids)
    assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test('Google start works with an older AbortSignal without throwIfAborted', async () => {
  class LegacyController extends AbortController {
    constructor() {
      super();
      Object.defineProperty(this.signal, 'throwIfAborted', { value: undefined });
    }
  }
  const context = vm.createContext({
    AbortController: LegacyController,
    URL,
    DOMException,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(readFileSync('src/auth-session.js', 'utf8').replace('export ', ''), context);
  const create = vm.runInContext('createGoogleSession', context);
  let destination;
  const session = create({
    request: async () => ({ url: 'https://accounts.google.com/o/oauth2/v2/auth?state=local' }),
    navigate: (value) => {
      destination = value;
    },
    onChange() {},
  });
  assert.equal(await session.start(), true);
  assert.match(destination, /^https:\/\/accounts.google.com\/o\/oauth2\/v2\/auth/);
  session.dispose();
});

test('HTML stays fresh and missing startup chunks cannot receive SPA HTML', async () => {
  const env = {
    ASSETS: {
      fetch: () => new Response('<html>shell</html>', { headers: { 'Content-Type': 'text/html' } }),
    },
  };
  for (const path of ['/', '/index.html']) {
    const result = await app.fetch(new Request('https://example.test' + path), env, {});
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.match(result.headers.get('Content-Security-Policy'), /script-src 'self'/);
  }
  for (const path of ['/assets/obsolete.js', '/assets/obsolete.css', '/startup.js']) {
    const result = await app.fetch(new Request('https://example.test' + path), env, {});
    assert.equal(result.status, 404);
    assert.match(result.headers.get('Content-Type'), /text\/plain/);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.ok(!(await result.text()).includes('<html>'));
  }
  env.ASSETS.fetch = () =>
    new Response('export const a=1;', {
      headers: {
        'Content-Type': 'text/javascript',
        'Cache-Control': 'public,max-age=31536000,immutable',
      },
    });
  const result = await app.fetch(new Request('https://example.test/assets/current.js'), env, {});
  assert.equal(await result.text(), 'export const a=1;');
  assert.match(result.headers.get('Cache-Control'), /immutable/);
});

function monitor() {
  const nodes = Object.fromEntries(
    ['startup-card', 'startup-title', 'startup-message', 'startup-retry'].map((id) => [
      id,
      {
        hidden: true,
        setAttribute(key, value) {
          this[key] = value;
        },
      },
    ]),
  );
  const events = new Map();
  let timeout,
    destination,
    cleared = false;
  const window = {
    navigator: { onLine: true },
    location: {
      href: 'https://example.test/?auth_result=cancelled#grades',
      reload() {},
    },
    history: {
      replaceState(_state, _title, value) {
        destination = value;
      },
    },
    setTimeout(fn, delay) {
      assert.equal(delay, 20000);
      timeout = fn;
      return 1;
    },
    clearTimeout() {
      cleared = true;
    },
    addEventListener(name, fn) {
      events.set(name, fn);
    },
    removeEventListener(name) {
      events.delete(name);
    },
  };
  vm.runInNewContext(readFileSync('public/startup.js', 'utf8'), {
    window,
    document: { getElementById: (id) => nodes[id] },
    URL,
  });
  return {
    nodes,
    window,
    events,
    expire: () => timeout(),
    destination: () => destination,
    cleared: () => cleared,
  };
}

test('Startup watchdog ends waiting and retry preserves OAuth result and page', () => {
  const m = monitor();
  m.expire();
  assert.equal(m.nodes['startup-retry'].hidden, false);
  assert.equal(m.nodes['startup-card']['aria-busy'], 'false');
  assert.equal(m.cleared(), true);
  assert.equal(m.nodes['startup-retry'].onclick(), false);
  const url = new URL(m.destination());
  assert.equal(url.hash, '#grades');
  assert.equal(url.searchParams.get('auth_result'), 'cancelled');
  assert.match(url.searchParams.get('_ln_reload'), /^\d+$/);
});

test('Startup reacts to script/CSS and offline errors but stops after React mounts', () => {
  for (const tagName of ['SCRIPT', 'LINK']) {
    const m = monitor();
    m.events.get('error')({ target: { tagName } });
    assert.equal(m.nodes['startup-retry'].hidden, false);
  }
  const offline = monitor();
  offline.events.get('offline')();
  assert.equal(offline.nodes['startup-retry'].hidden, false);
  const ready = monitor();
  ready.window.LaNetStartup.ready();
  ready.expire();
  assert.equal(ready.nodes['startup-retry'].hidden, true);
  assert.equal(ready.events.size, 0);
});
