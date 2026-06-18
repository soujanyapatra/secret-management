# 🔐 Secret Management with Mozilla SOPS and AGE

This repository is a monolithic educational web application built with **Vue 3 (Vite)** and **Node.js (Express)** to demonstrate the industry best practice of managing secure application secrets using **Mozilla SOPS** and **AGE (Actually Good Encryption)**.

The end goal of this project is to showcase how to protect sensitive credentials (like database passwords and Stripe API keys) while still allowing the frontend to dynamically access public configurations (like client IDs and feature flags) without exposing secrets to the browser.

---

## 🎯 The End Goal: Secure Environment Separation

In modern web development, applications require both **public** configurations (for the frontend/UI) and **private** secrets (for the backend server).

| Config Type | Examples | Exposing to Frontend? | Prefix Requirement |
| :--- | :--- | :--- | :--- |
| **Public Config** | `VITE_GOOGLE_AUTH_CLIENT_ID`, `VITE_FEATURE_BETA_ACCESS` | **Yes** (Safe to expose) | Must start with `VITE_` |
| **Private Secrets** | `DATABASE_URL`, `API_SECRET_KEY`, `GOOGLE_AUTH_CLIENT_SECRET` | **NO!** (Must remain hidden) | Must NOT start with `VITE_` |

This repository solves two major security problems:
1. **Avoiding Hardcoded Secrets in Git:** All secrets are encrypted in the repository using SOPS, so you can safely commit your `.enc` environment files to Git.
2. **Avoiding Secrets in the Client Bundle:** Vite compiles any `VITE_` prefixed variable into the frontend build. Private secrets are kept behind server-side APIs, ensuring they never leak into public JavaScript files or the browser console.

---

## 🔄 The Step-by-Step Workflow

Here is how the secret management system functions in development and production:

### 1. Local Plaintext Development
Each developer has a local plaintext file (e.g. `staging.env` or `.env`) containing the configuration in human-readable text:
```dotenv
DATABASE_URL=postgresql://sops_user:sops_super_secret_password_2026@localhost:5432/sops_db
API_SECRET_KEY=sk_test_51N2xSOPSandAGEsecretKeyForVerification
VITE_GOOGLE_AUTH_CLIENT_ID=54321-google-oauth-client-id.apps.googleusercontent.com
VITE_FEATURE_BETA_ACCESS=true
```
> [!IMPORTANT]
> To prevent these plaintext credentials from being committed to Git, `.gitignore` is configured to ignore all plaintext environment files via the `*.env` rule.

### 2. Encrypting for Git (SOPS + AGE)
Before pushing to Git, the developer encrypts the file into an encrypted copy (e.g. `staging.env.enc` or `.env.enc`) using the public key of the project:
```bash
sops --encrypt --age <public_key> staging.env > staging.env.enc
```
The resulting `staging.env.enc` contains only encrypted payloads:
```dotenv
DATABASE_URL=ENC[AES256_GCM,data:pyvUoVHDiII6Y...iv:...,tag:...]
VITE_GOOGLE_AUTH_CLIENT_ID=ENC[AES256_GCM,data:...iv:...,tag:...]
```
Because the values are encrypted, **it is 100% safe to commit `staging.env.enc` to Git.**

### 3. Decrypting at Runtime (No Hardcoded Server Keys)
When the application runs, it needs to decrypt the `.env.enc` file. The server loads the decryption key dynamically based on the environment:

#### 💻 In Local Development
* **Decryption Key location:** Placed in a local `keys.txt` file (which is gitignored).
* **Server Action:** The Node.js backend detects the local `keys.txt` file, reads the key, decrypts the environment variables in-memory, and injects them into `process.env`.

#### ☁️ In Production (Vercel)
* **Decryption Key location:** Saved as a secure environment variable named `SOPS_AGE_KEY` in the Vercel hosting dashboard. No physical key file is uploaded.
* **Server Action:** The serverless function reads `process.env.SOPS_AGE_KEY` directly from the hosting environment's memory and decrypts `.env.enc` in-memory.

---

## 🔒 Securing the Frontend (The Vite Loophole)

When Vite compiles the application for production:
* Vite scans the code for `import.meta.env.VITE_*` references.
* It bakes the values of those environment variables **directly into the compiled static JS files**.
* Since `DATABASE_URL` and `API_SECRET_KEY` **do not** start with `VITE_`, Vite completely ignores them. They are never compiled into the client-side JavaScript.

### The Runtime Client API Flow:
1. The frontend boots up in the user's browser.
2. The frontend makes a request to `GET /api/config`.
3. The backend server returns **only the safe, public configuration**:
   ```json
   {
     "VITE_GOOGLE_AUTH_CLIENT_ID": "54321-google-oauth-client-id.apps.googleusercontent.com",
     "VITE_FEATURE_BETA_ACCESS": true
   }
   ```
4. The sensitive `API_SECRET_KEY` and database credentials remain strictly in the backend server's memory, completely hidden from the browser.

---

## 🛠️ CLI Cheat Sheet

### Generate a new AGE Key Pair
```bash
age-keygen -o keys.txt
```
This generates a private key in `keys.txt` and prints the public key in a comment.

### Encrypt a Plaintext Environment File
```bash
sops --encrypt --age <public_key> staging.env > staging.env.enc
```

### Decrypt an Encrypted Environment File (Local Inspection)
```bash
SOPS_AGE_KEY_FILE=keys.txt sops --decrypt staging.env.enc
```
