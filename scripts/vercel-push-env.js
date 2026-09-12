'use strict';
// Pushes server/.env.local vars to the Vercel deployment (production+preview).
// Usage: VERCEL_TOKEN=xxxx node scripts/vercel-push-env.js [--project invoix-web] [--redeploy]
//
// The token needs project access (create at https://vercel.com/account/tokens,
// then DELETE it when done). BLOB_* vars are skipped (Vercel manages those).

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.VERCEL_TOKEN || '';
if (!TOKEN) {
  console.error('Missing VERCEL_TOKEN. Run: VERCEL_TOKEN=xxxx node scripts/vercel-push-env.js');
  process.exit(1);
}
const args = process.argv.slice(2);
let PROJECT = 'invoix-web';
let REDEPLOY = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project') PROJECT = args[++i];
  if (args[i] === '--redeploy') REDEPLOY = true;
}

const API = 'https://api.vercel.com';
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, p, body) {
  const r = await fetch(API + p, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status}: ${j.error?.message || JSON.stringify(j).slice(0, 160)}`);
  return j;
}

function parseEnvFile(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!key || !val) continue;
    if (key.startsWith('BLOB_')) { console.log(`  skip ${key} (Vercel-managed)`); continue; }
    out.push({ key, val });
  }
  return out;
}

(async () => {
  const me = await api('GET', '/v2/user');
  console.log('Token OK for user:', me.user?.username || me.user?.email);

  let project;
  try {
    project = await api('GET', `/v9/projects/${encodeURIComponent(PROJECT)}`);
  } catch (e) {
    const list = await api('GET', '/v9/projects?limit=100');
    const names = (list.projects || []).map((p) => p.name).join(', ');
    throw new Error(`Project "${PROJECT}" not found. Available: ${names || '(none)'}. Re-run with --project <name>.`);
  }
  console.log('Project:', project.name, '(' + project.id + ')');

  const existing = await api('GET', `/v10/projects/${project.id}/env`);
  const byKey = new Map();
  for (const e of existing.envs || []) {
    if (!byKey.has(e.key)) byKey.set(e.key, []);
    byKey.get(e.key).push(e);
  }

  const vars = parseEnvFile(path.join(__dirname, '..', 'server', '.env.local'));
  console.log(`Pushing ${vars.length} vars to production+preview...`);
  for (const { key, val } of vars) {
    const targets = ['production', 'preview'];
    const olds = (byKey.get(key) || []).filter((e) => (e.target || []).some((t) => targets.includes(t)));
    for (const o of olds) {
      await api('DELETE', `/v10/projects/${project.id}/env/${o.id}`);
    }
    await api('POST', `/v10/projects/${project.id}/env`, {
      key, value: val, type: 'encrypted', target: targets,
    });
    console.log(`  ${key}: ${olds.length ? 'updated' : 'created'}`);
  }

  if (REDEPLOY) {
    console.log('Triggering production redeploy...');
    const deps = await api('GET', `/v6/deployments?projectId=${project.id}&target=production&limit=1`);
    const latest = (deps.deployments || [])[0];
    if (!latest) throw new Error('No production deployment found to redeploy.');
    const r = await api('POST', `/v12/deployments/${latest.uid}/redeploy?target=production`);
    console.log('Redeploy started:', r.id || r.uid || 'OK');
  } else {
    console.log('Done. NOTE: env changes need a redeploy to take effect (re-run with --redeploy).');
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
