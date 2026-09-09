# 🔗 GitHub Connection Kit — Comparely + StackCompare

This kit contains everything you need to get both sites onto GitHub and have an AI
agent (Claude Code, GitHub Copilot, Cursor, Gemini CLI…) push the program directly
into a repo branch.

---

## Step 1 — Download the code

Download **`compare-sites.zip`** from the workspace. It contains:

```
compare-site/    → Comparely (general comparison site, port 3000)
stackcompare/    → StackCompare (dev-tools comparison site, port 3001)
```

Both are **zero-dependency Node.js 18+ apps** — no `node_modules`, no build step.

---

## Step 2 — Create the GitHub repo

1. Go to github.com → **New repository**
2. Name it (e.g. `compare-sites`), make it **Public or Private** as you like
3. **Do NOT** initialize it with a README/.gitignore (keep it empty)

Now choose your upload path:

### Path A — GitHub web upload (simplest, no terminal needed)
1. Extract `compare-sites.zip` on your computer
2. On the repo page, click **Add file → Upload files** and **drag in BOTH folders** (GitHub supports folder drag-and-drop; 28 files upload fine)
3. Commit directly to `main`

### Path B — Terminal
```bash
unzip compare-sites.zip -d ~/repos
cd ~/repos
git init compare-sites && cd compare-sites
git remote add origin https://github.com/YOUR_USERNAME/compare-sites.git
git add -A && git commit -m "Initial upload: Comparely + StackCompare"
git branch -M main && git push -u origin main
```

---

## Step 3 — Run this prompt in your AI agent

Once the code is on `main` (or the agent has the folder locally), paste the prompt
below into **any agent with repo/terminal access** (Claude Code, Cursor, GitHub
Copilot coding agent, Gemini CLI…):

---

### 📋 PROMPT TO PASTE (copy everything between the lines)

```text
You have access to the GitHub repository "compare-sites" and a terminal. It
contains two zero-dependency Node.js 18+ websites in the folders `compare-site/`
(Comparely — runs on port 3000) and `stackcompare/` (StackCompare — runs with
PORT=3001). Treat the existing code as the source of truth: preserve it exactly.
Do NOT add npm dependencies, frameworks, or build steps.

Complete these tasks:

1. Create a new branch named `feature/initial-upload` from the default branch
   and switch to it.

2. Add a `.gitignore` at the repo root containing at least:
   node_modules/, .env, .env.*, .DS_Store, *.log, .idea/, .vscode/

3. Verify both apps run. Start them in the background, run these smoke tests,
   and fix anything that is broken:
   - `cd compare-site && node server.js` → `curl -s localhost:3000/api/templates`
     must return JSON with 11 templates, HTTP 200.
   - `cd stackcompare && PORT=3001 node server.js` →
     `curl -s localhost:3001/api/templates` must return JSON with 8 templates,
     HTTP 200.
   - POST a compare request to each: send
     `{"template":"phones","items":[{"id":"a","name":"A","specs":{"price":100,"ram":4}},{"id":"b","name":"B","specs":{"price":90,"ram":8}}]}`
     to localhost:3000/api/compare and expect HTTP 200 with a `winners` array.
   - Stop both servers when done.

4. Add a GitHub Actions CI workflow at `.github/workflows/ci.yml` that, on
   push and on pull_request, checks out the repo, sets up Node 20, and runs
   `node --check` on every .js file in both projects (find -name "*.js"). Make
   it fail the build if any file has a syntax error.

5. Create (or update) the root `README.md` with: a short description of both
   sites, how to run each locally (compare-site: `npm start`, stackcompare:
   `npm start` with optional PORT env), and links to their own READMEs.

6. Commit all changes to the branch with clear commit messages
   (e.g. "chore: add gitignore and CI", "docs: root readme").

7. Push the branch to origin and open a pull request titled
   "Initial upload: Comparely + StackCompare" with a summary of what the two
   apps do and the CI checks added.

8. Report back: the branch name, the PR URL, and the CI status.
```

---

### If you use GitHub Copilot coding agent (in-browser, no terminal)

Copilot can't run servers, so use this shorter prompt **after** the code is on
`main` (Step 2, Path A):

```text
Create a branch `feature/initial-upload` from main and make these changes on it:
1. Add a `.gitignore` (node_modules/, .env, *.log, .DS_Store).
2. Add `.github/workflows/ci.yml`: Node 20, on push/PR, run `node --check` on all
   .js files in compare-site/ and stackcompare/.
3. Add a root README.md describing both apps and how to run them locally.
4. Open a pull request from the branch to main titled
   "Initial upload: Comparely + StackCompare".
Do not modify any application code in compare-site/ or stackcompare/.
```

---

## Optional: connect your local copy for future edits

```bash
git clone https://github.com/YOUR_USERNAME/compare-sites.git
# ...edit files...
git add -A && git commit -m "feat: ..." && git push
```

Then you can also point an agent at the cloned folder and ask for changes
(e.g. "add a category", "update catalog prices") — it will commit and push to a
branch automatically.
