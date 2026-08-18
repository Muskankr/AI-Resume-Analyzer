# Contributing to AI Resume Analyzer

Thank you for your interest in contributing to **AI Resume Analyzer**! 🎉

We appreciate every contribution, whether it's fixing bugs, improving documentation, enhancing the UI, or adding new features.

Please read this guide before contributing.

---

# Table of Contents

- Code of Conduct
- Ways to Contribute
- Getting Started
- Project Structure
- Development Workflow
- Branch Naming Convention
- Commit Message Guidelines
- Coding Standards
- Reporting Issues
- Pull Request Process
- Contributor Checklist
- Need Help?

---

# Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

We are committed to providing a welcoming and respectful environment for everyone.

---

# Ways to Contribute

You can contribute by:

- Fixing bugs
- Adding new features
- Improving UI/UX
- Optimizing performance
- Improving accessibility
- Writing documentation
- Refactoring code
- Improving tests

---

# Getting Started

## 1. Fork the repository

Click the **Fork** button on GitHub.

---

## 2. Clone your fork

```bash
git clone https://github.com/<your-username>/AI-Resume-Analyzer.git
```

---

## 3. Navigate into the project

```bash
cd AI-Resume-Analyzer
```

---

## 4. Follow the installation instructions

Please follow the setup instructions already documented in the project's README.

Install both:

- Backend dependencies
- Frontend dependencies

Then start the backend and frontend development servers.

---

# Project Structure

```
AI-Resume-Analyzer
│
├── backend/
│   ├── analyzer/
│   ├── requirements.txt
│   └── ...
│
├── client/
│   ├── src/
│   ├── public/
│   └── ...
│
├── README.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── CONTRIBUTING.md
```

---

# Development Workflow

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Test your changes.
5. Commit your work.
6. Push your branch.
7. Open a Pull Request.

---

## Cross-Browser Compatibility Testing

Before submitting UI-related changes, verify the application in the following major browsers:

- Chrome
- Firefox
- Safari
- Microsoft Edge

Pay particular attention to browser-sensitive functionality such as:

- Drag-and-drop interactions
- CSS animations and transitions
- Custom scrollbars
- Responsive layouts and interactive UI components

Record the browser and version used during testing and confirm that the affected functionality works as expected.

If a browser-specific issue is discovered, document it clearly and create a follow-up issue with the affected browser, feature, reproduction steps, and expected behavior.

Cross-browser verification should be completed as part of the QA process before opening a pull request for relevant UI changes.

---

# Project Board

Track development progress using our GitHub Project:

<Project URL>

_Project Columns to create:_

- _To Do_
- _In Progress_
- _In Review_
- _Done_

---

# Branch Naming Convention

Use meaningful branch names.

Examples:

```
feature/add-dark-mode

fix/navbar-overflow

docs/update-contributing-guide

refactor/auth-service

enhancement/improve-resume-score
```

---

# Commit Message Guidelines

Follow clear and descriptive commit messages.

Examples:

```
feat: add resume score visualization

fix: resolve login validation issue

docs: add contributing guide

style: improve button spacing

refactor: simplify parser logic
```

---

# Coding Standards

## Frontend

- Use meaningful component names.
- Prefer functional components.
- Keep components reusable.
- Avoid unnecessary re-renders.
- Write clean JSX.

## Backend

- Follow PEP 8 guidelines.
- Use descriptive function names.
- Keep business logic modular.
- Write reusable utilities.

## General

- Keep code readable.
- Remove unused imports.
- Remove commented-out code.
- Use consistent formatting.
- Write self-explanatory code.

---

# Reporting Issues

Before creating a new issue:

- Search existing issues first (see below for more details).
- Include clear steps to reproduce.
- Attach screenshots if applicable.
- Mention your operating system and browser when relevant.

## 🔍 Search Existing Issues First

Before opening a new issue, please take a moment to search the existing issues to see if your bug report, feature request, or question has already been discussed. This helps reduce duplicates and keeps issue discussions organized.

**Tip:** Use GitHub's issue search filters to narrow your results. For example:

```text
is:issue is:open label:bug login
```

This searches for open issues labeled `bug` containing the keyword `login`. You can replace `bug` and `login` with labels or keywords relevant to your issue.


---

# Pull Request Process

Before submitting a PR:

- Ensure the project builds successfully.
- Test your changes locally.
- Resolve merge conflicts.
- Keep the PR focused on one issue.
- Link the related issue.
- Update 'CHANGELOG.md' if you pull request introduces a notable feature, bug fix, enhancement, or other user-visible change.

### Updating the Changelog

This project follows the **Keep a Changelog** format.

When your pull request includes a notable change:

- Add a new entry under the **Unreleased** section in `CHANGELOG.md`.
- Use the appropriate category:
  - **Added** – New features or functionality.
  - **Changed** – Improvements or modifications to existing features.
  - **Fixed** – Bug fixes.
  - **Removed** – Removed or deprecated functionality.
- Keep entries concise and user-focused.
- When a new release is created, move entries from **Unreleased** into a versioned release section.

Example:

```
Closes #129
```

---

# Contributor Checklist

Before submitting your Pull Request, ensure that:

- Code builds successfully.
- No unnecessary files are included.
- Code follows project conventions.
- Documentation is updated if required.
- Issue is linked.
- Merge conflicts are resolved.
- Commit messages are meaningful.

## Before submitting a Pull Request

Run the following commands before opening a PR:

```bash
# Run linters and formatters
cd frontend
npm run lint
npm run format

# Run test suites with coverage check
npm run test:coverage
```

Make sure all commands complete successfully and coverage meets defined thresholds (Backend: 60%, Frontend: 50%).

- Ensure any UI changes have been verified against the [Theme QA Checklist](docs/THEME_QA_CHECKLIST.md).

---

# Need Help?

If you have questions, feel free to open a discussion or issue.

Happy Contributing! 🚀
