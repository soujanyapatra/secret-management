import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prepare temporary directory for AGE keys in serverless/build environment
const env = process.env.APP_ENVIRONMENT || 'staging';
let encEnvPath = path.join(__dirname, `${env}.env.enc`);
if (!fs.existsSync(encEnvPath)) {
  encEnvPath = path.join(__dirname, '.env.enc');
}
const keyPath = path.join(__dirname, 'keys.txt');

console.log(`[SOPS-Vercel-Prebuild] Running decryption for environment: ${env}`);

// Find active key (from Vercel setting SOPS_AGE_KEY or local keys.txt)
let ageKey = process.env.SOPS_AGE_KEY;
if (!ageKey && fs.existsSync(keyPath)) {
  try {
    const keyContent = fs.readFileSync(keyPath, 'utf8');
    const privateKeyMatch = keyContent.match(/(AGE-SECRET-KEY-1\w+)/);
    if (privateKeyMatch) {
      ageKey = privateKeyMatch[1];
    }
  } catch (e) {
    console.error('[SOPS-Vercel-Prebuild] Error reading keys.txt:', e.message);
  }
}

if (!ageKey) {
  console.log('⚠️ [SOPS-Vercel-Prebuild] No SOPS_AGE_KEY found in environment or keys.txt. Skipping build-time decryption.');
  process.exit(0);
}

// Write the key to a temporary file for SOPS to read
const tempKeyPath = path.join(__dirname, 'temp_key.txt');
fs.writeFileSync(tempKeyPath, ageKey, 'utf8');

try {
  // Determine correct binary path
  const binaryPath = path.join(__dirname, 'bin', process.platform === 'win32' ? 'sops.exe' : 'sops');
  if (!fs.existsSync(binaryPath)) {
    console.warn(`⚠️ [SOPS-Vercel-Prebuild] SOPS binary not found at ${binaryPath}. Make sure it is present.`);
    process.exit(0);
  }

  // Execute decryption command
  const destEnvPath = path.join(__dirname, `${env}.env`);
  console.log(`🔓 Decrypting ${encEnvPath} using SOPS to ${destEnvPath}...`);
  
  execSync(`"${binaryPath}" --decrypt --input-type dotenv --output-type dotenv "${encEnvPath}" > "${destEnvPath}"`, {
    env: { ...process.env, SOPS_AGE_KEY_FILE: tempKeyPath }
  });

  console.log(`✅ [SOPS-Vercel-Prebuild] Successfully decrypted secrets. Generated ${env}.env`);
} catch (err) {
  console.error('❌ [SOPS-Vercel-Prebuild] Decryption failed:', err.message);
  process.exit(1);
} finally {
  // Always clean up the temp key file
  if (fs.existsSync(tempKeyPath)) {
    fs.unlinkSync(tempKeyPath);
  }
}
