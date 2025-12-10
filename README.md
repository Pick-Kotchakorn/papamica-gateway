# Papamica Gateway 

A LINE Bot application built with **Google Apps Script (GAS)** backend and **Cloudflare Workers** infrastructure.

##  Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Documentation](#documentation)

---

##  Features

-  **LINE Bot Integration** - Real-time messaging with LINE platform
-  **Google Sheets Database** - Store and manage data using Google Sheets
-  **Cloudflare Workers** - Serverless functions for gateway & bot logic
-  **Secure Configuration** - Secrets managed via Script Properties
-  **Scalable Architecture** - Modular design for easy expansion
-  **CI/CD Pipeline** - Automated testing via GitHub Actions

---

##  Architecture

\\\

   LINE Platform 

          (webhook)
         

 Cloudflare Gateway      
 (workers/gateway)       

          (route to bot)
         

 Main Bot Worker         
 (workers/main-bot)      

          (send to GAS)
         

 Google Apps Script      
 - Event handling        
 - Spreadsheet sync      
 - Dialogflow integration

\\\

---

##  Getting Started

### Prerequisites
- Node.js 18+
- Git
- Google Account
- Cloudflare Account

### Quick Setup

**1. Clone Repository**
\\\ash
git clone https://github.com/Pick-Kotchakorn/papamica-gateway.git
cd papamica-gateway
\\\

**2. Install Dependencies**
\\\ash
# Workers
cd workers/gateway && npm install && cd ..
cd main-bot && npm install && cd ../..

# Google Apps Script CLI
npm install -g @google/clasp
\\\

**3. Setup Secrets**
- Create \.env\ file (never commit!)
- Set \LINE_CHANNEL_ACCESS_TOKEN\, \LINE_CHANNEL_SECRET\, etc.

**4. Deploy**
\\\ash
# Deploy GAS
cd apps-script && clasp push

# Deploy Workers
cd ../workers/gateway && npm run deploy
cd ../main-bot && npm run deploy
\\\

---

##  Project Structure

\\\
papamica-gateway/
 apps-script/               Google Apps Script code
    Config.gs             Configuration management
    Main.gs               Entry point
    EventHandler.gs       Event processing
    LineAPI.gs            LINE API integration
    .clasp.json           GAS project config
    appsscript.json       App manifest

 workers/
    gateway/              Gateway worker (Cloudflare)
       src/index.js
       package.json
       wrangler.jsonc
   
    main-bot/             Bot worker (Cloudflare)
        src/index.js
        schema.sql
        package.json
        wrangler.jsonc

 docs/                     Documentation
    ARCHITECTURE.md
    DEPLOYMENT_GUIDE.md
    QUICK_REFERENCE.md
    ...

 .github/
    workflows/
        ci.yml            CI/CD pipeline

 .gitignore
 CONTRIBUTING.md           Contribution guide
 README.md                 This file
 secrets_backup/           Local backup (not tracked)
\\\

---

##  Testing

### Google Apps Script
\\\ash
cd apps-script
clasp login
clasp run --function validateConfig
clasp run --function healthCheck
\\\

### Cloudflare Workers
\\\ash
cd workers/gateway
npm test
npm run dev  # Local dev server (http://localhost:8787)
\\\

---

##  Documentation

For detailed information, see the [docs/](./docs/) folder:

- [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - System design & data flow
- [**DEPLOYMENT_GUIDE.md**](./docs/DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [**QUICK_REFERENCE.md**](./docs/QUICK_REFERENCE.md) - Quick lookup
- [**GAS_README.md**](./docs/GAS_README.md) - Google Apps Script details

---

##  Secrets Management

**Never commit secrets!** This project uses:

1. **GitHub Secrets** - For CI/CD workflows
2. **Google Script Properties** - For GAS runtime
3. **Cloudflare Secrets** - For Workers runtime

See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for setup instructions.

---

##  Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Branch naming conventions
- Commit message standards
- Pull request workflow
- Code style guidelines

---

##  Workflow

1. Create feature branch: \git checkout -b feature/your-feature\
2. Make changes and test
3. Commit: \git commit -m "feat(scope): description"\
4. Push: \git push origin feature/your-feature\
5. Create Pull Request on GitHub
6. Wait for CI checks to pass
7. Merge when approved

---

##  Project Status

| Component | Status | Last Updated |
|-----------|--------|--------------|
| GAS Backend |  Active | Oct 2025 |
| Gateway Worker |  Active | Oct 2025 |
| Bot Worker |  Active | Oct 2025 |
| CI/CD |  Active | Nov 2025 |

---

##  Support

-  Check [docs/](./docs/) folder
-  Open an issue on GitHub
-  Contact maintainers

---

##  License

MIT License - see LICENSE file for details

---

**Happy coding! **

