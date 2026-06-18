# 🔐 Modern Secret Management: Securing Vue.js & Node.js Applications with Mozilla SOPS and AGE

In modern web development, managing application secrets—such as database connection strings, Stripe keys, and OAuth credentials—is one of the most critical security responsibilities. 

Yet, a look at active repositories reveals developers making the same common mistakes:
* Committing plaintext `.env` files to Git.
* Sharing plaintext secrets over Slack or Email.
* Manually pasting environment configurations inside server terminals.
* Prefixing sensitive database credentials with `VITE_` or `REACT_APP_` prefixes, exposing them to the client-side browser bundle.

In this guide, we will demonstrate the industry-best practice for managing configuration variables: encrypting secrets using **Mozilla SOPS** and **AGE**, checking them safely into version control, and decrypting them dynamically **in-memory** at runtime in a monolithic Node.js and Vue 3 application.

---

## 🏗️ Architecture: How Secrets Flow Securely

Here is a visual map of how secrets are managed, committed, and loaded:

```mermaid
graph TD
    subgraph Local Development
        Plain[Plaintext config: staging.env] -->|Encrypt with SOPS & AGE Public Key| EncFile[Encrypted config: staging.env.enc]
        keys[Local keys.txt] -.->|Ignored by Git| GitIgnore[.gitignore]
        Plain -.->|Ignored by Git| GitIgnore
    end

    subgraph Git Version Control
        EncFile -->|Safe to Commit| Git[Git Repository]
    end

    subgraph Runtime Server (Node.js)
        Git -->|Pull Code| Server[Express Backend]
        DashboardKey[Dashboard Env Var: SOPS_AGE_KEY] -->|Injected at boot| Server
        Server -->|In-Memory Decryption of staging.env.enc| ProcessEnv[process.env]
        ProcessEnv -->|Backend-only Secrets| DB[(Database / Stripe / APIs)]
        ProcessEnv -->|Expose Safe Public Config /api/config| Browser[Vue.js Frontend]
    end
```

---

## 🛠️ The Cryptographic Core: SOPS and AGE

### What is AGE?
**AGE (Actually Good Encryption)** is a modern, simple, and secure file encryption tool designed to replace PGP. It avoids complex trust webs, generates simple key pairs, and provides lightning-fast performance.
An AGE key file looks like this:
```text
# public key: age1m92sk02f7526v0nhwuj9pv6f0dhh2zhe6pvy9e74qct79mv60guscgml49
AGE-SECRET-KEY-1V8KFHUL3MTRV6V0Q90DSZD87ZD0MK4M5MN7N5YLF0YKWXZUW6EESXS87HC
```

### What is Mozilla SOPS?
**SOPS (Secrets OPerationS)** is an editor of encrypted files that supports YAML, JSON, ENV, and INI formats. Crucially:
* SOPS encrypts **only the values** of your environment variables.
* It leaves the **keys (variable names) in plaintext**.
* This makes Git diffs highly readable and keeps your configuration structure visible without compromising security.

---

## 💻 Step-by-Step Developer Workflow

This repository contains a companion dashboard to guide you through the local setup:

### Step 1: Generate AGE Key Pair
Run this command in your local terminal:
```bash
./bin/age-keygen -o keys.txt
```
This generates `keys.txt` in your project root containing your public and private key.

### Step 2: Define your Plaintext Secrets
Create a file named `staging.env` (already pre-created for this demo) and add your configurations:
```dotenv
# Database Configuration
DATABASE_URL=postgresql://sops_user:sops_super_secret_password_2026@localhost:5432/sops_db

# Third-party integrations
API_SECRET_KEY=sk_test_51N2xSOPSandAGEsecretKeyForVerification

# Google OAuth Configuration (Public & Private keys)
VITE_GOOGLE_AUTH_CLIENT_ID=54321-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_AUTH_CLIENT_SECRET=gsec_staging_secret_key_dont_expose_998877

# Feature Toggles
VITE_FEATURE_BETA_ACCESS=true
```

### Step 3: Encrypt the file using SOPS
Encrypt your environment file using the AGE public key:
```bash
SOPS_AGE_KEY_FILE=keys.txt ./bin/sops --encrypt --age age1... --input-type dotenv --output-type dotenv staging.env > staging.env.enc
```
Your resulting `staging.env.enc` file will look like this:
```dotenv
DATABASE_URL=ENC[AES256_GCM,data:wOd+zC...,iv:...,tag:...]
VITE_GOOGLE_AUTH_CLIENT_ID=ENC[AES256_GCM,data:...,iv:...,tag:...]
```
Since the values are fully encrypted, **it is 100% safe to commit `staging.env.enc` to Git!**

### Step 4: Add Ignored Files to `.gitignore`
Make sure plaintext credentials and keys never hit Github:
```gitignore
# .gitignore
*.env
keys.txt
temp*.env*
```

---

## 🔒 Loading Secrets Safely in Node.js (Backend)

At startup, the server-side application decrypts the env file in-memory using the AGE private key. Here is how it works under the hood in `server.js`:

```javascript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function loadSopsSecrets() {
  const env = process.env.APP_ENVIRONMENT || 'staging';
  const encEnvPath = path.join(__dirname, `${env}.env.enc`);
  const keyPath = path.join(__dirname, 'keys.txt');

  // Find the private key: either local keys.txt or system env (e.g. Vercel dashboard)
  let ageKey = process.env.SOPS_AGE_KEY;
  if (!ageKey && fs.existsSync(keyPath)) {
    const content = fs.readFileSync(keyPath, 'utf8');
    const match = content.match(/(AGE-SECRET-KEY-1\w+)/);
    if (match) ageKey = match[0];
  }

  if (fs.existsSync(encEnvPath) && ageKey) {
    try {
      // Execute SOPS decryption in-memory
      const decrypted = execSync(`"./bin/sops" --decrypt --input-type dotenv --output-type dotenv "${encEnvPath}"`, {
        env: { ...process.env, SOPS_AGE_KEY: ageKey }
      }).toString();

      // Inject variables into process.env
      const lines = decrypted.split('\n');
      lines.forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      });
      console.log('✅ Secrets successfully loaded into memory!');
    } catch (err) {
      console.error('❌ Decryption failed:', err.message);
    }
  }
}
```

---

## 🌐 Securing Vue.js (The Vite Bundle Exposure Loophole)

Single Page Application frameworks (Vite, Webpack, Vue, React) bakes any environment variable starting with `VITE_` or `REACT_APP_` **directly into the compiled static JS file**. If you write:
```env
VITE_STRIPE_SECRET_KEY=sk_live_51N2x...
```
Any website visitor can open Chrome DevTools, inspect the JS bundle source code, and steal your secret key!

### The Solution: Expose config dynamically via API
1. Keep sensitive keys unprefixed (e.g. `API_SECRET_KEY`).
2. Write a secure Node.js endpoint `/api/config` that returns only safe public variables:
```javascript
app.get('/api/config', (req, res) => {
  res.json({
    VITE_GOOGLE_AUTH_CLIENT_ID: process.env.VITE_GOOGLE_AUTH_CLIENT_ID,
    VITE_FEATURE_BETA_ACCESS: process.env.VITE_FEATURE_BETA_ACCESS === 'true'
  });
});
```
3. Fetch this endpoint at frontend startup. The sensitive database keys and Stripe secrets remain strictly inside the backend's memory, never exposing them to the network tab.

---

## 🚀 CI/CD Integration (GitHub Actions & Jenkins)

For automated deployments, store your private key as a secret on your deployment platform:

### 1. GitHub Actions Workflow
```yaml
name: Deploy Application
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and Deploy
        env:
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: |
          # Node serverless launcher automatically picks up SOPS_AGE_KEY from the runtime environment!
          npm install
          npm run build
          npm run start
```

### 2. Jenkins Pipeline
```groovy
stage('Deploy') {
    steps {
        withCredentials([string(credentialsId: 'sops-age-key', variable: 'SOPS_AGE_KEY')]) {
            sh '''
            # Run build script
            npm install
            npm run build
            '''
        }
    }
}
```

---

## 📝 Security Best Practices Cheat Sheet

### Do:
* ✅ Encrypt environment files before committing to version control.
* ✅ Keep environment files separated (e.g., `dev.env.enc`, `staging.env.enc`, `prod.env.enc`).
* ✅ Put `keys.txt` and `*.env` files in your `.gitignore`.
* ✅ Decrypt files in-memory at runtime to prevent writing plain text keys to disk in production.
* ✅ Store the production AGE private key inside secure dashboards (Vercel, AWS Secrets Manager, GitHub Secrets).

### Don't:
* ❌ Commit raw private key files (`keys.txt`) to Git.
* ❌ Prefix private backend keys with `VITE_` or `REACT_APP_`.
* ❌ Transmit private keys or decrypted payloads over API endpoints.
* ❌ Store production private keys in the code repository.
