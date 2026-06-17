# Secure Secret Management with Mozilla SOPS and AGE

This repository is a monolithic educational web application built with **Vue 3 (Vite)** and **Node.js (Express)** to demonstrate the industry best practice of managing secure application secrets using **Mozilla SOPS** and **AGE (Actually Good Encryption)**.

The project features an interactive, step-by-step cryptographic playground and a comprehensive technical guide explaining how to integrate this workflow in development and CI/CD pipelines.

---

## ⚠️ The Vulnerability: Client-Side Environment Variables

A common security vulnerability in Single Page Applications (SPAs) deployed on hosting providers like Vercel is referencing environment variables (often prefixed with `VITE_` or similar prefixes) directly in frontend code. 

**Vite compiles these variables directly into the compiled public JavaScript assets (`dist/assets/index.js`).** Anyone inspecting the client bundle or network requests can easily extract your secrets (like Stripe API keys, database connection strings, etc.).

This monolith demonstrates:
1. **The Vulnerable Approach:** Plaintext variables compiled and hardcoded in the frontend build.
2. **The Secure Approach (SOPS + AGE):** Secrets remain encrypted in git as `.env.enc`, and decrypted *in-memory* only on the secure Node.js backend. The client code never sees the secrets.

---

## Features

1. **Interactive SOPS + AGE Playground:**
   - **Key Generation:** Generate AGE key pairs dynamically.
   - **Secret Definition:** Define standard plaintext `.env` configurations.
   - **SOPS Encryption:** Encrypt environment secrets on-the-fly and inspect the structure of the resulting `.env.enc` file.
   - **In-Memory Decryption:** Apply the key and encrypted file to the backend process to demonstrate runtime decryption without writing plaintext files to disk.
2. **Client-Side Secrets Exposure Demo:** Live side-by-side inspection showing exactly how plaintext variables get baked into client JS assets vs. how SOPS + AGE keeps assets clean and secure.
3. **Backend Environment Monitor:** View a live reflection of the Node.js server environment state, including active (masked) environment variables and simulated server filesystem states.
4. **Comprehensive Documentation:** A step-by-step guide explaining setup, commands, Git best practices, and integration workflows.

---

## Tech Stack

- **Frontend:** Vue 3 (Composition API), Vite, Vanilla CSS.
- **Backend:** Node.js, Express, Child Process Executions (for SOPS/AGE CLI actions).
- **Security Tools:** Mozilla SOPS, AGE, `age-keygen`.

---

## Installation & Running

This project runs as a single monolith. You can start both the frontend development server and backend API server with **one single command**.

### Prerequisites
- Node.js (v18 or higher)
- npm

### Quick Start

1. Install npm dependencies:
   ```bash
   npm install
   ```

2. Start the development server (runs backend on port `3000` and frontend on port `5174` concurrently):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   - **Frontend:** [http://localhost:5174](http://localhost:5174)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)

### Production Build & Launch

To test the project in a compiled production state (where Express serves the static Vue production bundle):

1. Build the Vue application:
   ```bash
   npm run build
   ```

2. Start the monolithic Express server:
   ```bash
   npm start
   ```

3. Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Repository Structure

- `bin/` - Precompiled `sops` and `age` binaries for Linux x86_64.
- `src/` - Vue 3 frontend components and styling.
- `server.js` - Express backend API & static asset server.
- `keys.txt` - (*Auto-generated / Ignored*) AGE private key storage on the server.
- `.env.enc` - (*Auto-generated*) SOPS encrypted environment secrets file.
- `.env.template` - Plaintext environment configuration template used for local development and bootstrapping.
- `package.json` - Single manager for dependencies, build, and dev scripts.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
