const fs = require('fs');
const path = require('path');
const axios = require('axios');
const serviceAccount = require('../serviceAccountKey.json');
const { GoogleAuth } = require('google-auth-library');

async function deployStorageRules() {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const rulesContent = `rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Allow read/write for all users during development
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
`;

  console.log('1. Creating storage ruleset...');
  const createRes = await axios.post(
    'https://firebaserules.googleapis.com/v1/projects/fi-study-4e3ea/rulesets',
    {
      source: {
        files: [
          {
            name: 'storage.rules',
            content: rulesContent
          }
        ]
      }
    },
    {
      headers: {
        Authorization: 'Bearer ' + token.token,
        'Content-Type': 'application/json'
      }
    }
  );
  console.log('Ruleset created:', createRes.data.name);

  console.log('2. Updating storage release...');
  const releaseName = 'projects/fi-study-4e3ea/releases/firebase.storage/fi-study-4e3ea.firebasestorage.app';
  const patchRes = await axios.patch(
    'https://firebaserules.googleapis.com/v1/' + releaseName,
    {
      release: {
        name: releaseName,
        rulesetName: createRes.data.name
      }
    },
    {
      headers: {
        Authorization: 'Bearer ' + token.token,
        'Content-Type': 'application/json'
      }
    }
  );
  console.log('Storage release updated successfully:', patchRes.data);
}

deployStorageRules().catch(err => {
  console.error('Error deploying storage rules:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  process.exit(1);
});
