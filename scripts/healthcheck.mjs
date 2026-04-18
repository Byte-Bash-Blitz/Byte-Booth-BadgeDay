import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  setLogLevel,
} from 'firebase/firestore';

const HEALTHCHECK_TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 10000);

const withTimeout = (promise, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${HEALTHCHECK_TIMEOUT_MS}ms`));
    }, HEALTHCHECK_TIMEOUT_MS);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const raw = readFileSync(envPath, 'utf8');

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function checkR2() {
  const accountId = requireEnv('VITE_CLOUDFLARE_ACCOUNT_ID');
  const bucket = requireEnv('VITE_R2_BUCKET_NAME');
  const accessKeyId = requireEnv('VITE_R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('VITE_R2_SECRET_ACCESS_KEY');

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    endpoint,
    region: 'auto',
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 1,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5000,
      requestTimeout: 10000,
    }),
  });

  const key = `connectivity-test/${Date.now()}-r2.txt`;
  const body = `r2-health-${new Date().toISOString()}`;

  await withTimeout(client.send(new HeadBucketCommand({ Bucket: bucket })), 'R2 headBucket');
  await withTimeout(client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
    }),
  ), 'R2 putObject');

  const getRes = await withTimeout(
    client.send(new GetObjectCommand({ Bucket: bucket, Key: key })),
    'R2 getObject'
  );
  const text = await withTimeout(getRes.Body.transformToString(), 'R2 streamRead');
  const matches = text === body;

  await withTimeout(client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })), 'R2 deleteObject');

  if (!matches) throw new Error('R2 upload/download content mismatch');
  return 'R2 OK (head + upload + download + delete)';
}

async function checkFirestore() {
  const apiKey = requireEnv('VITE_FIREBASE_API_KEY');
  const projectId = requireEnv('VITE_FIREBASE_PROJECT_ID');

  // Preflight to detect disabled Firestore API quickly and avoid long SDK retries.
  const preflightUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const preflightResponse = await withTimeout(fetch(preflightUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { limit: 1 } }),
  }), 'Firestore API preflight');

  if (!preflightResponse.ok) {
    const text = await preflightResponse.text();
    if (text.includes('Cloud Firestore API has not been used') || text.includes('SERVICE_DISABLED')) {
      throw new Error('Cloud Firestore API is disabled for project byte-booth');
    }
    if (text.includes('does not exist for project') || text.includes('datastore/setup')) {
      throw new Error('Firestore database is not created for project byte-booth');
    }
    throw new Error(`Firestore API preflight failed: HTTP ${preflightResponse.status}`);
  }

  const app = initializeApp({
    apiKey,
    authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  });

  // Keep healthcheck output concise while still surfacing final errors.
  setLogLevel('error');

  const db = getFirestore(app);
  const col = collection(db, '_connectivity_test');

  const docRef = await withTimeout(addDoc(col, {
    source: 'bytebooth-healthcheck',
    createdAt: serverTimestamp(),
    note: `firestore-health-${Date.now()}`,
  }), 'Firestore addDoc');

  const snap = await withTimeout(getDoc(docRef), 'Firestore getDoc');
  if (!snap.exists()) {
    throw new Error('Firestore document write succeeded but read failed');
  }

  await withTimeout(deleteDoc(docRef), 'Firestore deleteDoc');
  return 'Firestore OK (write + read + delete)';
}

async function main() {
  loadDotEnv();

  const args = new Set(process.argv.slice(2));
  const runR2 = !args.has('--firestore-only');
  const runFirestore = !args.has('--r2-only');

  const results = [];
  let hasError = false;

  if (runR2) {
    console.log('Running R2 check...');
    try {
      const r2 = await checkR2();
      results.push(`PASS: ${r2}`);
    } catch (err) {
      hasError = true;
      results.push(`FAIL: R2: ${err.message}`);
    }
  }

  if (runFirestore) {
    console.log('Running Firestore check...');
    try {
      const fs = await checkFirestore();
      results.push(`PASS: ${fs}`);
    } catch (err) {
      hasError = true;
      results.push(`FAIL: Firestore: ${err.message}`);
    }
  }

  console.log('ByteBooth Backend Healthcheck');
  for (const line of results) console.log(line);

  if (hasError) process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected healthcheck failure:', err.message);
  process.exit(1);
});
