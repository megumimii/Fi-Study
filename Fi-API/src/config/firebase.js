const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let db;
let auth;
let bucket;

const normalizeServiceAccount = (serviceAccount) => {
  if (!serviceAccount || !serviceAccount.private_key) {
    return serviceAccount;
  }

  return {
    ...serviceAccount,
    private_key: serviceAccount.private_key.replace(/\\n/g, '\n')
  };
};

const loadServiceAccountFromEnv = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      console.log('Loading Firebase Admin SDK credentials from FIREBASE_SERVICE_ACCOUNT JSON environment variable.');
      return normalizeServiceAccount(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } catch (e) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT environment variable is not valid JSON: ${e.message}`);
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('Loading Firebase Admin SDK credentials from individual environment variables.');
    return normalizeServiceAccount({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY
    });
  }

  return null;
};

const loadServiceAccountFromFile = () => {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    path.resolve(__dirname, '../../serviceAccountKey.json'), // Fi-API/serviceAccountKey.json
    path.resolve(__dirname, '../serviceAccountKey.json'),    // Fi-API/src/serviceAccountKey.json
    path.resolve(process.cwd(), 'serviceAccountKey.json'),   // cwd/serviceAccountKey.json
    path.resolve(__dirname, '../../../serviceAccountKey.json'), // Project root/serviceAccountKey.json
    path.resolve(__dirname, '../../service-account.json')
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolvedPath = path.resolve(candidate);
    if (fs.existsSync(resolvedPath)) {
      try {
        console.log(`Loading Firebase Admin SDK credentials from file: ${resolvedPath}`);
        return require(resolvedPath);
      } catch (e) {
        console.warn(`Failed reading service account file at ${resolvedPath}:`, e.message);
      }
    }
  }

  return null;
};

try {
  const serviceAccount = loadServiceAccountFromEnv() || loadServiceAccountFromFile();
  const projectId = process.env.FIREBASE_PROJECT_ID || 'fi-study-4e3ea';
  const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://fi-study-4e3ea-default-rtdb.asia-southeast1.firebasedatabase.app/';
  let rawBucket = process.env.FIREBASE_STORAGE_BUCKET || 'fi-study-4e3ea.firebasestorage.app';
  if (rawBucket.startsWith('gs://')) {
    rawBucket = rawBucket.replace('gs://', '');
  }

  if (admin.apps.length > 0) {
    console.log('Firebase Admin SDK already initialized; reusing existing app.');
  } else if (serviceAccount) {
    console.log(`Firebase Admin SDK initialized with Service Account (${serviceAccount.client_email || 'credentials'}).`);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
      databaseURL,
      storageBucket: rawBucket
    });
  } else {
    console.warn('\n===============================================================');
    console.warn('[Firebase Admin SDK Notice]');
    console.warn('No serviceAccountKey.json file found.');
    console.warn('Running with Project ID:', projectId);
    console.warn('Firebase ID Token Verification: ENABLED');
    console.warn('To enable full database Admin read/write bypass:');
    console.warn('1. Visit Firebase Console -> Project Settings -> Service Accounts');
    console.warn('2. Click "Generate new private key"');
    console.warn('3. Save file as Fi-API/serviceAccountKey.json');
    console.warn('===============================================================\n');
    admin.initializeApp({
      projectId,
      databaseURL,
      storageBucket: rawBucket
    });
  }

  db = admin.database();
  auth = admin.auth();
  bucket = admin.storage().bucket();

  console.log(`Firebase Admin SDK successfully connected:`);
  console.log(`- Project ID: ${projectId}`);
  console.log(`- Database URL: ${databaseURL}`);
  console.log(`- Storage Bucket: ${rawBucket}`);
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  throw error;
}

module.exports = {
  admin,
  db,
  auth,
  bucket
};
