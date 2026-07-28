# Deploy Frontend to Vercel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this plan) to execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Note: this plan involves interactive CLI authentication (`vercel login`) that cannot be delegated to a subagent — see Execution Note below.

**Goal:** Get `apps/frontend` live on a Vercel preview URL, as an independent Vercel project within this pnpm monorepo, with no code changes.

**Architecture:** One Vercel project with Root Directory set to `apps/frontend`. Vercel auto-detects the pnpm workspace at repo root and the Next.js framework preset inside `apps/frontend`. `NEXT_PUBLIC_API_URL` is set to a documented placeholder until the backend has a real deployed URL.

**Tech Stack:** Vercel CLI, Next.js 14 (already configured — see `apps/frontend/next.config.mjs`), pnpm workspaces.

## Global Constraints

- No code changes unless the preview build fails for a monorepo-structure reason (per design spec's error-handling section) — if that happens, stop and report the exact error before touching any file.
- Never promote to production (`vercel --prod`) without an explicit "yes" from the user, per the design spec.
- `NEXT_PUBLIC_API_URL` placeholder value must be obviously fake/documented, not a real-looking URL, so nobody mistakes it for a working backend.
- Uncommitted changes must be checked (`git status --porcelain`) before deploying — this repo currently sits on branch `feat/1-test-issue`; deploying reflects the last commit on whatever branch is checked out, and Vercel's Git integration (if connected) tracks that branch, so confirm which branch is checked out before deploying if this matters to the user.

## Execution Note

Steps 1-2 below require an interactive `vercel login` (device/browser auth flow) that only the user present in this session can complete — this cannot be dispatched to a subagent. Execute this plan inline, in the current session, not via subagent-driven-development.

---

### Task 1: Link and deploy apps/frontend to Vercel

**Files:**
- None created or modified by this task under normal conditions (a `.vercel/project.json` is created by the `vercel link` command itself, in `apps/frontend/.vercel/`, and is gitignored by Vercel's own tooling by default).

**Interfaces:**
- Consumes: nothing from prior work — this is the first and only task.
- Produces: a live Vercel preview URL, verified READY, for later phases (backend deploy design) to reference.

- [ ] **Step 1: Confirm Vercel CLI is installed**

Run: `which vercel`
Expected: a path is printed. If not found, run: `npm i -g vercel`, then re-check.

- [ ] **Step 2: Log in to Vercel (interactive)**

Run: `vercel login`
Expected: CLI prompts for an email or opens a browser for auth. Complete the flow. On success, CLI prints "Success! ... authenticated."

- [ ] **Step 3: Check for uncommitted changes before deploying**

Run: `git status --porcelain`
Expected: empty output. If non-empty, stop and report the changed files — ask whether to proceed anyway (deploy will use the last commit, not the working tree) or commit first.

- [ ] **Step 4: Link the frontend app as its own Vercel project**

Run (from repo root):
```bash
cd apps/frontend
vercel link
```
When prompted:
- "Set up and deploy?" → Yes
- "Which scope?" → user's account/team (whichever they choose)
- "Link to existing project?" → No (unless the user says they already created one)
- "What's your project's name?" → accept default or let user name it (e.g. `job-application-tracker-frontend`)
- "In which directory is your code located?" → `./` (since we already `cd`'d into `apps/frontend`)

Expected: `.vercel/project.json` is created inside `apps/frontend/`. CLI prints the linked project name/URL.

- [ ] **Step 5: Set the placeholder environment variable**

Run:
```bash
vercel env add NEXT_PUBLIC_API_URL preview
```
When prompted for the value, enter:
```
https://backend-not-deployed-yet.invalid/api
```
Expected: CLI confirms the env var was added for the `preview` environment.

- [ ] **Step 6: Deploy a preview build**

Run (still inside `apps/frontend`):
```bash
vercel
```
Expected: build logs stream, ending with a `.vercel.app` preview URL printed. Capture this URL for the next step.

- [ ] **Step 7: Verify the deployment**

Run:
```bash
vercel inspect <preview-url>
```
Expected: state `READY`, framework detected as `nextjs`, a build duration is shown.

If state is `ERROR` instead:
```bash
vercel logs <preview-url>
```
Report the last 50 lines, highlighting any line containing `error`, `Error`, `ERR!`, or `FATAL`. Do not proceed to Step 8 until the cause is understood and either fixed or explicitly accepted as a known limitation by the user.

- [ ] **Step 8: Record the result and stop — do not promote to production**

Report to the user:
```
## Deploy Result
- URL: <preview-url>
- Target: preview
- Status: READY
- Framework: nextjs
```
Ask explicitly: "Preview is live at <preview-url>. Promote to production with `vercel --prod`?" Wait for an explicit yes before running that command. If the user says yes, run `vercel --prod` from `apps/frontend` and repeat Step 7's verification against the new production URL.

---

## Self-Review Notes

- **Spec coverage:** design spec's 6 implementation steps (CLI install, link, env var, preview deploy, verify, hold-for-confirmation before prod) map 1:1 to Steps 1, 4, 5, 6, 7, 8 above; the spec's error-handling section (uncommitted changes, monorepo build failure, missing env var) is covered by Steps 3 and 7's branching instructions.
- **No placeholders:** every step has the literal command to run and the literal expected output — no "add appropriate config" language.
- **Type/interface consistency:** N/A — this plan has one task and produces no code artifacts other than Vercel platform state (project link + env var + deployment).
