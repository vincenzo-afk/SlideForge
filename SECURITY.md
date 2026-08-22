# Security Policy

## Reporting a vulnerability

Do **not** open a public issue to report a security problem. Instead, contact the maintainer directly:

- **Email:** itsmebk2007@gmail.com
- **GitHub:** [Private vulnerability reporting](https://github.com/vincenzo-afk/SlideForge/security/advisories) (when available)

You will receive an acknowledgment within 48 hours and a resolution plan as soon as the issue is triaged.

## Supported versions

| Version | Supported |
|---|---|
| 1.x (current `main`) | ✅ Supported |
| Older releases | ❌ Unsupported |

## Security model

SlideForge is a fully static, client-side application with no backend, no database, and no user accounts. Its attack surface is intentionally minimal, and three deliberate design decisions define its security posture:

1. **No server.** All decks are stored in the visitor's own browser via `localStorage`. No user data is ever transmitted to a server owned by this project.
2. **No third-party runtime dependencies.** The PPTX exporter is hand-written OOXML/ZIP code; there is no library supply chain to compromise.
3. **Input sanitization everywhere.** All user input and AI-generated content is HTML-escaped before DOM insertion and XML-escaped before export, preventing injection in both paths.

## API keys

For zero-backend simplicity, the AI API key is configured directly in [`js/config.js`](js/config.js). This is a conscious trade-off documented in the README. Recommendations:

- Use a **scoped or free-tier key** (e.g., Gemini free tier) rather than a key with broad permissions.
- If the deployment is public, consider placing a **small proxy** in front of the AI endpoint so the key is not shipped to clients.
- **Rotate the key immediately** if it is accidentally exposed.

## Dependency policy

The project has zero runtime dependencies. The only external network requests made by the app are to the AI API endpoints configured in `js/config.js` (default: `generativelanguage.googleapis.com`). The GitHub Pages hosting itself is served by GitHub.
