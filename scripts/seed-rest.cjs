const https = require('https');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tartil-shafai-4e59a';
const TOKEN = process.env.GOOGLE_OAUTH_TOKEN || '';
const UID = process.env.ADMIN_UID || 'UCfHEVR8BKZFhkE2WvPvsJqX2172';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', (chunk) => { resData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(resData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${resData}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function seed() {
  try {
    console.log("Setting admin UID...");
    await request('PATCH', `admins/${UID}`, {
      fields: {
        active: { booleanValue: true }
      }
    });
    console.log("Admin set.");

    console.log("Setting volumes/j1...");
    await request('PATCH', `volumes/j1`, {
      fields: {
        number: { integerValue: 1 },
        name: { stringValue: "Jilid 1" },
        description: { stringValue: "Kumpulan paket maqra' Jilid 1" },
        isPublished: { booleanValue: true },
        order: { integerValue: 1 }
      }
    });
    console.log("j1 set.");

    console.log("Setting volumes/j2...");
    await request('PATCH', `volumes/j2`, {
      fields: {
        number: { integerValue: 2 },
        name: { stringValue: "Jilid 2" },
        description: { stringValue: "Kumpulan paket maqra' Jilid 2" },
        isPublished: { booleanValue: true },
        order: { integerValue: 2 }
      }
    });
    console.log("j2 set.");
    console.log("Seed successful.");
  } catch (err) {
    console.error("Seed failed:", err.message);
  }
}

seed();
