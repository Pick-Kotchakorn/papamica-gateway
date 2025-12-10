# Contributing to Papamica Gateway

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Git Workflow](#git-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Commit Convention](#commit-convention)

---

## Prerequisites

Before you start, ensure you have:
- **Node.js 18+**  [Download](https://nodejs.org/)
- **Git**  [Download](https://git-scm.com/)
- **Google Account**  For Google Apps Script
- **Cloudflare Account**  For Workers deployment
- **clasp CLI**  \
pm install -g @google/clasp\

---

## Getting Started

### 1. Clone Repository

\\\ash
git clone https://github.com/Pick-Kotchakorn/papamica-gateway.git
cd papamica-gateway
\\\

### 2. Install Dependencies

\\\ash
# Install clasp globally
npm install -g @google/clasp

# Install Workers dependencies
cd workers/gateway
npm install
cd ../main-bot
npm install
cd ../..
\\\

### 3. Setup Environment

\\\ash
# Create .env file (NEVER commit this!)
cp .env.example .env

# Edit .env with your secrets:
# LINE_CHANNEL_ACCESS_TOKEN=your_token
# LINE_CHANNEL_SECRET=your_secret
# GAS_DEPLOY_ID=your_deploy_id
# CLOUDFLARE_API_TOKEN=your_token
\\\

---

## Development Setup

### Google Apps Script (GAS)

\\\ash
cd apps-script

# Login to Google Account
clasp login

# Pull latest code
clasp pull

# View project ID
cat .clasp.json
\\\

### Cloudflare Workers

\\\ash
cd workers/gateway

# Install dependencies
npm install

# Test locally
npm run dev

# Deploy (after testing)
npm run deploy
\\\

---

## Git Workflow

### Branch Naming Convention

\\\
main               Production (protected)
develop            Development
feature/*          New features (feature/user-authentication)
fix/*              Bug fixes (fix/webhook-signature-error)
docs/*             Documentation (docs/update-readme)
refactor/*         Code improvements (refactor/optimize-sheets)
test/*             Test additions (test/add-gas-unit-tests)
chore/*            Maintenance tasks (chore/update-deps)
\\\

### Workflow Steps

**1. Create Feature Branch**
\\\ash
git checkout -b feature/your-feature-name
\\\

**2. Make Changes**
- Edit files in your branch
- Test locally (see Testing section)
- Commit frequently with clear messages

**3. Push to Origin**
\\\ash
git push origin feature/your-feature-name
\\\

**4. Create Pull Request**
- Go to GitHub and create PR
- Link related issues: Fixes #123
- Fill out PR template (description, testing, etc.)
- Request reviewers

**5. Code Review**
- Address feedback from reviewers
- Push updates (do NOT force push)
- Re-request review when ready

**6. Merge**
- Maintainer merges to develop/main
- Delete branch after merge

---

## Code Style

### Google Apps Script (GAS)

**Naming Convention:**
\\\javascript
// Functions: camelCase
function getUserProfile(userId) { }

// Constants: UPPER_CASE
const LINE_CONFIG = { };
const SHEET_IDS = { };

// Private functions: _camelCase prefix
function _helperFunction() { }
\\\

**Comments & Documentation:**
\\\javascript
/**
 * Save conversation to Google Sheets
 * @param {Object} data - Conversation data object
 * @param {string} data.userId - User unique ID
 * @param {string} data.userMessage - User's message
 * @param {string} data.botResponse - Bot's response
 * @param {number} data.timestamp - Unix timestamp
 * @return {boolean} True if saved successfully
 * @throws {Error} If save fails
 */
function saveConversation(data) {
  // Implementation
  return true;
}
\\\

**Error Handling:**
\\\javascript
function risky Function() {
  try {
    // Your code
  } catch (error) {
    logWithTimestamp('Error in riskFunction: ' + error.message, 'ERROR');
    throw new Error('Failed to process: ' + error.message);
  }
}
\\\

### Cloudflare Workers

**Use ES6 Modules:**
\\\javascript
// Prefer named exports
export async function handleRequest(request) {
  // Implementation
}

// Arrow functions for clarity
const verifySignature = (signature, body, secret) => {
  // Implementation
};

// Consistent formatting
const config = {
  timeout: 5000,
  retries: 3,
  debug: false
};
\\\

---

## Testing

### Google Apps Script Tests

**Run Individual Tests:**
\\\ash
cd apps-script
clasp login

# Test configuration
clasp run --function testConfiguration

# Test LINE API
clasp run --function testLineAPI

# Test Sheet Service
clasp run --function testSheetService

# Test all systems
clasp run --function healthCheck
\\\

**View Logs:**
- Google Apps Script editor  Executions tab
- View error logs and execution times

### Cloudflare Workers Tests

\\\ash
cd workers/gateway

# Run tests
npm test

# Run locally (watch mode)
npm run dev

# Check for errors
npm run lint
\\\

### Manual Testing

**Test Webhook with curl:**
\\\ash
# Get your endpoint URL (from docs/WORKER_URLS.md)
ENDPOINT="https://your-worker.workers.dev"

# Send test message
curl -X POST \ \\
  -H "Content-Type: application/json" \\
  -H "X-Line-Signature: YOUR_SIGNATURE" \\
  -d '{
    "events": [{
      "type": "message",
      "message": { "type": "text", "text": "Hello" },
      "userId": "U12345"
    }]
  }'
\\\

---

## Submitting Changes

### Before Submitting PR

**Checklist:**
-  Branch is up-to-date with main
-  All tests pass locally
-  No console errors or warnings
-  Code follows style guide
-  Documentation updated (if applicable)
-  No secrets committed (.env, tokens, etc.)
-  Commit messages follow convention

**Check for secrets:**
\\\ash
# Search for common secret patterns
git diff HEAD~1 | grep -i "token\|secret\|password\|api_key"
\\\

### PR Template

Use this template when creating PR:

\\\markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Code refactoring

## Related Issue
Fixes #123

## Testing
How was this tested?
- [ ] Unit tests added
- [ ] Manual testing done
- [ ] Works on: (device/browser)

## Screenshots (if UI changes)
(Add screenshots if applicable)

## Checklist
- [ ] Code follows style guide
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes
\\\

---

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

\\\
<type>(<scope>): <subject>

<body>

<footer>
\\\

### Types

- **feat**  New feature
- **fix**  Bug fix
- **docs**  Documentation only
- **style**  Code style changes (formatting, missing semicolons, etc.)
- **refactor**  Code refactoring without changing functionality
- **perf**  Performance improvements
- **test**  Adding or updating tests
- **chore**  Maintenance tasks, dependencies

### Scope (Optional)

- messaging
- sheets
- followers
- analytics
- workers
- gas
- docs

### Examples

\\\ash
git commit -m "feat(messaging): add support for rich menu responses"
git commit -m "fix(sheets): resolve duplicate row insertion issue"
git commit -m "docs(setup): update installation guide"
git commit -m "refactor(utils): simplify retry logic"
git commit -m "test(lineapi): add unit tests for message validation"
git commit -m "chore: update dependencies to latest versions"
\\\

### Detailed Commit

\\\
feat(messaging): add support for rich menu responses

This change enables the bot to send rich menu messages with
interactive buttons. Users can now select actions from menus.

- Add richMenuId parameter to LineAPI.pushMessages()
- Update EventHandler to process rich menu postbacks
- Add RichMenuService for managing rich menus
- Add test cases in InsightService tests

Fixes #456
Breaking change: None
\\\

---

## Common Issues & Solutions

### Issue: \clasp login\ fails

\\\ash
# Solution: Clear cache and retry
clasp logout
clasp login
\\\

### Issue: Workers deploy fails

\\\ash
# Check Cloudflare credentials
npm run deploy

# If still fails, check wrangler config:
cat wrangler.jsonc
\\\

### Issue: Sheet not updating

\\\ash
# Run health check
clasp run --function healthCheck

# Check logs in GAS editor
# Verify sheet permissions
\\\

---

## Need Help?

- Check [README.md](./README.md) for overview
- See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for setup
- Review [GAS_README.md](./docs/GAS_README.md) for GAS details
- Open GitHub Issue for bugs
- Start GitHub Discussion for questions

---

## Code of Conduct

Please be respectful, inclusive, and constructive.
Harassment or discriminatory behavior will not be tolerated.

---

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- GitHub Contributors page
- Project README (for significant contributions)

---

**Thank you for contributing to Papamica Gateway!** 

Questions? Open an Issue or Discussion!
