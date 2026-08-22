# Contributing to SlideForge

Thank you for considering a contribution! SlideForge's core promise is **zero frameworks, zero build tools, zero dependencies**. All contributions must preserve that promise.

## How to contribute

1. **Fork** the repository and clone your fork.
2. Create a topic branch with a clear prefix:

   ```bash
   git checkout -b feature/your-feature
   git checkout -b fix/your-fix
   git checkout -b docs/your-docs
   ```

3. Make your changes.
4. Run the test suite and confirm everything passes:

   ```bash
   node test/run_headless.js
   ```

5. Open `index.html` in a browser and verify the change visually.
6. Push your branch and open a **pull request** against `main`.

## Core rules

- **No npm, no package.json, no build step.** Everything ships as plain files served as-is.
- **No CDN scripts or external stylesheets.** Only `js/config.js` holds third-party endpoints (the AI API).
- **No ES modules.** Modules use the IIFE pattern (`var SlideForgeX = ...`) so files can be loaded with plain `<script>` tags in order.
- **One source of configuration.** App-wide constants and API keys live only in `js/config.js`.
- **Escape everything.** User and AI text must be HTML-escaped on render and XML-escaped on export.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add theme gallery
fix: escape XML entities in PPTX bullets
docs: update deployment section
test: add PPTX structural validation
```

## Pull requests

- Describe **what** changed and **why**.
- Link any related issue.
- UI changes should include before/after screenshots.
- Keep each PR focused on a single concern.

## Reporting security issues

Please do not open public issues for vulnerabilities. Email **itsmebk2007@gmail.com** instead. See [SECURITY.md](SECURITY.md).

## Code of conduct

Be respectful, constructive, and kind. Harassment and spam will not be tolerated.
