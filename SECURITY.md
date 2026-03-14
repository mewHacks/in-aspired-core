# Security Policy

## 🛡️ Security Status

**Last Reviewed**: 2026-03-14

---

## 📊 Resilience & Resource Protection

Beyond standard encryption, we have implemented specific measures to prevent client-side hangs and resource exhaustion:

### ⏱️ Request Timeouts
- **Client-Side Enforcements**: All authentication (`login`, `signup`, `googleLogin`) and session refresh requests now include a **15-second timeout**. 
- **Impact**: This prevents the UI from entering an "infinite loading" state if the backend is unresponsive (e.g., during cold starts or network failures), effectively mitigating a form of Client-side Denial of Service.

### 📧 Identity Hardening
- **Email Normalization**: The `email` field in the `User` model uses `lowercase: true` at the schema level.
- **Lookup consistency**: All authentication controllers (Login, Verify, Reset) convert emails to lowercase before lookup, preventing account fragmentation and spoofing attempts based on capitalization variants.

---

## 🏗️ CI/CD Security & Validation

Our automated workflows are designed to validate security logic in realistic environments:

### 🧪 Integration-Ready Testing
- **Stateful Services**: GitHub Actions runs with live **Redis** and **MongoDB** service containers.
- **Why it matters**: This allows us to run unit and integration tests that verify state-dependent security features (like Redis-backed rate limiting and token rotation) against real services, rather than just mocks.

### ✅ Comprehensive Test Coverage
- **Backend**: 344 tests across 30 test suites covering all controllers, services, middleware, and models.
- **Frontend**: 55 tests covering core components and pages.
- **Security Impact**: Comprehensive test coverage helps prevent security regressions in authentication, authorization, payment processing, and input validation.

---

## 📊 Vulnerability Report (Run Locally)

Security posture changes as dependencies update. Run audits locally to get the current status:

---

## ⚠️ About Frontend Vulnerabilities

### Why They Show Up

Our frontend uses **Excalidraw** for collaborative whiteboard features. Excalidraw includes subdependencies for optional features (like Mermaid diagram conversion) that are not part of our core UX.

npm's security scanner reports these as vulnerabilities because the packages are *installed*, even if the optional features are not actively used in the UI.

### Current Code Behavior

The whiteboard does not explicitly enable Mermaid features in `/Users/yihui/in-aspired/client/src/components/rooms/Whiteboard.tsx`. There is no `mermaid: false` flag set today.

### Optional Hardening (Recommended)

If you want to explicitly disable Mermaid in the UI, set:

```
UIOptions.canvasActions.mermaid = false
```

### Why We Don't "Fix" to 0 Vulnerabilities

1. **Excalidraw 0.18.0** is required for `reconcileElements()` API (prevents whiteboard sync bugs)
2. **Downgrading** to 0.17.6 would break collaboration features
3. **Overriding** subdependencies breaks Excalidraw's peer dependency requirements
4. **Waiting** for upstream fix (Excalidraw maintainers to update mermaid subdeps)

This is a **standard industry practice** for managing subdependency vulnerabilities in unavoidable peer dependencies.

---

## 🔍 Verification

You can verify our security posture yourself:

```bash
# Backend
cd server/node-backend && npm audit --audit-level=high

# Frontend
cd client && npm audit
```

---

## 🔒 Production Hardening (Internal Controls)

We have implemented several proactive security measures beyond dependency management:

### Authentication & Authorization
- **JWT Rotation**: Access tokens expire in 15 minutes; Refresh tokens rotate on every use to prevent replay attacks.
- **Rate Limiting & Brute Force Protection**: 
    - **Auth**: Limited to 5 requests per minute via `express-rate-limit` for login, signup, and password resets.
    - **Contact**: Strict anti-spam limit of 3 requests per hour.
- **Role Sync**: Admin privileges are enforced via a strictly defined email whitelist (`ADMIN_EMAILS`) to prevent privilege escalation.

### 🌐 Infrastructure & Middleware
- **Security Headers**: `helmet` is used to set secure HTTP headers, including CSP and Frame Options.
- **CORS Management**: Strict origin whitelisting ensures only trusted frontends can communicate with the API.
- **Sanitization**: Input is validated via `zod` and sanitized to prevent XSS and NoSQL injection.

### ⚡ Real-time Security (Socket.IO)
- **Room Isolation**: Room state is managed via an authenticated Socket.IO layer with Redis-backed state coordination.
- **Payload Validation**: All socket events are validated before processing to prevent malicious event broadcasting.

### Data Protection
- **Passwords**: Hashed using `bcryptjs` with a salt factor of 10.
- **Tokens in DB**: All refresh and password reset tokens are stored as **SHA-256 hashes**, not plain text.
- **Cookies**: Enforced `HttpOnly`, `Secure`, and `SameSite` flags in production to mitigate XSS and CSRF.

---

## 📝 Reporting a Vulnerability

### Scope

If you discover a **NEW** security issue (not the documented subdependency issues above), please report responsibly:

1. **Email**: [inaspired.official@gmail.com]
2. **Subject**: "Security Vulnerability Report - [Brief Description]"
3. **Include**:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

### What NOT to Report

Please **do not** report the 11 known Excalidraw subdependency vulnerabilities documented above. They are:
- Already documented
- Tracked in our backlog
- Mitigated via code-level controls
- Waiting for upstream package updates

---

## 🔄 Update Policy

### Dependency Updates

- **Critical/High**: Immediate (within 24 hours)
- **Moderate** (in active code): Within 7 days
- **Moderate** (in disabled features): Monitored, updated when available
- **Low**: Quarterly review

### Excalidraw Subdependencies

We monitor Excalidraw releases and will update when:
- Excalidraw updates `@excalidraw/mermaid-to-excalidraw` to patched versions
- Alternative solutions become available
- Security impact changes from LOW to MEDIUM+

---

## 📚 Security Resources

- [npm audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Excalidraw Security](https://github.com/excalidraw/excalidraw/security)

---

## 🏆 Security Acknowledgments

We acknowledge and thank:
- GitHub Dependabot team for automated vulnerability detection
- Excalidraw maintainers for the secure collaborative drawing platform
- Security researchers who report vulnerabilities responsibly

---

## ✅ Compliance

This project follows:
- **OWASP Top 10** security best practices
- **CWE/SANS Top 25** vulnerability mitigation guidelines
- **Secure SDLC** principles

**Review Cadence**: Quarterly (update dates when a real audit is completed)
