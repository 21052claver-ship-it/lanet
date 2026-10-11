import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
export function testEnvironment() {
  const db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  const DB = {
    prepare(query) {
      return {
        bind(...args) {
          const statement = db.prepare(query);
          return {
            first: async () => statement.get(...args) || null,
            all: async () => ({ results: statement.all(...args) }),
            run: async () => {
              const r = statement.run(...args);
              return { meta: { changes: Number(r.changes) } };
            },
          };
        },
      };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return {
    db,
    env: {
      DB,
      SCHOOL_NAME: 'La Net',
      DEMO_MODE: 'false',
      GOOGLE_CLIENT_ID: '123-test.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'only-an-isolated-test',
      GOOGLE_REDIRECT_URI: 'https://lanet.example/api/auth/google/callback',
    },
  };
}
