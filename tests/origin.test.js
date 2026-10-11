import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin } from '../worker/origin.js';

test('local development accepts only the explicitly configured loopback origin', () => {
  const env = { DEMO_MODE: 'true', DEV_ORIGIN: 'http://127.0.0.1:5183' };
  const api = 'http://127.0.0.1:8793/api/auth/login';
  assert.equal(allowedOrigin(env.DEV_ORIGIN, api, env), true);
  assert.equal(allowedOrigin('http://127.0.0.1:5184', api, env), false);
  assert.equal(allowedOrigin('https://other.example', api, env), false);
  assert.equal(allowedOrigin('http://127.0.0.1.evil.example:5183', api, env), false);
});

test('production accepts same-origin requests and rejects development exceptions', () => {
  const env = { DEMO_MODE: 'false', DEV_ORIGIN: 'http://127.0.0.1:5183' };
  const api = 'https://lanet.example/api/auth/login';
  assert.equal(allowedOrigin('https://lanet.example', api, env), true);
  assert.equal(allowedOrigin(null, api, env), true);
  assert.equal(allowedOrigin(env.DEV_ORIGIN, api, env), false);
  assert.equal(allowedOrigin('http://localhost:5173', api, env), false);
});

test('a configured development origin cannot authorize an external site', () => {
  assert.equal(
    allowedOrigin('https://other.example', 'http://127.0.0.1:8793/api', {
      DEMO_MODE: 'true',
      DEV_ORIGIN: 'https://other.example',
    }),
    false,
  );
});
