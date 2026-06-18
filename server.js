import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = !!(process.env.VERCEL || process.env.NOW_BUILD_TRIGGER);
const RUNTIME_DIR = isVercel ? '/tmp' : __dirname;

// Prepare binaries in /tmp for Serverless environments (like Vercel)
function prepareBinaries() {
  if (!isVercel) return;
  const binDir = path.join(__dirname, 'bin');
  const tmpBinDir = path.join('/tmp', 'bin');
  
  if (!fs.existsSync(tmpBinDir)) {
    fs.mkdirSync(tmpBinDir, { recursive: true });
  }
  
  const binaries = ['age', 'age-keygen', 'sops'];
  binaries.forEach(bin => {
    const srcPath = path.join(binDir, bin);
    const destPath = path.join(tmpBinDir, bin);
    
    if (fs.existsSync(srcPath)) {
      try {
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
        fs.chmodSync(destPath, '755');
      } catch (err) {
        console.error(`[SOPS] Failed to prepare binary ${bin}:`, err.message);
      }
    }
  });
}

function getBinaryPath(name) {
  if (isVercel) {
    return path.join('/tmp', 'bin', name);
  }
  return `./bin/${name}`;
}

// Prepare binaries if running in serverless Vercel environment
prepareBinaries();

const app = express();
app.use(cors());
app.use(express.json());

// Load SOPS secrets into environment variables
function loadSopsSecrets() {
  const env = process.env.APP_ENVIRONMENT || 'staging';
  let encEnvPath = path.join(RUNTIME_DIR, `${env}.env.enc`);
  const keyPath = path.join(RUNTIME_DIR, 'keys.txt');
  
  if (!fs.existsSync(encEnvPath)) {
    encEnvPath = path.join(RUNTIME_DIR, '.env.enc');
  }
  
  if (fs.existsSync(encEnvPath)) {
    console.log(`[SOPS] Found encrypted secrets file at: ${encEnvPath}`);
    let ageKey = process.env.SOPS_AGE_KEY;
    
    if (!ageKey && fs.existsSync(keyPath)) {
      try {
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        const privateKeyMatch = keyContent.match(/(AGE-SECRET-KEY-1\w+)/);
        if (privateKeyMatch) {
          ageKey = privateKeyMatch[1];
          console.log('[SOPS] Loaded AGE private key from keys.txt');
        }
      } catch (e) {
        console.error('[SOPS] Error reading keys.txt:', e.message);
      }
    }
    
    if (ageKey) {
      try {
        console.log('[SOPS] Decrypting secrets in-memory...');
        const sopsBin = getBinaryPath('sops');
        const decrypted = execSync(`"${sopsBin}" --decrypt --input-type dotenv --output-type dotenv "${encEnvPath}"`, {
          env: { ...process.env, SOPS_AGE_KEY: ageKey }
        }).toString();
        
        // Parse decrypted dotenv string and inject into process.env
        const lines = decrypted.split('\n');
        let count = 0;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const index = trimmed.indexOf('=');
            if (index !== -1) {
              const key = trimmed.substring(0, index).trim();
              const val = trimmed.substring(index + 1).trim();
              process.env[key] = val;
              count++;
            }
          }
        }
        process.env.SOPS_DECRYPT_STATUS = 'SUCCESS';
        process.env.SOPS_DECRYPT_METHOD = 'In-Memory (sops --decrypt)';
        console.log(`[SOPS] Successfully decrypted and loaded ${count} environment variables in-memory!`);
      } catch (err) {
        console.error('[SOPS] In-memory decryption failed:', err.message);
        process.env.SOPS_DECRYPT_STATUS = 'FAILED';
        process.env.SOPS_DECRYPT_ERROR = err.message;
      }
    } else {
      console.log('[SOPS] No AGE private key found. Skipping in-memory decryption.');
      process.env.SOPS_DECRYPT_STATUS = 'MISSING_KEY';
      process.env.SOPS_DECRYPT_METHOD = 'None';
    }
  } else {
    console.log(`[SOPS] No encrypted secrets file found at ${encEnvPath}. Skipping in-memory decryption.`);
    process.env.SOPS_DECRYPT_STATUS = 'NO_ENC_FILE';
    process.env.SOPS_DECRYPT_METHOD = 'None';
  }
}

// Bootstrap demo secrets if they don't exist
function bootstrapDemo() {
  const env = process.env.APP_ENVIRONMENT || 'staging';
  const encEnvPath = path.join(RUNTIME_DIR, `${env}.env.enc`);
  const keyPath = path.join(RUNTIME_DIR, 'keys.txt');
  
  const fallbackEncEnvPath = path.join(RUNTIME_DIR, '.env.enc');
  
  if (!fs.existsSync(encEnvPath) && !fs.existsSync(fallbackEncEnvPath) && !fs.existsSync(keyPath)) {
    console.log(`[SOPS] Bootstrapping ${env} secrets...`);
    try {
      // 1. Generate key pair
      const keygenBin = getBinaryPath('age-keygen');
      const output = execSync(`"${keygenBin}"`).toString();
      const publicKey = output.match(/# public key: (age1\w+)/)[1];
      
      // 2. Save private key
      fs.writeFileSync(keyPath, output, 'utf8');
      console.log('[SOPS] Saved generated private key to keys.txt');
      
      // 3. Define sample secrets (Read from env-specific files or .env.template)
      let sampleSecrets = '';
      const envTemplatePath = path.join(__dirname, `${env}.env`);
      const templatePath = path.join(__dirname, '.env.template');
      
      if (fs.existsSync(envTemplatePath)) {
        sampleSecrets = fs.readFileSync(envTemplatePath, 'utf8');
      } else if (fs.existsSync(templatePath)) {
        sampleSecrets = fs.readFileSync(templatePath, 'utf8');
      } else {
        throw new Error('No configuration template file (.env.template or staging.env) found to bootstrap from');
      }
      
      // 4. Save to temp and encrypt
      const tempFile = path.join(RUNTIME_DIR, `temp_bootstrap_${env}.env`);
      fs.writeFileSync(tempFile, sampleSecrets, 'utf8');
      
      const sopsBin = getBinaryPath('sops');
      execSync(`"${sopsBin}" --encrypt --age "${publicKey}" --input-type dotenv --output-type dotenv "${tempFile}" > "${encEnvPath}"`);
      console.log(`[SOPS] Encrypted secrets and saved to ${env}.env.enc`);
      
      fs.unlinkSync(tempFile);
    } catch (err) {
      console.error('[SOPS] Bootstrapping failed:', err.message);
    }
  }
}

// Initialize SOPS environment
bootstrapDemo();
loadSopsSecrets();

// API ROUTES


// Get safe, public configuration for the frontend
app.get('/api/config', (req, res) => {
  res.json({
    VITE_GOOGLE_AUTH_CLIENT_ID: process.env.VITE_GOOGLE_AUTH_CLIENT_ID || 'mock-client-id-not-loaded',
    VITE_FEATURE_BETA_ACCESS: process.env.VITE_FEATURE_BETA_ACCESS === 'true' || process.env.VITE_FEATURE_BETA_ACCESS === true
  });
});

// Get environment status and loaded secrets (masked)
app.get('/api/env', (req, res) => {
  const keysToShow = [
    'DATABASE_URL',
    'API_SECRET_KEY',
    'APP_ENVIRONMENT',
    'VITE_GOOGLE_AUTH_CLIENT_ID',
    'GOOGLE_AUTH_CLIENT_SECRET',
    'VITE_FEATURE_BETA_ACCESS',
    'SOPS_DECRYPT_STATUS',
    'SOPS_DECRYPT_METHOD',
    'SOPS_DECRYPT_ERROR'
  ];
  
  const envData = {};
  keysToShow.forEach(key => {
    const value = process.env[key];
    if (value !== undefined) {
      // Mask sensitive values securely to prevent leakage of credentials or keys
      if (key === 'DATABASE_URL') {
        try {
          const url = new URL(value);
          // Mask user and password, keep protocol and DB name
          envData[key] = `${url.protocol}//********:********@********${url.pathname}`;
        } catch (e) {
          envData[key] = 'postgresql://********:********@********:********/********';
        }
      } else if (key === 'API_SECRET_KEY') {
        const prefixMatch = value.match(/^(sk_[a-zA-Z0-9]+_)/);
        if (prefixMatch) {
          envData[key] = prefixMatch[1] + '************************';
        } else {
          envData[key] = '************************';
        }
      } else if (key === 'GOOGLE_AUTH_CLIENT_SECRET') {
        envData[key] = 'gsec_********_dont_expose_********';
      } else {
        envData[key] = value;
      }
    } else {
      envData[key] = null;
    }
  });
  
  // Read file statuses and only safe content (no private keys) to show in the UI
  let keysTxtStatus = 'Missing';
  let keysTxtPublicKey = 'None';
  let envEncContent = 'Encrypted secrets file not found';
  let plaintextEnvStatus = 'Missing';
  
  const env = process.env.APP_ENVIRONMENT || 'staging';
  const keyPath = path.join(RUNTIME_DIR, 'keys.txt');
  let encEnvPath = path.join(RUNTIME_DIR, `${env}.env.enc`);
  if (!fs.existsSync(encEnvPath)) {
    encEnvPath = path.join(RUNTIME_DIR, '.env.enc');
  }
  const plaintextEnvPath = path.join(__dirname, `${env}.env`);
  
  if (fs.existsSync(plaintextEnvPath) || fs.existsSync(path.join(__dirname, '.env'))) {
    plaintextEnvStatus = 'Detected';
  }
  
  if (fs.existsSync(keyPath)) {
    keysTxtStatus = 'Detected';
    try {
      const content = fs.readFileSync(keyPath, 'utf8');
      const match = content.match(/# public key: (age1\w+)/);
      if (match) {
        keysTxtPublicKey = match[1];
      }
    } catch (e) {
      console.error('[SOPS] Failed to read public key from keys.txt:', e.message);
    }
  }
  
  if (fs.existsSync(encEnvPath)) {
    envEncContent = fs.readFileSync(encEnvPath, 'utf8');
  }
  
  res.json({
    env: envData,
    files: {
      keysTxtStatus,
      keysTxtPublicKey,
      plaintextEnvStatus,
      envEnc: envEncContent
    }
  });
});

// Reload environment secrets from local filesystem (No keys are sent over the network!)
app.post('/api/reload-env', (req, res) => {
  try {
    // Clear old loaded secrets first
    delete process.env.DATABASE_URL;
    delete process.env.API_SECRET_KEY;
    delete process.env.APP_ENVIRONMENT;
    delete process.env.VITE_GOOGLE_AUTH_CLIENT_ID;
    delete process.env.GOOGLE_AUTH_CLIENT_SECRET;
    delete process.env.VITE_FEATURE_BETA_ACCESS;
    delete process.env.SOPS_AGE_KEY;
    
    // Reload secrets securely on server-side only
    loadSopsSecrets();
    
    res.json({ success: true, status: process.env.SOPS_DECRYPT_STATUS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bundle simulation output
app.get('/api/bundle-simulation', (req, res) => {
  // Extract currently active env values (or default demo values if not loaded)
  const dbUrl = process.env.DATABASE_URL || 'postgresql://sops_user:sops_super_secret_password_2026@ep-cool-pool-12345.neon.tech/sops_db';
  const apiKey = process.env.API_SECRET_KEY || 'sk_test_51N2xSOPSandAGEsecretKeyForVerification';
  
  res.json({
    clientPlaintextBundle: `// dist/assets/index-B6SoJgyG.js (Vite Production JS Bundle)
// ⚠️ VULNERABLE: Environment variables compiled directly into the client code!

console.log("Initializing Single Page Application...");
const config = {
  DATABASE_URL: "${dbUrl}",
  API_SECRET_KEY: "${apiKey}",
  APP_ENVIRONMENT: "production"
};

// Any visitor of your website can open DevTools -> Sources / Network,
// inspect this JS bundle, and steal your keys!
db.connect(config.DATABASE_URL);
stripe.init(config.API_SECRET_KEY);`,

    clientSopsBundle: `// dist/assets/index-B6SoJgyG.js (Vite Production JS Bundle)
// ✅ SECURE: No raw secrets compiled or exposed to the client bundle!

console.log("Initializing Single Page Application...");
const config = {
  // Client bundle has NO hardcoded secrets!
  // Instead, the frontend fetches public settings from a backend API,
  // while critical variables (DB/API keys) remain hidden on the server.
  DATABASE_URL: "/api/env (masked)",
  API_SECRET_KEY: "/api/env (masked)",
  APP_ENVIRONMENT: "production"
};

// 🔒 Secrets remain fully encrypted in .env.enc inside the git repo
// and decrypted in-memory only on your secure Node.js/Vercel server!
console.log("App ready. Fetching data from secure endpoints...");`
  });
});

// Serve frontend from dist in production
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[Server] Monolith backend running on http://localhost:${PORT}`);
  });
}

export default app;
