# Security Policy

## Supported Versions

| Version | Supported | Status |
|---------|-----------|--------|
| 2.x |  | Current |
| 1.x |  | Legacy |
| < 1.0 |  | Unsupported |

## Reporting a Vulnerability

**DO NOT** create a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email us directly:**
   - Email: security@papamica-gateway.com
   - Subject: \[SECURITY] Vulnerability Description\

2. **Include in your report:**
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

3. **Timeline:**
   - We will acknowledge receipt within 48 hours
   - We will provide updates within 7 days
   - We aim to release a patch within 30 days

### Example Report

Subject: [SECURITY] Webhook signature verification bypass

Body:
\\\
Description:
The webhook signature verification in LineAPI.gs doesn't properly validate
HMAC signatures, allowing unauthorized requests to be processed.

Steps to Reproduce:
1. Send POST request to /webhook without valid signature
2. Request is processed despite invalid signature

Potential Impact:
- Unauthorized users can send messages as the bot
- Confidential conversations may be intercepted

Suggested Fix:
Use constantTimeCompare() for HMAC validation instead of simple string comparison
\\\

---

## Security Best Practices

### For Users

1. **Keep Secrets Safe**
   - Never commit .env, secrets, or tokens
   - Use GitHub Secrets for CI/CD
   - Rotate tokens regularly

2. **Verify Webhook Signatures**
   - Always verify LINE webhook signatures
   - Check X-Line-Signature header

3. **Use HTTPS Only**
   - All communications must be HTTPS
   - Cloudflare Workers enforces this

4. **Regular Updates**
   - Keep dependencies up-to-date
   - Monitor for security advisories

### For Developers

1. **Code Review**
   - All PRs must be reviewed
   - Security-sensitive code needs extra review

2. **Dependency Management**
   `แcd d:\papamica-gateway

@"
# Security Policy

## Supported Versions

| Version | Supported | Status |
|---------|-----------|--------|
| 2.x |  | Current |
| 1.x |  | Legacy |
| < 1.0 |  | Unsupported |

## Reporting a Vulnerability

**DO NOT** create a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email us directly:**
   - Email: security@papamica-gateway.com
   - Subject: [SECURITY] Vulnerability Description

2. **Include in your report:**
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

3. **Timeline:**
   - We will acknowledge receipt within 48 hours
   - We will provide updates within 7 days
   - We aim to release a patch within 30 days

## Security Best Practices

### For Users

1. **Keep Secrets Safe**
   - Never commit .env, secrets, or tokens
   - Use GitHub Secrets for CI/CD
   - Rotate tokens regularly

2. **Verify Webhook Signatures**
   - Always verify LINE webhook signatures
   - Check X-Line-Signature header

3. **Use HTTPS Only**
   - All communications must be HTTPS

4. **Regular Updates**
   - Keep dependencies up-to-date
   - Monitor for security advisories

## Dependency Security

Check for vulnerabilities:
\\\ash
cd workers/gateway
npm audit
npm audit fix
\\\

## Common Vulnerabilities

### 1. Hardcoded Secrets
 Bad: const TOKEN = 'U1234567890abcdef1234567890abcdef';
 Good: const TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');

### 2. Missing Signature Verification
Always verify webhook signatures before processing.

### 3. Input Validation
Validate all user inputs and sanitize strings.

## Security Checklist for New Features

- [ ] No hardcoded secrets or tokens
- [ ] All user inputs are validated
- [ ] Sensitive data is not logged
- [ ] External API calls use HTTPS only
- [ ] Error messages don't expose internal details
- [ ] Rate limiting is implemented (if applicable)
- [ ] Dependencies are up-to-date
- [ ] Code has been reviewed for security
- [ ] Tests include security test cases

## Report Security Issues

Email: security@papamica-gateway.com

Thank you for helping keep Papamica Gateway secure! 
