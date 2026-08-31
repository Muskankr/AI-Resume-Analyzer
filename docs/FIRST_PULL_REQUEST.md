# Your First Pull Request Ever 🚀

Never opened a pull request before? You're in the right place. This guide walks you
through contributing to **AI Resume Analyzer** from scratch — no prior Git or GitHub
experience needed. We'll go from zero to your first merged pull request (PR),
one command at a time.

> A **pull request** is how you propose changes to a project. You copy the project,
> make your change, and ask the maintainers to "pull" it in.

---

## What you need first

1. **A GitHub account** — sign up free at <https://github.com/join>.
2. **Git installed** on your computer. Check by running:

   ```bash
   git --version
   ```

   If you see a version number (e.g. `git version 2.39.0`), you're set. If not,
   install it from <https://git-scm.com/downloads>.

3. **Tell Git who you are** (only needed once, ever):

   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your-email@example.com"
   ```

---

## Step 1 — Fork the repository

A **fork** is your own personal copy of the project on GitHub.

1. Go to <https://github.com/Muskankr/AI-Resume-Analyzer>.
2. Click the **Fork** button in the top-right corner.
3. GitHub creates a copy under your account, e.g.
   `https://github.com/YOUR-USERNAME/AI-Resume-Analyzer`.

---

## Step 2 — Clone your fork

**Cloning** downloads your fork to your computer so you can work on it.

Replace `YOUR-USERNAME` with your actual GitHub username:

```bash
git clone https://github.com/YOUR-USERNAME/AI-Resume-Analyzer.git
```

Then move into the project folder:

```bash
cd AI-Resume-Analyzer
```

---

## Step 3 — Create a branch

A **branch** keeps your work separate from the main code. Always make a new branch
for each change.

```bash
git checkout -b fix/my-first-change
```

- `git checkout -b` creates and switches to a new branch.
- `fix/my-first-change` is the branch name — pick something that describes your work,
  such as `docs/fix-typo` or `feature/add-dark-mode`.

Confirm you're on your new branch:

```bash
git branch
```

The branch with a `*` next to it is the one you're on.

---

## Step 4 — Make your change

Open the project in your code editor and make your edit. Not sure what to work on?
Look for issues labeled **`good first issue`** — they're chosen to be beginner-friendly:

<https://github.com/Muskankr/AI-Resume-Analyzer/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22>

To comment `/assign-me` on an issue claims it for you (see
[CONTRIBUTING.md](../CONTRIBUTING.md)).

See exactly what you changed at any time:

```bash
git status        # lists changed files
git diff          # shows the actual changes
```

---

## Step 5 — Commit your change

A **commit** is a saved snapshot of your work with a short message describing it.

```bash
# Stage the files you changed (a dot "." stages everything)
git add .

# Save them with a clear message
git commit -m "docs: fix typo in README"
```

> Tip: keep messages short and descriptive. Common prefixes are `fix:`, `feat:`
> (new feature), and `docs:` (documentation).

---

## Step 6 — Push your branch

**Pushing** uploads your branch and commits to your fork on GitHub.

```bash
git push -u origin fix/my-first-change
```

(Use the same branch name you created in Step 3.)

---

## Step 7 — Open the pull request

1. Go to your fork on GitHub: `https://github.com/YOUR-USERNAME/AI-Resume-Analyzer`.
2. You'll see a banner: **"Compare & pull request"** — click it.
   (If you don't, click the **Pull requests** tab → **New pull request**.)
3. Make sure the base repository is `Muskankr/AI-Resume-Analyzer` and the base
   branch is `main`.
4. Write a clear **title** and **description** of what you changed and why.
5. If your change addresses an issue, link it by writing `Closes #<issue-number>`
   in the description.
6. Click **Create pull request**. 🎉

That's it — you've opened your first pull request!

---

## Step 8 — Respond to review

A maintainer may review your PR and ask for changes. That's normal and part of the
process. To update your PR, just make more commits on the same branch and push again:

```bash
git add .
git commit -m "address review feedback"
git push
```

Your PR updates automatically — no need to open a new one.

---

## Common questions

**I made a mistake — how do I undo uncommitted changes to a file?**

```bash
git checkout -- path/to/file
```

**How do I switch back to the main branch?**

```bash
git checkout main
```

**My fork is behind the original project. How do I update it?**

```bash
# Add the original project as a remote called "upstream" (only needed once)
git remote add upstream https://github.com/Muskankr/AI-Resume-Analyzer.git

# Fetch and merge the latest main
git checkout main
git pull upstream main
```

---

## Next steps

- Read the full [Contributing Guide](../CONTRIBUTING.md) for project conventions.
- Follow the [Code of Conduct](../CODE_OF_CONDUCT.md).
- Set up the project locally using the instructions in the [README](../README.md).

Welcome aboard, and happy contributing! 💜
