# 🔐 Secure Secret Management with SOPS + AGE (Vue.js + Node.js Application on Vercel)

Modern web development demands secure handling of configuration variables and application secrets. Yet, developers frequently commit plaintext `.env` files to version control, share raw credentials over communication channels, or build secrets directly into client-side bundles.

In this guide, we'll implement a production-grade, Git-safe secret management workflow using **Mozilla SOPS** and **AGE** inside a Vue 3 & Node.js application deployed to **Vercel**.

---

## 🛑 Part 1: The Problem with Plaintext `.env` Files

Storing application secrets in raw `.env` files has major disadvantages:
1. **Accidental Git Commits:** A single missing line in `.gitignore` can commit your database passwords or third-party keys to a public repository forever.
2. **Untracked Secret History:** Plaintext env files are excluded from Git, meaning you have no version history or audit trail of who changed a secret or when.
3. **Insecure Sharing:** Teams end up sharing secrets via Slack, Email, or Notion, exposing them to leaks.
4. **Vite Bundle Exposure:** Statically building environment variables (e.g. prefixing them with `VITE_`) compiles them directly into static JS assets, exposing them to anyone inspecting the source code in their browser.

---

## 🛡️ Part 2: Introduction to SOPS and AGE

To solve this, we use a GitOps-friendly approach:
* **AGE (Actually Good Encryption):** A modern, simple file encryption tool with small, clean key pairs. It acts as the replacement for PGP.
* **Mozilla SOPS (Secrets OPerationS):** An encryption tool that encrypts **only the values** inside files (JSON, YAML, ENV, etc.) while leaving the **keys in plaintext**. This allows Git diffs to remain completely readable.

---

## 🏗️ Part 3: The Monolith Demo Architecture

Our demonstration project consists of:
* **Frontend:** Vue 3 (Vite)
* **Backend:** Node.js (Express)
* **Encryption Tooling:** SOPS + AGE
* **Deployment Platform:** Vercel

```mermaid
graph TD
    subgraph Local Git Workspace
        env[staging.env - Plaintext] -->|sops --encrypt| env_enc[staging.env.enc - Encrypted]
        keys[keys.txt] -.->|gitignored| git_ignore[.gitignore]
        env -.->|gitignored| git_ignore
    end

    subgraph Vercel Deployment
        env_enc -->|Committed| git_repo[Git Repository]
        git_repo -->|Trigger Build| vercel_build[Vercel Build Environment]
        vercel_age[SOPS_AGE_KEY Environment Var] -->|Read Key| vercel_build
        vercel_build -->|node decrypt.js| decrypted_env[staging.env]
        decrypted_env -->|vite build| production_assets[Static Production Assets]
    end
```

---

## 💻 Part 4: Local Development Workflow

### Step 1: Generate your AGE Key Pair
Run this command locally to generate a private and public key pair:
```bash
./bin/age-keygen -o keys.txt
```
This generates `keys.txt` in your root folder (which is safely ignored by Git).

### Step 2: Define Plaintext Secrets
Create a file named `staging.env` in the root:
```dotenv
DATABASE_URL=postgresql://sops_user:sops_super_secret_password_2026@localhost:5432/sops_db
API_SECRET_KEY=sk_test_51N2xSOPSandAGEsecretKeyForVerification
VITE_GOOGLE_AUTH_CLIENT_ID=54321-google-oauth-client-id.apps.googleusercontent.com
VITE_FEATURE_BETA_ACCESS=true
```

### Step 3: Run the App Locally
The Node.js server reads the plaintext `staging.env` file during local development to boot up. Run the dev server:
```bash
npm run dev
```

---

## 🔄 Part 5: The Git Workflow (Encryption before commit)

Before checking code into version control, encrypt your secrets:

```bash
# Encrypt staging.env into staging.env.enc using your AGE public key
SOPS_AGE_KEY_FILE=keys.txt ./bin/sops --encrypt --age age1... --input-type dotenv --output-type dotenv staging.env > staging.env.enc
```

You can now safely commit `staging.env.enc` to Git:
```bash
git add staging.env.enc
git commit -m "Add encrypted staging configuration"
git push
```
Your plaintext `staging.env` and `keys.txt` are excluded by `.gitignore` and never committed.

---

## ☁️ Part 6: Vercel Deployment

Deploying on Vercel gives you two architectural choices:

### Option 1: Vercel Dashboard Variables Only (Simple)
For simple applications, store configurations directly in the Vercel dashboard:
1. Go to **Project Settings -> Environment Variables**.
2. Add your keys (`DATABASE_URL`, `API_SECRET_KEY`, etc.) directly.
3. Pros: Zero setup required; Vercel handles encryption.
4. Cons: No Git version history; harder to track changes.

### Option 2: SOPS + AGE + Vercel (Recommended for Enterprise/GitOps)
To keep secret changes versioned and tracked via Git PR reviews, decrypt them during the Vercel build step.

#### Step 1: Save the AGE Private Key in Vercel
In your Vercel Dashboard, go to **Settings -> Environment Variables** and add:
```env
SOPS_AGE_KEY=AGE-SECRET-KEY-1V8KFHUL3...
```

#### Step 2: Create a Decryption Script (`decrypt.js`)
Create a build-time script to decrypt secrets during Vercel's build hook:
```javascript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env.APP_ENVIRONMENT || 'staging';
let encEnvPath = path.join(__dirname, `${env}.env.enc`);
if (!fs.existsSync(encEnvPath)) {
  encEnvPath = path.join(__dirname, '.env.enc');
}
const keyPath = path.join(__dirname, 'keys.txt');

let ageKey = process.env.SOPS_AGE_KEY;
if (!ageKey && fs.existsSync(keyPath)) {
  const keyContent = fs.readFileSync(keyPath, 'utf8');
  ageKey = keyContent.match(/(AGE-SECRET-KEY-1\w+)/)[0];
}

if (!ageKey) {
  console.log('⚠️ No AGE key found. Skipping build-time decryption.');
  process.exit(0);
}

// Write the key to a temporary file for SOPS to read
const tempKeyPath = path.join(__dirname, 'temp_key.txt');
fs.writeFileSync(tempKeyPath, ageKey, 'utf8');

try {
  const binaryPath = path.join(__dirname, 'bin', process.platform === 'win32' ? 'sops.exe' : 'sops');
  const destEnvPath = path.join(__dirname, `${env}.env`);
  
  execSync(`"${binaryPath}" --decrypt --input-type dotenv --output-type dotenv "${encEnvPath}" > "${destEnvPath}"`, {
    env: { ...process.env, SOPS_AGE_KEY_FILE: tempKeyPath }
  });
  console.log(`✅ Decrypted secrets to ${env}.env`);
} finally {
  if (fs.existsSync(tempKeyPath)) {
    fs.unlinkSync(tempKeyPath);
  }
}
```

#### Step 3: Trigger in `package.json`
Add a `prebuild` hook to decrypt secrets before Vite builds:
```json
{
  "scripts": {
    "prebuild": "node decrypt.js",
    "build": "vite build"
  }
}
```
When Vercel builds the project, it executes:
`prebuild` (decrypts `.env.enc` to `.env`) ➔ `build` (Vite compiles static assets with the decrypted configurations) ➔ Deploy.

---

## 🔄 Part 7: Secret Rotation Workflow

When you need to rotate a secret (e.g., updating database credentials):
1. Decrypt your local file:
   ```bash
   SOPS_AGE_KEY_FILE=keys.txt ./bin/sops --decrypt staging.env.enc > staging.env
   ```
2. Update the values inside `staging.env`.
3. Encrypt the file again:
   ```bash
   SOPS_AGE_KEY_FILE=keys.txt ./bin/sops --encrypt --age age1... --input-type dotenv --output-type dotenv staging.env > staging.env.enc
   ```
4. Commit `staging.env.enc` and push. The CI/CD pipeline immediately builds and deploys with the new secrets.

---

## 📊 Part 8: Comparison Matrix

| Method | Git-Safe | Setup Complexity | Cost | Version Control History |
| :--- | :--- | :--- | :--- | :--- |
| **Plaintext `.env`** | ❌ No | ✅ Extremely Easy | Free | ❌ None |
| **Vercel Dashboard Env** | ✅ Yes | ✅ Easy | Free | ❌ None |
| **SOPS + AGE** | ✅ Yes | 🟡 Medium | Free | ✅ Full Version Control |
| **HashiCorp Vault** | ✅ Yes | ❌ Hard | Paid | ✅ Full Audit Trail |
| **AWS Secrets Manager** | ✅ Yes | 🟡 Medium | Paid | ✅ Full Audit Trail |

---

## 🏢 Part 9: Enterprise Recommendations

* **Small Projects / Solo Developers:** Use Vercel Dashboard Environment Variables.
* **Growing Teams (2-50 developers):** Use **SOPS + AGE**. It ensures configuration structures are tracked in pull requests, and allows team members to decrypt secrets locally without sharing plaintext credentials over chat.
* **Large Enterprise / Compliance-restricted:** Use **HashiCorp Vault** or **AWS Secrets Manager** to support fine-grained authorization policies and dynamic secret generation.
