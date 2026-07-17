# Security Policy

## 🔒 Reporting a Vulnerability

We take the security of **AI Resume Analyzer** seriously. If you discover a security
vulnerability, please help us keep the project safe by reporting it **privately**.

**Please do NOT open a public GitHub issue for security vulnerabilities.**

### How to report

- Use GitHub **Security Advisories**: go to the repository's
  [Security → Report a vulnerability](https://github.com/Muskankr/AI-Resume-Analyzer/security/advisories/new)
  tab and submit a private report, **or**
- Email the maintainer at **muskankumari2004@gmail.com** with the subject
  `Security Vulnerability — AI Resume Analyzer`.

Please include as much of the following as possible:

- A clear description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept is appreciated)
- Affected versions or commit ranges
- Any suggested mitigation or fix

### What to expect

- **Acknowledgement** within **72 hours** of your report.
- **Status updates** at least every **7 days** while the issue is investigated.
- Coordination with you on a **disclosure timeline** once a fix is ready.
- Public credit (with your permission) after the vulnerability is resolved.

## 🛡️ Supported Versions

We provide security fixes for the latest release on the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| Older   | :x:                |

## 🔐 Security Best Practices (for contributors)

- Never commit secrets, API keys, or credentials. Use `.env` (already git-ignored)
  and `.env.example` for placeholders.
- Keep dependencies up to date and review `requirements.txt` / `package.json` changes.
- Validate and sanitize all user-supplied input, especially the resume upload endpoint.

Thank you for helping keep AI Resume Analyzer secure! 💙
