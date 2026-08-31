# Semantic Versioning (SemVer) Process

To ensure our user-facing version numbers (e.g., `v2.4.0`) remain meaningful, predictable, and structurally stable, all maintainers must adhere strictly to the **Semantic Versioning 2.0.0** standard.

### 1. The Versioning Formula
Given a version format of **`vMAJOR.MINOR.PATCH`**, increment the tokens based on the following structural criteria:

*   **`MAJOR` version:** Incremented when you introduce **breaking API changes**, structural database schema overhauls, or backward-incompatible UI restructures.
*   **`MINOR` version:** Incremented when you add **new, backward-compatible features** (e.g., introducing a new analytics panel, adding a quick-paste clipboard utility).
*   **`PATCH` version:** Incremented when you commit **backward-compatible bug fixes**, hotpatches, security updates, or performance optimizations.

### 2. The Release Protocol (Crucial Checklist)
When staging a new version bump, the following files **must be updated simultaneously within the same release commit**:

1.  **`CHANGELOG.md`:** Document all modifications under explicit, standardized headers: `### Added`, `### Changed`, `### Fixed`, or `### Removed`. Assign the precise release date next to the new version header.
2.  **Footer Version Tracker (`package.json` / UI Config):** Update the core version tracking key (e.g., inside `package.json` or your targeted configuration layer). This value directly drives the live user-facing footer text string.

```json
{
  "name": "ats-core-engine",
  "version": "2.5.0",
  "description": "Enterprise resume processing engine"
}
```

### 3. Git Release Tagging Mechanics
Once the documentation and configuration files are committed to the release branch, freeze the checkpoint using an explicit annotated Git tag before merging to production:

```bash
git tag -a v2.5.0 -m "Release version 2.5.0 containing optimized analytics modules"
git push origin v2.5.0
```
