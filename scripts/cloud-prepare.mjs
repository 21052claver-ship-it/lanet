import { config, writeConfig, cli, jsonOutput } from './cloud-utils.mjs';
const cfg = config();
if (cfg.pages_build_output_dir) {
  console.log('La Net Pages reutilitza D1 i R2 existents. Publica amb npm run pages:deploy.');
  process.exit(0);
}
if (cfg.vars?.DEMO_MODE !== 'false')
  throw new Error('La configuració de producció ha de tenir DEMO_MODE=false.');
console.log('Preparant els recursos de La Net al compte Cloudflare autenticat.');
const binding = cfg.d1_databases.find((d) => d.binding === 'DB');
if (!binding) throw new Error('Falta la connexió DB.');
let databases = jsonOutput(cli(['d1', 'list', '--json'], { capture: true }));
let db = databases.find((d) => d.name === binding.database_name);
if (!db) {
  cli(['d1', 'create', binding.database_name, '--jurisdiction', 'eu']);
  databases = jsonOutput(cli(['d1', 'list', '--json'], { capture: true }));
  db = databases.find((d) => d.name === binding.database_name);
}
if (!db) throw new Error('No s’ha pogut identificar la base de dades creada.');
binding.database_id = db.uuid || db.id;
const bucket = cfg.r2_buckets.find((b) => b.binding === 'FILES');
if (!bucket) throw new Error('Falta la connexió FILES.');
let exists = false;
try {
  cli(['r2', 'bucket', 'info', bucket.bucket_name, '--jurisdiction', bucket.jurisdiction || 'eu'], {
    capture: true,
  });
  exists = true;
} catch (error) {
  if (!/not found|does not exist|404|10006|10004/i.test(error.message)) throw error;
}
if (!exists) cli(['r2', 'bucket', 'create', bucket.bucket_name, '--jurisdiction', 'eu']);
bucket.jurisdiction = bucket.jurisdiction || 'eu';
writeConfig(cfg);
cli(['d1', 'migrations', 'apply', 'DB', '--remote']);
console.log('D1, R2 i les migracions estan preparats. La web encara no s’ha publicat.');
