<template>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-logo">
        <ShieldCheck class="logo-icon" />
      </div>
      <h1>Secure Secret Management</h1>
      <p>Demonstrating industry-standard secrets management using Mozilla SOPS and AGE in a Node.js + Vue.js monolith.</p>
    </header>

    <!-- Navigation Tabs -->
    <nav class="nav-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'playground' }" 
        @click="activeTab = 'playground'"
        id="tab-playground"
      >
        <Layers class="tab-icon" /> Interactive Playground
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'docs' }" 
        @click="activeTab = 'docs'"
        id="tab-docs"
      >
        <BookOpen class="tab-icon" /> Technical Guide
      </button>
    </nav>

    <!-- Main Content Area -->
    <main>
      <!-- TAB 1: INTERACTIVE PLAYGROUND -->
      <div v-if="activeTab === 'playground'">
        <div class="playground-layout">
        
        <!-- Left Column: Steps -->
        <div class="steps-column">
          
          <!-- Step 1: AGE Key Generation -->
          <section class="glass-card step-card" :class="{ 'step-active': currentStep === 1 }">
            <div class="step-num">1</div>
            <div class="step-content">
              <h3>Generate AGE Key Pair (Local Terminal)</h3>
              <p class="step-desc">AGE is a modern, simple, and secure file encryption tool. Run the following command in your terminal inside the project root directory to generate a private/public key pair:</p>
              
              <div class="code-container" style="margin-bottom: 1rem;">
                <div class="code-header">
                  <span>Terminal Command</span>
                  <button class="copy-btn" @click="copyText('./bin/age-keygen -o keys.txt', 'keygenCmd')" :class="{ copied: copyStatus.keygenCmd }">
                    <Copy size="14" /> {{ copyStatus.keygenCmd ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <pre class="code-body">./bin/age-keygen -o keys.txt</pre>
              </div>

              <div class="status-indicator" style="padding: 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.75rem;" :style="(serverEnv.files.keysTxtStatus === 'Detected' || (serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS')) ? 'background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2);' : 'background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2);'">
                <CheckCircle v-if="serverEnv.files.keysTxtStatus === 'Detected' || (serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS')" style="color: #22c55e;" />
                <AlertCircle v-else style="color: #eab308;" />
                <div style="flex-grow: 1;">
                  <span v-if="serverEnv.files.keysTxtStatus === 'Detected'" style="color: #22c55e; font-weight: 500;">
                    ✅ keys.txt detected in project root! (Public Key: <code>{{ serverEnv.files.keysTxtPublicKey }}</code>)
                  </span>
                  <span v-else-if="serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS'" style="color: #22c55e; font-weight: 500;">
                    ✅ Private key active via environment variable (Production mode)
                  </span>
                  <span v-else style="color: #eab308; font-weight: 500;">
                    ⏳ Waiting for you to run the keygen command in your local terminal...
                  </span>
                </div>
                <button class="btn btn-secondary" @click="fetchServerEnv" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 4px;">
                  Check Status
                </button>
              </div>
            </div>
          </section>

          <section class="glass-card step-card" :class="{ 'step-active': currentStep === 2, 'step-disabled': serverEnv.files.keysTxtStatus === 'Missing' && !serverEnv.isProduction }">
            <div class="step-num">2</div>
            <div class="step-content">
              <h3>Define Plaintext Configurations</h3>
              <p class="step-desc">Create a local file named <code>staging.env</code> in the project root directory. (We have already pre-populated this file for you in this repository, and it is excluded from Git via <code>.gitignore</code>):</p>
              
              <div class="code-container" style="margin-bottom: 1rem;">
                <div class="code-header">
                  <span>staging.env</span>
                  <button class="copy-btn" @click="copyText('staging.env', 'stagingEnv')" :class="{ copied: copyStatus.stagingEnv }">
                    <Copy size="14" /> {{ copyStatus.stagingEnv ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <pre class="code-body" style="font-size: 0.8rem;"># Database Configuration
DATABASE_URL=postgresql://sops_user:sops_super_secret_password_2026@localhost:5432/sops_db

# Third-party integrations
API_SECRET_KEY=sk_test_51N2xSOPSandAGEsecretKeyForVerification

# Google OAuth Configuration
VITE_GOOGLE_AUTH_CLIENT_ID=54321-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_AUTH_CLIENT_SECRET=gsec_staging_secret_key_dont_expose_998877

# Feature Toggles
VITE_FEATURE_BETA_ACCESS=true</pre>
              </div>

              <div class="status-indicator" style="padding: 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.75rem;" :style="(serverEnv.files.plaintextEnvStatus === 'Detected' || (serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS')) ? 'background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2);' : 'background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2);'">
                <CheckCircle v-if="serverEnv.files.plaintextEnvStatus === 'Detected' || (serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS')" style="color: #22c55e;" />
                <AlertCircle v-else style="color: #eab308;" />
                <div style="flex-grow: 1;">
                  <span v-if="serverEnv.files.plaintextEnvStatus === 'Detected'" style="color: #22c55e; font-weight: 500;">
                    ✅ Plaintext staging.env file detected on server!
                  </span>
                  <span v-else-if="serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS'" style="color: #22c55e; font-weight: 500;">
                    ✅ Plaintext bypassed in production (Secrets are secured using SOPS)
                  </span>
                  <span v-else style="color: #eab308; font-weight: 500;">
                    ⏳ Waiting for staging.env to be created...
                  </span>
                </div>
                <button class="btn btn-secondary" @click="fetchServerEnv" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 4px;">
                  Check Status
                </button>
              </div>
            </div>
          </section>

          <!-- Step 3: Encrypt with SOPS -->
          <section class="glass-card step-card" :class="{ 'step-active': currentStep === 3, 'step-disabled': currentStep < 3 && !serverEnv.isProduction }">
            <div class="step-num">3</div>
            <div class="step-content">
              <h3>Encrypt Secrets with SOPS (Local Terminal)</h3>
              <p class="step-desc">Mozilla SOPS (Secrets OPerationS) encrypts the values of your environment variables using your AGE public key. Run the following command in your terminal to encrypt your plaintext configuration file:</p>
              
              <div class="code-container" style="margin-bottom: 1rem;">
                <div class="code-header">
                  <span>Terminal Command</span>
                  <button class="copy-btn" @click="copyText('SOPS_AGE_KEY_FILE=keys.txt ./bin/sops --encrypt --age ' + (serverEnv.files.keysTxtPublicKey !== 'None' ? serverEnv.files.keysTxtPublicKey : '<public_key>') + ' --input-type dotenv --output-type dotenv staging.env > staging.env.enc', 'encryptCmd')" :class="{ copied: copyStatus.encryptCmd }">
                    <Copy size="14" /> {{ copyStatus.encryptCmd ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <pre class="code-body" style="font-size: 0.75rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">SOPS_AGE_KEY_FILE=keys.txt ./bin/sops --encrypt --age {{ serverEnv.files.keysTxtPublicKey !== 'None' ? serverEnv.files.keysTxtPublicKey : '&lt;public_key&gt;' }} --input-type dotenv --output-type dotenv staging.env > staging.env.enc</pre>
              </div>

              <div class="status-indicator" style="padding: 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.75rem;" :style="((serverEnv.files.envEnc && !serverEnv.files.envEnc.includes('not found')) || (serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS')) ? 'background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2);' : 'background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2);'">
                <CheckCircle v-if="(serverEnv.files.envEnc && !serverEnv.files.envEnc.includes('not found')) || (serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS')" style="color: #22c55e;" />
                <AlertCircle v-else style="color: #eab308;" />
                <div style="flex-grow: 1;">
                  <span v-if="serverEnv.files.envEnc && !serverEnv.files.envEnc.includes('not found')" style="color: #22c55e; font-weight: 500;">
                    ✅ Encrypted file staging.env.enc detected!
                  </span>
                  <span v-else-if="serverEnv.isProduction && serverEnv.decryptStatus === 'SUCCESS'" style="color: #22c55e; font-weight: 500;">
                    ✅ Encrypted secrets successfully loaded in production
                  </span>
                  <span v-else style="color: #eab308; font-weight: 500;">
                    ⏳ Waiting for staging.env.enc to be generated...
                  </span>
                </div>
                <button class="btn btn-secondary" @click="fetchServerEnv" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 4px;">
                  Check Status
                </button>
              </div>
            </div>
          </section>

          <!-- Step 4: Apply to Server & Decrypt -->
          <section class="glass-card step-card" :class="{ 'step-active': currentStep === 4, 'step-disabled': (!serverEnv.files.envEnc || serverEnv.files.envEnc.includes('not found')) && !serverEnv.isProduction }">
            <div class="step-num">4</div>
            <div class="step-content">
              <h3>Deploy & Decrypt (Runtime Simulation)</h3>
              <p class="step-desc">Simulate starting or reloading your application backend. The Express server will read the encrypted <code>staging.env.enc</code> and the private key from the local disk, decrypting them in-memory. <strong>No private keys are sent or shared over the network!</strong></p>
              
              <div class="btn-group" style="margin-bottom: 1rem;">
                <button class="btn btn-primary" @click="reloadServerEnv" :disabled="loading.reload || ((serverEnv.files.envEnc && serverEnv.files.envEnc.includes('not found')) && !serverEnv.isProduction)" id="btn-reload-env">
                  <RefreshCw v-if="loading.reload" class="spin-icon" />
                  <Unlock v-else /> Reload & Decrypt In-Memory
                </button>
              </div>

              <div class="status-indicator" style="padding: 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.75rem;" :style="(serverEnv.env.SOPS_DECRYPT_STATUS === 'SUCCESS' || serverEnv.decryptStatus === 'SUCCESS') ? 'background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2);' : 'background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2);'">
                <CheckCircle v-if="serverEnv.env.SOPS_DECRYPT_STATUS === 'SUCCESS' || serverEnv.decryptStatus === 'SUCCESS'" style="color: #22c55e;" />
                <AlertCircle v-else style="color: #eab308;" />
                <div style="flex-grow: 1;">
                  <span v-if="serverEnv.env.SOPS_DECRYPT_STATUS === 'SUCCESS' || serverEnv.decryptStatus === 'SUCCESS'" style="color: #22c55e; font-weight: 500;">
                    ✅ Secrets successfully decrypted and loaded into Node.js memory!
                  </span>
                  <span v-else style="color: #eab308; font-weight: 500;">
                    ⏳ Waiting for environment reload...
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Right Column: Server Environment Monitor -->
        <div class="monitor-column">
          <div class="glass-card monitor-card">
            <div class="monitor-header">
              <div class="monitor-title">
                <Cpu class="monitor-icon" />
                <h3>Backend Environment Monitor</h3>
              </div>
              <button class="refresh-btn" @click="fetchServerEnv" :disabled="loading.env">
                <RefreshCw :class="{ 'spin-icon': loading.env }" size="16" />
              </button>
            </div>
            
            <p class="monitor-desc">This panel displays the actual configuration variables loaded inside the running Node.js process and the files stored on the server.</p>
            
            <!-- Process State -->
            <div class="monitor-section">
              <h4>Runtime Environment Status</h4>
              <div class="status-grid">
                <div class="status-item">
                  <span class="status-label">Decryption Status</span>
                  <span class="badge" :class="getStatusBadgeClass(serverEnv.env.SOPS_DECRYPT_STATUS)">
                    {{ serverEnv.env.SOPS_DECRYPT_STATUS || 'UNKNOWN' }}
                  </span>
                </div>
                <div class="status-item">
                  <span class="status-label">Decryption Method</span>
                  <span class="status-value highlight">{{ serverEnv.env.SOPS_DECRYPT_METHOD || 'None' }}</span>
                </div>
              </div>

              <div v-if="serverEnv.env.SOPS_DECRYPT_ERROR" class="error-log">
                <h5>Decryption Error Log</h5>
                <pre>{{ serverEnv.env.SOPS_DECRYPT_ERROR }}</pre>
              </div>
            </div>



            <!-- Loaded variables -->
            <div class="monitor-section">
              <h4>Loaded Env Variables (Masked)</h4>
              <div class="env-vars-list">
                <div v-for="(val, key) in filteredEnv" :key="key" class="env-var-row">
                  <span class="env-key">{{ key }}</span>
                  <span class="env-val code-font">{{ val !== null ? val : 'Not Loaded' }}</span>
                </div>
              </div>
            </div>

            <!-- Server Files -->
            <div class="monitor-section">
              <h4>Server Filesystem State</h4>
              
              <div class="file-toggle-tabs">
                <button 
                  class="file-tab" 
                  :class="{ active: activeFileTab === 'keys' }"
                  @click="activeFileTab = 'keys'"
                >
                  keys.txt (AGE Key)
                </button>
                <button 
                  class="file-tab" 
                  :class="{ active: activeFileTab === 'enc' }"
                  @click="activeFileTab = 'enc'"
                >
                  .env.enc (SOPS file)
                </button>
              </div>

              <div class="file-content-viewer">
                <pre v-if="activeFileTab === 'keys'" class="file-code">{{ maskedServerKeys }}</pre>
                <pre v-else class="file-code">{{ serverEnv.files.envEnc }}</pre>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- VULNERABILITY INSPECTOR: DEMONSTRATING VITE BUNDLE EXPOSURE -->
      <div class="glass-card vulnerability-section">
        <div class="vulnerability-header">
          <AlertCircle class="vulnerability-icon danger" />
          <h3>Client-Side Secrets Exposure Demo (Vercel / Vite Build)</h3>
        </div>
        <p class="section-desc">
          When building a client-side Single Page Application (e.g. built with Vite and deployed on Vercel), any standard environment variable you reference gets <strong>baked directly into the production JavaScript bundle</strong> (e.g. <code>dist/assets/index.js</code>). Let's see what happens to your secrets under both approaches:
        </p>
        
        <div class="comparison-grid">
          <!-- Side A: Vulnerable Approach -->
          <div class="comparison-card vulnerable">
            <div class="card-badge badge-danger">Vulnerable (Plaintext build-time vars)</div>
            <div class="comparison-card-header">Vite Bundle Output: <code>dist/assets/index-*.js</code></div>
            <div class="code-container">
              <pre class="code-body">{{ bundleSim.clientPlaintextBundle }}</pre>
            </div>
          </div>

          <!-- Side B: Secure Approach -->
          <div class="comparison-card secure">
            <div class="card-badge badge-success">Secure (In-Memory Decrypted secrets)</div>
            <div class="comparison-card-header">Vite Bundle Output: <code>dist/assets/index-*.js</code></div>
            <div class="code-container">
              <pre class="code-body">{{ bundleSim.clientSopsBundle }}</pre>
            </div>
          </div>
        </div>

        <div class="vulnerability-summary">
          <CheckCircle class="vulnerability-icon success" />
          <div>
            <strong>How this app secures your environment variables on Vercel:</strong>
            <p>Instead of prefixing keys with <code>VITE_</code> (which forces Vite to compile them into browser assets), critical credentials are left unprefixed. During deployment, the AGE key is stored in your hosting dashboard. At runtime, the server-side Node.js function decrypts <code>.env.enc</code> in-memory. The client code never sees the secrets; they remain safely behind server-side APIs!</p>
          </div>
        </div>
      </div>

      <!-- DYNAMIC CONFIGURATION DEMO -->
      <div class="glass-card dynamic-demo-section" style="margin-top: 2rem;">
        <div class="vulnerability-header">
          <Layers class="vulnerability-icon success" />
          <h3>Dynamic Frontend Features Demo (Environment-driven)</h3>
        </div>
        <p class="section-desc">
          To illustrate how your frontend securely consumes environment configurations at runtime: below is a live simulation. 
          The backend decrypts the secrets (like <code>VITE_GOOGLE_AUTH_CLIENT_ID</code> and <code>VITE_FEATURE_BETA_ACCESS</code>) from <code>.env.enc</code> (or <code>staging.env.enc</code>) and exposes <strong>only the public properties</strong> to the frontend via the <code>/api/config</code> API endpoint. The sensitive <strong>Client Secret</strong> and database password remain safely hidden on the server!
        </p>

        <div class="demo-playground-grid" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; margin-top: 1.5rem;">
          
          <!-- LEFT SIDE: FRONTEND UI ADAPTATION -->
          <div class="demo-panel fe-render">
            <h4 style="margin-bottom: 1rem; color: var(--primary); display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem;">
              <ShieldCheck size="18" /> Frontend UI Rendering (Safe Client View)
            </h4>
            <div class="fe-canvas" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; min-height: 200px; justify-content: center;">
              
              <!-- Client ID Integration -->
              <div v-if="publicConfig.VITE_GOOGLE_AUTH_CLIENT_ID && publicConfig.VITE_GOOGLE_AUTH_CLIENT_ID !== 'mock-client-id-not-loaded'" class="google-auth-widget" style="padding: 1rem; border-radius: 6px; background: rgba(66, 133, 244, 0.1); border: 1px solid rgba(66, 133, 244, 0.2);">
                <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #4285F4; font-weight: bold; display: block; margin-bottom: 0.5rem;">Google Authentication Integration</span>
                <button class="btn" style="background: #4285F4; color: white; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; padding: 0.5rem 1rem; border-radius: 4px; border: none; cursor: pointer; font-weight: 500;">
                  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12v2.7h5.38C17.1,14.93,15.89,16.5,13.85,17.58v2.28h3.9c2.28-2.1,3.6-5.2,3.6-8.76C21.35,11.1,21.35,11.1,21.35,11.1z M12,21.6c2.59,0,4.76-0.86,6.35-2.34l-3.9-2.28c-1.08,0.72-2.47,1.15-4.45,1.15c-3.42,0-6.32-2.3-7.36-5.4H2.43v2.38C4.02,18.3,7.74,21.6,12,21.6z M4.64,12.72c-0.27-0.81-0.42-1.68-0.42-2.58s0.15-1.77,0.42-2.58V5.18H2.43C1.65,6.73,1.2,8.47,1.2,10.3s0.45,3.57,1.23,5.12L4.64,12.72z M12,7.2c1.78,0,3.38,0.61,4.64,1.8l3.48-3.48C18.02,3.6,15.22,2.7,12,2.7C7.74,2.7,4.02,6,2.43,9.12l3.48,3.48C6.95,9.5,9.85,7.2,12,7.2z"/></svg>
                  Login with Google
                </button>
                <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-muted); word-break: break-all;">
                  Using Client ID: <code style="color: #4285F4;">{{ publicConfig.VITE_GOOGLE_AUTH_CLIENT_ID }}</code>
                </div>
              </div>
              <div v-else style="color: var(--text-muted); font-size: 0.9rem; text-align: center; border: 1px dashed rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 6px;">
                🔑 Google Auth is disabled (Client ID not loaded or mock-client-id-not-loaded).
              </div>

              <!-- Beta Feature Flag Toggle -->
              <div v-if="publicConfig.VITE_FEATURE_BETA_ACCESS" class="beta-widget" style="padding: 1rem; border-radius: 6px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); display: flex; align-items: center; gap: 0.75rem;">
                <div style="background: var(--accent); color: black; font-size: 0.7rem; font-weight: bold; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; line-height: 1.2;">Beta</div>
                <div style="text-align: left;">
                  <h5 style="color: var(--accent); font-size: 0.9rem; margin: 0 0 0.1rem 0;">Staging Environment Beta Access</h5>
                  <p style="font-size: 0.8rem; margin: 0; color: var(--text-muted);">You have been granted access to advanced experimental developer tools.</p>
                </div>
              </div>
              <div v-else style="color: var(--text-muted); font-size: 0.9rem; text-align: center; border: 1px dashed rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 6px;">
                🚀 Beta access features are locked (VITE_FEATURE_BETA_ACCESS = false).
              </div>

            </div>
          </div>

          <!-- RIGHT SIDE: API RESPONSE COMPARISON -->
          <div class="demo-panel api-response">
            <h4 style="margin-bottom: 1rem; color: var(--secondary); display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem;">
              <Terminal size="18" /> Runtime Security Breakdown
            </h4>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              
              <!-- Public JSON Endpoint -->
              <div>
                <span style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 0.25rem; color: var(--text-muted); text-align: left;">
                  🌐 Public API Response (<code>GET /api/config</code>):
                </span>
                <pre class="code-body" style="margin: 0; padding: 0.75rem; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 0.85rem; color: #34d399; text-align: left;">{{ JSON.stringify(publicConfig, null, 2) }}</pre>
              </div>

              <!-- Private Server Variables (Masked) -->
              <div>
                <span style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 0.25rem; color: #f87171; text-align: left;">
                  🔒 Hidden Server Secrets (Never sent to client):
                </span>
                <div style="padding: 0.75rem; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 6px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">GOOGLE_AUTH_CLIENT_SECRET:</span>
                    <span class="code-font" style="color: #f87171; font-weight: bold;">gsec_********_dont_expose_********</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">API_SECRET_KEY:</span>
                    <span class="code-font" style="color: #f87171; font-weight: bold;">sk_test_51N2x************************</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">DATABASE_URL:</span>
                    <span class="code-font" style="color: #f87171; font-weight: bold;">postgresql://********:********@********...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- TAB 2: TECHNICAL GUIDE -->
      <div v-else class="glass-card doc-section">
        <h2><ShieldCheck /> Mozilla SOPS + AGE Secret Management Guide</h2>
        <p>In modern web development, managing credentials (API keys, database passwords, tokens) securely is crucial. A common mistake is committing a plaintext <code>.env</code> file directly to Git, which exposes secrets to unauthorized users or leaks them in public code repositories.</p>
        
        <p><strong>Mozilla SOPS (Secrets OPerationS)</strong> combined with <strong>AGE (Actually Good Encryption)</strong> solves this problem by allowing developers to encrypt only the sensitive values inside their environment files, making it completely safe to check them into Git, while retaining readable configuration keys for team collaboration.</p>

        <h3>Why SOPS + AGE?</h3>
        <ul>
          <li><strong>Git-Friendly Diffing:</strong> Because only the values are encrypted, Git diffs remain highly readable. When you add or change a key name, other developers see exactly what changed without exposing the secret values.</li>
          <li><strong>No Centralized Server Required:</strong> Unlike HashiCorp Vault or AWS Secrets Manager, SOPS uses standard cryptographic file formats and key pairs (via AGE). You don't need to host an expensive vault infrastructure for local development.</li>
          <li><strong>Multi-Provider Support:</strong> SOPS supports AGE keys, PGP keys, and cloud KMS solutions (AWS KMS, GCP KMS, Azure Key Vault, HashiCorp Vault). You can start with AGE locally and transition to AWS KMS in production without changing your config structure!</li>
          <li><strong>Granular Encryption:</strong> You can define custom regular expressions to encrypt only specific JSON/YAML branches, leaving general configuration readable.</li>
        </ul>

        <div class="diagram-container">
          <h4>SOPS + AGE Secret Management Workflow</h4>
          <div class="diagram-box">
            <div class="diagram-flow">
              <div class="diagram-node">
                <FileText class="d-icon" />
                <span>Plaintext secrets (.env)</span>
              </div>
              <div class="diagram-arrow">➔</div>
              <div class="diagram-node highlight-primary">
                <Lock class="d-icon" />
                <span>SOPS (using AGE Public Key)</span>
              </div>
              <div class="diagram-arrow">➔</div>
              <div class="diagram-node highlight-secondary">
                <FileText class="d-icon" />
                <span>Encrypted secrets (.env.enc) <br><small>(Commited to Git)</small></span>
              </div>
            </div>
            
            <div class="diagram-divider"></div>
            
            <div class="diagram-flow">
              <div class="diagram-node highlight-secondary">
                <FileText class="d-icon" />
                <span>Encrypted secrets (.env.enc)</span>
              </div>
              <div class="diagram-arrow">➔</div>
              <div class="diagram-node highlight-primary">
                <Unlock class="d-icon" />
                <span>SOPS (using AGE Private Key)</span>
              </div>
              <div class="diagram-arrow">➔</div>
              <div class="diagram-node">
                <Terminal class="d-icon" />
                <span>Loaded Environment Variables <br><small>(Runtime In-Memory Only)</small></span>
              </div>
            </div>
          </div>
        </div>

        <h2>CLI Commands: Step-by-Step Setup Guide</h2>
        <p>Follow these commands to configure secure secret management in your own local projects.</p>

        <h3>1. Install AGE and SOPS</h3>
        <p>Install the tools using package managers:</p>
        <div class="code-container">
          <div class="code-header"><span>Linux (Debian/Ubuntu)</span></div>
          <pre class="code-body"><span class="code-comment"># Install AGE</span>
sudo apt install age

<span class="code-comment"># Install SOPS</span>
curl -LO https://github.com/getsops/sops/releases/download/v3.9.0/sops-v3.9.0.linux.amd64
sudo mv sops-v3.9.0.linux.amd64 /usr/local/bin/sops
sudo chmod +x /usr/local/bin/sops</pre>
        </div>

        <div class="code-container">
          <div class="code-header"><span>macOS (Homebrew)</span></div>
          <pre class="code-body">brew install age sops</pre>
        </div>

        <h3>2. Generate an AGE Key Pair</h3>
        <p>Generate your private and public key pair. The private key will be saved to a standard SOPS config path:</p>
        <div class="code-container">
          <div class="code-header"><span>Shell Terminal</span></div>
          <pre class="code-body"><span class="code-comment"># Create age config directory</span>
mkdir -p ~/.config/sops/age

<span class="code-comment"># Generate key pair and save to config path</span>
age-keygen -o ~/.config/sops/age/keys.txt

<span class="code-comment"># View your public key (so you can share it with team members)</span>
grep -oP 'public key: \K.*' ~/.config/sops/age/keys.txt</pre>
        </div>

        <h3>3. Encrypt a Plaintext Environment File</h3>
        <p>Encrypt your <code>.env</code> file into an encrypted <code>.env.enc</code> file using your public key recipient:</p>
        <div class="code-container">
          <div class="code-header"><span>Shell Terminal</span></div>
          <pre class="code-body">sops --encrypt --age &lt;YOUR_PUBLIC_KEY&gt; --input-type dotenv --output-type dotenv .env > .env.enc</pre>
        </div>

        <h3>4. Decrypt at Runtime / Deployment</h3>
        <p>To run your node application with decrypted environment variables, you can decrypt them on-the-fly without saving the decrypted file to disk! This prevents writing plaintext secrets to server hard drives.</p>
        
        <p><strong>Option A: In-Memory Decryption at Startup (Backend Runtime)</strong></p>
        <p>You can write a simple startup function in Node.js to decrypt the secrets using child processes and inject them directly into <code>process.env</code>:</p>
        <div class="code-container">
          <div class="code-header"><span>server.js (Node.js decryption utility)</span></div>
          <pre class="code-body"><span class="code-keyword">import</span> { execSync } <span class="code-keyword">from</span> <span class="code-string">'child_process'</span>;
<span class="code-keyword">import</span> fs <span class="code-keyword">from</span> <span class="code-string">'fs'</span>;

<span class="code-keyword">function</span> <span class="code-variable">loadSopsSecrets</span>() {
  <span class="code-keyword">if</span> (fs.existsSync(<span class="code-string">'.env.enc'</span>)) {
    <span class="code-keyword">const</span> ageKey = process.env.SOPS_AGE_KEY || fs.readFileSync(<span class="code-string">'keys.txt'</span>, <span class="code-string">'utf8'</span>).match(/(AGE-SECRET-KEY-1\w+)/)[1];
    
    <span class="code-keyword">const</span> decrypted = execSync(<span class="code-string">`sops -d --input-type dotenv --output-type dotenv .env.enc`</span>, {
      env: { ...process.env, SOPS_AGE_KEY: ageKey }
    }).toString();
    
    decrypted.split(<span class="code-string">'\n'</span>).forEach(line => {
      <span class="code-keyword">const</span> match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      <span class="code-keyword">if</span> (match) {
        <span class="code-variable">process.env</span>[match[1]] = match[2];
      }
    });
  }
}</pre>
        </div>

        <p><strong>Option B: Vercel Build-time Decryption Workflow (Prebuild Script)</strong></p>
        <p>Since Vercel hosts static frontend files and serverless endpoints, you should decrypt secrets during the Vercel Build pipeline before the bundler runs. Save the private key in Vercel settings as <code>SOPS_AGE_KEY</code>, create a <code>decrypt.js</code> script, and run it in <code>prebuild</code>:</p>
        
        <div class="code-container">
          <div class="code-header"><span>decrypt.js (Build-time decryption utility)</span></div>
          <pre class="code-body"><span class="code-keyword">import</span> { execSync } <span class="code-keyword">from</span> <span class="code-string">'child_process'</span>;
<span class="code-keyword">import</span> fs <span class="code-keyword">from</span> <span class="code-string">'fs'</span>;

<span class="code-keyword">const</span> env = process.env.APP_ENVIRONMENT || <span class="code-string">'staging'</span>;
<span class="code-keyword">const</span> ageKey = process.env.SOPS_AGE_KEY || fs.readFileSync(<span class="code-string">'keys.txt'</span>, <span class="code-string">'utf8'</span>).match(/(AGE-SECRET-KEY-1\w+)/)[0];

<span class="code-comment">// Create a temp key file for SOPS to read</span>
fs.writeFileSync(<span class="code-string">'temp_key.txt'</span>, ageKey, <span class="code-string">'utf8'</span>);

execSync(<span class="code-string">`sops -d --input-type dotenv --output-type dotenv ${env}.env.enc > ${env}.env`</span>, {
  env: { ...process.env, SOPS_AGE_KEY_FILE: <span class="code-string">'temp_key.txt'</span> }
});

fs.unlinkSync(<span class="code-string">'temp_key.txt'</span>);</pre>
        </div>

        <div class="code-container" style="margin-top: 1rem;">
          <div class="code-header"><span>package.json (Vite Integration)</span></div>
          <pre class="code-body">{
  <span class="code-string">"scripts"</span>: {
    <span class="code-string">"prebuild"</span>: <span class="code-string">"node decrypt.js"</span>,
    <span class="code-string">"build"</span>: <span class="code-string">"vite build"</span>
  }
}</pre>
        </div>

        <h2>Git & CI/CD Best Practices</h2>
        <div class="best-practices-grid">
          <div class="bp-card">
            <h4>1. Update .gitignore</h4>
            <p>Ensure that your private keys and plaintext env files are never committed to your repository. Add the following to your <code>.gitignore</code>:</p>
            <pre class="bp-code">.env
keys.txt
temp*.env*</pre>
          </div>
          
          <div class="bp-card">
            <h4>2. CI/CD Integration</h4>
            <p>In your deployment workflows (like GitHub Actions), store the AGE private key as a repository secret (e.g. <code>SOPS_AGE_KEY</code>). During deployment, load it in the workflow environment, run SOPS to decrypt the environment, and build/deploy your application. Secrets are never exposed in your source code.</p>
          </div>

          <div class="bp-card">
            <h4>3. Prevent Client Leaks</h4>
            <p>Never prefix sensitive API keys or database URLs with <code>VITE_</code> or reference them directly in frontend files. Keep them unprefixed, decrypt them in-memory only on the server/serverless functions, and expose only safe public API responses to the browser.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { 
  ShieldCheck, 
  Layers, 
  BookOpen, 
  Key, 
  Lock, 
  Unlock, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Cpu, 
  FileText, 
  Terminal 
} from '@lucide/vue';

const activeTab = ref('playground');
const activeFileTab = ref('keys');
const currentStep = ref(1);

const loading = ref({
  reload: false,
  env: false
});

const bundleSim = ref({
  clientPlaintextBundle: '',
  clientSopsBundle: ''
});

const activeBundleTab = ref('vulnerable');

const copyStatus = ref({
  keygenCmd: false,
  encryptCmd: false,
  stagingEnv: false
});

const serverEnv = ref({
  env: {
    DATABASE_URL: null,
    API_SECRET_KEY: null,
    APP_ENVIRONMENT: null,
    VITE_GOOGLE_AUTH_CLIENT_ID: null,
    GOOGLE_AUTH_CLIENT_SECRET: null,
    VITE_FEATURE_BETA_ACCESS: null,
    SOPS_DECRYPT_STATUS: 'UNKNOWN',
    SOPS_DECRYPT_METHOD: 'None',
    SOPS_DECRYPT_ERROR: null
  },
  files: {
    keysTxtStatus: 'Missing',
    keysTxtPublicKey: 'None',
    plaintextEnvStatus: 'Missing',
    envEnc: ''
  }
});

const publicConfig = ref({
  VITE_GOOGLE_AUTH_CLIENT_ID: null,
  VITE_FEATURE_BETA_ACCESS: false
});

// Computed properties
const filteredEnv = computed(() => {
  const result = {};
  const allowedKeys = [
    'DATABASE_URL',
    'API_SECRET_KEY',
    'APP_ENVIRONMENT',
    'VITE_GOOGLE_AUTH_CLIENT_ID',
    'GOOGLE_AUTH_CLIENT_SECRET',
    'VITE_FEATURE_BETA_ACCESS'
  ];
  allowedKeys.forEach(k => {
    result[k] = serverEnv.value.env[k];
  });
  return result;
});

const maskedServerKeys = computed(() => {
  if (serverEnv.value.files.keysTxtStatus === 'Missing') {
    return '# File keys.txt not found on server filesystem';
  }
  return `# keys.txt (AGE Key Pair detected on server)
# public key: ${serverEnv.value.files.keysTxtPublicKey}
AGE-SECRET-KEY-1************************************************`;
});

// Methods
const reloadServerEnv = async () => {
  loading.value.reload = true;
  try {
    const res = await fetch('/api/reload-env', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      await fetchServerEnv();
    } else {
      alert('Error reloading environment: ' + data.error);
    }
  } catch (err) {
    alert('Failed to connect to backend: ' + err.message);
  } finally {
    loading.value.reload = false;
  }
};

const fetchPublicConfig = async () => {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (res.ok) {
      publicConfig.value = data;
    }
  } catch (err) {
    console.error('Error fetching public config:', err);
  }
};

const fetchServerEnv = async () => {
  loading.value.env = true;
  try {
    const res = await fetch('/api/env');
    const data = await res.json();
    if (res.ok) {
      serverEnv.value = data;
      
      // Auto-calculate step based on filesystem status to make guide interactive
      if (serverEnv.value.isProduction && (serverEnv.value.decryptStatus === 'SUCCESS' || serverEnv.value.env.SOPS_DECRYPT_STATUS === 'SUCCESS')) {
        currentStep.value = 4;
      } else if (serverEnv.value.files.keysTxtStatus === 'Detected') {
        if (serverEnv.value.files.plaintextEnvStatus === 'Detected') {
          if (serverEnv.value.files.envEnc && !serverEnv.value.files.envEnc.includes('not found')) {
            currentStep.value = 4;
          } else {
            currentStep.value = 3;
          }
        } else {
          currentStep.value = 2;
        }
      } else {
        currentStep.value = 1;
      }
      
      await fetchBundleSim();
      await fetchPublicConfig();
    }
  } catch (err) {
    console.error('Error fetching server env:', err);
  } finally {
    loading.value.env = false;
  }
};

const fetchBundleSim = async () => {
  try {
    const res = await fetch('/api/bundle-simulation');
    const data = await res.json();
    if (res.ok) {
      bundleSim.value = data;
    }
  } catch (err) {
    console.error('Error fetching bundle simulation:', err);
  }
};

const copyText = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.value[type] = true;
    setTimeout(() => {
      copyStatus.value[type] = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
};

const getStatusBadgeClass = (status) => {
  if (!status) return 'badge-warning';
  switch (status) {
    case 'SUCCESS': return 'badge-success';
    case 'FAILED': return 'badge-danger';
    case 'MISSING_KEY':
    case 'NO_ENC_FILE':
      return 'badge-warning';
    default: return 'badge-info';
  }
};



// Lifecycles
onMounted(() => {
  fetchServerEnv();
});
</script>

<style scoped>
/* Scoped overrides/additions to style.css */
.playground-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .playground-layout {
    grid-template-columns: 1fr;
  }
}

.steps-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-card {
  position: relative;
  display: flex;
  gap: 1.5rem;
  padding-left: 2rem;
  border-left: 4px solid var(--border-color);
  transition: all var(--transition-normal);
}

.step-active {
  border-left-color: var(--primary);
  background: rgba(17, 24, 39, 0.9);
}

.step-disabled {
  opacity: 0.4;
  pointer-events: none;
}

.step-num {
  position: absolute;
  left: -1rem;
  top: 1.5rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all var(--transition-normal);
}

.step-active .step-num {
  background-color: var(--primary);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 0 10px var(--primary-glow);
}

.step-content {
  flex: 1;
}

.step-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.step-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
}

.btn-group {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
}

.key-results, .encrypted-results, .load-results {
  margin-top: 1.5rem;
  animation: fadeIn var(--transition-normal);
}

.code-font {
  font-family: var(--font-mono) !important;
}

.copy-btn {
  background: transparent;
  border: none;
  color: var(--primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.copy-btn:hover {
  background: var(--primary-glow);
}

.copy-btn.copied {
  color: var(--success);
}

.note-info {
  font-size: 0.85rem;
  background-color: rgba(6, 182, 212, 0.05);
  border-left: 3px solid var(--secondary);
  padding: 0.75rem 1rem;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
}

/* Alert styles */
.alert {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-size: 0.9rem;
}

.alert-success {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
  color: var(--success);
}

.alert-danger {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
  color: var(--danger);
}

.alert-icon {
  margin-top: 0.1rem;
  flex-shrink: 0;
}

/* Monitor Column styles */
.monitor-card {
  position: sticky;
  top: 2rem;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.monitor-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.monitor-icon {
  color: var(--primary);
}

.monitor-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.monitor-section {
  margin-bottom: 1.5rem;
}

.monitor-section h4 {
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  font-weight: 700;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.status-item {
  background-color: rgba(17, 24, 39, 0.5);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.status-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.status-value.highlight {
  color: var(--secondary);
}

.error-log {
  margin-top: 1rem;
  background-color: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.error-log h5 {
  font-size: 0.75rem;
  color: var(--danger);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.error-log pre {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  white-space: pre-wrap;
  color: var(--text-primary);
  overflow-x: auto;
}

.env-vars-list {
  background-color: rgba(17, 24, 39, 0.5);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.env-var-row {
  display: flex;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.85rem;
}

.env-var-row:last-child {
  border-bottom: none;
}

.env-key {
  font-weight: 600;
  color: var(--text-primary);
}

.env-val {
  color: var(--success);
}

.file-toggle-tabs {
  display: flex;
  background-color: rgba(17, 24, 39, 0.8);
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  overflow: hidden;
}

.file-tab {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.file-tab:hover {
  background-color: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
}

.file-tab.active {
  background-color: rgba(31, 41, 55, 0.5);
  color: var(--primary);
  font-weight: 600;
}

.file-content-viewer {
  border: 1px solid var(--border-color);
  background-color: rgba(17, 24, 39, 0.8);
  padding: 0.75rem;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  max-height: 250px;
  overflow-y: auto;
}

.file-code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

/* Refresh / Control styles */
.refresh-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.refresh-btn:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.05);
}

.header-logo {
  display: inline-flex;
  background: rgba(16, 185, 129, 0.1);
  padding: 1rem;
  border-radius: 50%;
  border: 1px solid rgba(16, 185, 129, 0.2);
  margin-bottom: 1rem;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--primary);
}

.tab-icon {
  width: 1.15rem;
  height: 1.15rem;
  margin-bottom: -0.2rem;
  margin-right: 0.25rem;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Documentation diagram and details */
.diagram-container {
  margin: 2rem 0;
  background-color: rgba(17, 24, 39, 0.5);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.diagram-container h4 {
  font-size: 0.95rem;
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.diagram-box {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.diagram-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
}

@media (max-width: 768px) {
  .diagram-flow {
    flex-direction: column;
    text-align: center;
  }
  .diagram-arrow {
    transform: rotate(90deg);
  }
}

.diagram-node {
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 180px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.diagram-node.highlight-primary {
  border-color: var(--primary);
  color: var(--text-primary);
  background-color: rgba(16, 185, 129, 0.05);
}

.diagram-node.highlight-secondary {
  border-color: var(--secondary);
  color: var(--text-primary);
  background-color: rgba(6, 182, 212, 0.05);
}

.d-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.diagram-arrow {
  font-size: 1.5rem;
  color: var(--text-muted);
}

.diagram-divider {
  width: 80%;
  height: 1px;
  background-color: var(--border-color);
  margin: 0.5rem 0;
}

.best-practices-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 1.5rem;
}

@media (max-width: 900px) {
  .best-practices-grid {
    grid-template-columns: 1fr;
  }
}

.bp-card {
  background-color: rgba(17, 24, 39, 0.4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
}

.bp-card h4 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.bp-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.bp-code {
  font-family: var(--font-mono);
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--danger);
}

/* Vulnerability inspector styles */
.vulnerability-section {
  margin-top: 2rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeIn var(--transition-normal);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.vulnerability-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.vulnerability-header h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0;
}

.vulnerability-icon {
  width: 1.75rem;
  height: 1.75rem;
}

.vulnerability-icon.danger {
  color: var(--danger);
}

.vulnerability-icon.success {
  color: var(--primary);
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
}

.comparison-card {
  background-color: rgba(17, 24, 39, 0.4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  min-width: 0;
}

.comparison-card.vulnerable {
  border-color: rgba(239, 68, 68, 0.2);
  background-color: rgba(239, 68, 68, 0.02);
}

.comparison-card.secure {
  border-color: rgba(16, 185, 129, 0.2);
  background-color: rgba(16, 185, 129, 0.02);
}

.card-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.comparison-card-header {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.comparison-card .code-container {
  margin: 0;
  max-width: 100%;
  overflow-x: auto;
}

.vulnerability-summary {
  display: flex;
  gap: 1rem;
  background-color: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  align-items: flex-start;
}

.vulnerability-summary strong {
  display: block;
  font-size: 0.95rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.vulnerability-summary p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}
</style>
