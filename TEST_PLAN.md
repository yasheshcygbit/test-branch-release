# Test Plan: Trunk-Based Release Strategy

**Purpose:** Validate the `dev` / `release/*` / `main` model end-to-end before adopting it in production repos. Every phase has a precise expected outcome — if any phase produces something different, stop and investigate before continuing.

**Setup expectations before starting:**

- `dev` is the default branch on GitHub.
- `main` and `dev` exist and point at the same initial commit.
- No prior tags exist on the repo.
- `npm install` has been run locally and `package-lock.json` is committed (so workflow `npm install` is reproducible).
- The repo has the secret `GITHUB_TOKEN` (or a PAT) with `contents: write` permission.

**Three simulated teams:** **blue**, **green**, **yellow**. Each team uses branches prefixed with their team name (`blue/feature/...`) and PR titles prefixed `[blue]`. A single human plays all three teams sequentially during this test; the prefixes exist so we can later see who-did-what in `git log`.

---

## Phase 0 — Verify starting state

```bash
git checkout dev && git pull
git tag --list                         # → empty (no tags yet)
cat package.json | grep '"version"'    # → "version": "0.0.0"
git log --oneline -5                   # → just the initial commit on dev
```

**Validation:**
- [ ] No tags exist.
- [ ] `package.json` version is `0.0.0`.
- [ ] `dev` and `main` point at the same SHA.

---

## Phase 1 — Three teams ship features to `dev` (alpha channel)

Each team opens a feature PR against `dev`. Each merged PR triggers `release-alpha.yml` and produces an alpha tag.

### 1.1 — blue ships first

```bash
git checkout dev && git pull
git checkout -b blue/feature/slugify

# Add a slugify function to src/string.ts (any change is fine — see snippet below)
cat >> src/string.ts <<'EOF'

export function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, '-');
}
EOF

git add src/string.ts
git commit -m "feat(string): add slugify helper"
git push -u origin blue/feature/slugify
gh pr create --base dev --title "[blue] feat(string): add slugify helper" --body "Adds slugify helper for URL-safe strings."
gh pr merge --squash --delete-branch
```

**Expected:** `release-alpha.yml` runs, publishes **`v1.0.0-alpha.1`**, commits `chore(release): 1.0.0-alpha.1 [skip ci]` to `dev`, `package.json` version → `1.0.0-alpha.1`.

### 1.2 — green ships second

```bash
git checkout dev && git pull
git checkout -b green/feature/multiply

cat >> src/math.ts <<'EOF'

export function multiply(a: number, b: number): number {
  return a * b;
}
EOF

git add src/math.ts
git commit -m "feat(math): add multiply"
git push -u origin green/feature/multiply
gh pr create --base dev --title "[green] feat(math): add multiply" --body "Adds multiply to math helpers."
gh pr merge --squash --delete-branch
```

**Expected:** **`v1.0.0-alpha.2`** published to `dev`.

### 1.3 — yellow ships third

```bash
git checkout dev && git pull
git checkout -b yellow/feature/divide

cat >> src/math.ts <<'EOF'

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('division by zero');
  return a / b;
}
EOF

git add src/math.ts
git commit -m "feat(math): add divide with zero guard"
git push -u origin yellow/feature/divide
gh pr create --base dev --title "[yellow] feat(math): add divide with zero guard" --body "Adds divide; throws on zero divisor."
gh pr merge --squash --delete-branch
```

**Expected:** **`v1.0.0-alpha.3`** published to `dev`.

**Validation for Phase 1:**
- [ ] Three alpha tags exist: `v1.0.0-alpha.1`, `v1.0.0-alpha.2`, `v1.0.0-alpha.3`.
- [ ] `dev` HEAD is a `chore(release): 1.0.0-alpha.3 [skip ci]` commit.
- [ ] `main` is still at the initial commit (untouched).
- [ ] No `release/*` branch exists yet.

---

## Phase 2 — Cut `release/1.0.0` (the staging cut)

One person — the "release owner" for this cycle — performs the cut. By convention let's say **blue is the release owner for 1.0.0**.

```bash
git fetch origin
git checkout dev && git pull
git checkout -b release/1.0.0
git push -u origin release/1.0.0

# Empty commit to immediately publish rc.1 and close the alpha-vs-rc race window.
git commit --allow-empty -m "chore: cut release/1.0.0"
git push
```

**Expected:** `release-rc.yml` fires, publishes **`v1.0.0-rc.1`**, commits `chore(release): 1.0.0-rc.1 [skip ci]` to `release/1.0.0`. `release/1.0.0`'s `package.json` → `1.0.0-rc.1`.

`dev` is untouched in this step. Its `package.json` still says `1.0.0-alpha.3`.

**Validation:**
- [ ] Tag `v1.0.0-rc.1` exists on `release/1.0.0`.
- [ ] `release/1.0.0` `package.json` → `1.0.0-rc.1`.
- [ ] `dev` `package.json` still → `1.0.0-alpha.3` (no change yet).
- [ ] No tag exists yet on `main`.

---

## Phase 3 — Parallel team work continues on `dev` (next minor)

While QA tests `1.0.0-rc.1` on staging, green and yellow keep merging features to `dev`. The first merge to `dev` after the cut is the proof that semantic-release correctly advances `dev` to the next minor.

### 3.1 — green merges next

```bash
git checkout dev && git pull
git checkout -b green/feature/uppercase

cat >> src/string.ts <<'EOF'

export function uppercase(str: string): string {
  return str.toUpperCase();
}
EOF

git add src/string.ts
git commit -m "feat(string): add uppercase helper"
git push -u origin green/feature/uppercase
gh pr create --base dev --title "[green] feat(string): add uppercase helper" --body "Adds uppercase helper."
gh pr merge --squash --delete-branch
```

**Expected:** semantic-release sees `release/*` is now claiming `1.0.0`, so `dev`'s alpha channel jumps the minor → publishes **`v1.1.0-alpha.1`**. `dev`'s `package.json` → `1.1.0-alpha.1`.

If you instead see `v1.0.0-alpha.4`, the rc tag wasn't visible yet when this workflow ran (race condition the empty commit in Phase 2 was meant to close). Wait for it to self-correct on the next merge or investigate.

### 3.2 — yellow piles on

```bash
git checkout dev && git pull
git checkout -b yellow/feature/lowercase

cat >> src/string.ts <<'EOF'

export function lowercase(str: string): string {
  return str.toLowerCase();
}
EOF

git add src/string.ts
git commit -m "feat(string): add lowercase helper"
git push -u origin yellow/feature/lowercase
gh pr create --base dev --title "[yellow] feat(string): add lowercase helper" --body "Adds lowercase helper."
gh pr merge --squash --delete-branch
```

**Expected:** **`v1.1.0-alpha.2`** on `dev`.

**Validation:**
- [ ] Tags `v1.1.0-alpha.1` and `v1.1.0-alpha.2` exist on `dev`.
- [ ] `dev` `package.json` → `1.1.0-alpha.2`.
- [ ] `release/1.0.0` `package.json` still → `1.0.0-rc.1` (untouched by `dev` activity).

---

## Phase 4 — QA finds a bug; fix on `dev` first, cherry-pick to `release/1.0.0`

QA notices that `slugify` (introduced by blue in Phase 1) doesn't strip non-alphanumeric characters. **The fix lands on `dev` first**, then is cherry-picked into the release branch. This is the load-bearing rule of the model.

### 4.1 — Fix on `dev`

```bash
git checkout dev && git pull
git checkout -b blue/fix/slugify-strip

# Replace the slugify body to strip non-alphanumerics before the dash collapse.
# (Edit src/string.ts manually so the function reads:)
#   return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

git add src/string.ts
git commit -m "fix(string): strip non-alphanumerics in slugify"
git push -u origin blue/fix/slugify-strip
gh pr create --base dev --title "[blue] fix(string): strip non-alphanumerics in slugify" --body "QA on rc.1 found unsafe characters surviving slugify. Strip them."
gh pr merge --squash --delete-branch
```

**Expected:** **`v1.1.0-alpha.3`** on `dev`. **Capture the squash-merge commit SHA on `dev`** — you'll need it for the cherry-pick. `git log dev -1 --pretty=%H` (skip the `chore(release)` commit if needed: `git log dev --pretty='%H %s' | head -5` and pick the `fix:` line).

### 4.2 — Cherry-pick into `release/1.0.0`

```bash
FIX_SHA=<paste the fix commit SHA from dev>

git checkout release/1.0.0 && git pull
git cherry-pick -x $FIX_SHA
git push origin release/1.0.0
```

**Expected:** `release-rc.yml` fires, publishes **`v1.0.0-rc.2`**. `release/1.0.0`'s `package.json` → `1.0.0-rc.2`. `release/1.0.0`'s CHANGELOG appends an `rc.2` entry.

**Validation:**
- [ ] `git log release/1.0.0` shows the cherry-picked commit with the `(cherry picked from commit ...)` annotation.
- [ ] `release/1.0.0` `package.json` → `1.0.0-rc.2`.
- [ ] `dev` `package.json` still → `1.1.0-alpha.3` (no change from the cherry-pick).
- [ ] The fix SHA on `dev` and the cherry-picked SHA on `release/1.0.0` differ, but both have identical diffs.

QA re-tests `1.0.0-rc.2`. It passes.

---

## Phase 5 — Ship `release/1.0.0` to prod

Fast-forward `main` to `release/1.0.0`. The fast-forward is what guarantees no merge commit and no possibility of conflict.

```bash
git checkout main && git pull
git merge --ff-only release/1.0.0
git push origin main
```

If `--ff-only` errors with "Not possible to fast-forward", `main` has commits that aren't on `release/1.0.0`. Investigate before proceeding — it usually means someone direct-pushed to `main`. Do not resolve by merging; resolve by understanding why `main` diverged.

**Expected:** `release-prod.yml` fires, publishes **`v1.0.0`**. `main`'s `package.json` → `1.0.0`. CHANGELOG on `main` records `1.0.0` as a clean entry.

### 5.1 — Delete the release branch

```bash
git push origin --delete release/1.0.0
git branch -d release/1.0.0
```

**Validation:**
- [ ] Tag `v1.0.0` exists on `main`.
- [ ] `main` `package.json` → `1.0.0`.
- [ ] `release/1.0.0` no longer exists on origin or locally.
- [ ] `dev` is unchanged from Phase 4 (still at `1.1.0-alpha.3`).

---

## Phase 6 — Hotfix scenario

Production is on `1.0.0`. QA reports that `divide` (yellow's feature) emits a confusing error message. We need to ship `1.0.1` without dragging in any of the in-progress `1.1.0-alpha.*` work on `dev`.

### 6.1 — Cut a hotfix release branch from `main`, not `dev`

```bash
git checkout main && git pull
git checkout -b release/1.0.1
git commit --allow-empty -m "chore: cut release/1.0.1 for hotfix"
git push -u origin release/1.0.1
```

**Expected:** **`v1.0.1-rc.1`** published. `release/1.0.1`'s `package.json` → `1.0.1-rc.1`.

### 6.2 — Land the fix on `dev` first

```bash
git checkout dev && git pull
git checkout -b yellow/fix/divide-error-message

# In src/math.ts, change `throw new Error('division by zero');`
#                  to    `throw new Error('cannot divide by zero');`

git add src/math.ts
git commit -m "fix(math): improve divide-by-zero error message"
git push -u origin yellow/fix/divide-error-message
gh pr create --base dev --title "[yellow] fix(math): improve divide-by-zero error message" --body "Customer-facing error wording fix."
gh pr merge --squash --delete-branch
```

**Expected:** **`v1.1.0-alpha.4`** published on `dev`. Capture the squash-merge SHA.

### 6.3 — Cherry-pick into `release/1.0.1`

```bash
FIX_SHA=<paste from dev>
git checkout release/1.0.1 && git pull
git cherry-pick -x $FIX_SHA
git push origin release/1.0.1
```

**Expected:** **`v1.0.1-rc.2`** published.

### 6.4 — Ship the hotfix

```bash
git checkout main && git pull
git merge --ff-only release/1.0.1
git push origin main
```

**Expected:** **`v1.0.1`** published. `main`'s `package.json` → `1.0.1`.

### 6.5 — Clean up

```bash
git push origin --delete release/1.0.1
git branch -d release/1.0.1
```

**Validation:**
- [ ] Tag `v1.0.1` on `main`.
- [ ] `dev` is unaffected by the hotfix flow — its alpha channel didn't shift down to `1.0.x`. Specifically, the next `dev` merge produces `v1.1.0-alpha.5`, not `v1.0.2-alpha.1`.
- [ ] `release/1.0.1` is gone.

### 6.6 — Confirm `dev` still tracks the next minor

```bash
git checkout dev && git pull
git checkout -b green/feature/repeat

cat >> src/string.ts <<'EOF'

export function repeat(str: string, n: number): string {
  return str.repeat(n);
}
EOF

git add src/string.ts
git commit -m "feat(string): add repeat helper"
git push -u origin green/feature/repeat
gh pr create --base dev --title "[green] feat(string): add repeat helper" --body "Repeat helper."
gh pr merge --squash --delete-branch
```

**Expected:** **`v1.1.0-alpha.5`** (NOT `v1.0.2-alpha.1`). semantic-release sees `1.1.0-alpha` is already higher than `1.0.1`, so dev's channel doesn't regress.

---

## Phase 7 — Ship `1.1.0`

Repeat Phases 2–5 with `release/1.1.0`. The point is to confirm a *second* full cycle works as cleanly as the first, especially that `main`'s tag history is now `v1.0.0` → `v1.0.1` → `v1.1.0` in order.

```bash
git checkout dev && git pull
git checkout -b release/1.1.0
git push -u origin release/1.1.0
git commit --allow-empty -m "chore: cut release/1.1.0"
git push
# → v1.1.0-rc.1

# (no QA bug this time, ship as-is)

git checkout main && git pull
git merge --ff-only release/1.1.0
git push origin main
# → v1.1.0

git push origin --delete release/1.1.0
git branch -d release/1.1.0
```

**Validation:**
- [ ] `git log main --pretty=%d` shows tag order: `v1.0.0`, `v1.0.1`, `v1.1.0`.
- [ ] `git log main --first-parent --oneline` is a clean linear history (no merge commits).

---

## Phase 8 — Negative tests

Confirm the invariants that should hold under the new model.

### 8.1 — A direct push to `main` (skip if `main` is branch-protected)

```bash
# Only run this if main is NOT branch-protected. Otherwise skip.
git checkout main
git commit --allow-empty -m "chore: simulate rogue direct push"
git push origin main
```

**Expected:** `release-prod.yml` fires. semantic-release will either (a) publish a patch (e.g. `v1.1.1`) because of the new commit, or (b) no-op if the commit type is non-releasing. Whichever it does, the next cycle's fast-forward from a future `release/X.Y.Z` will fail because `main` now has a commit `release/X.Y.Z` doesn't.

This is the failure mode that motivates **branch-protecting `main`** in real repos. Document the result, then either (a) hard-reset `main` (only safe in a test repo) or (b) cherry-pick the rogue commit into the next release branch before continuing.

### 8.2 — Two release branches open simultaneously

```bash
# With release/1.2.0 still open and unshipped, attempt to cut release/1.3.0.
git checkout dev && git pull
git checkout -b release/1.3.0
git commit --allow-empty -m "chore: cut release/1.3.0"
git push -u origin release/1.3.0
```

**Expected:** Both rc workflows run. semantic-release publishes `v1.2.0-rc.N` and `v1.3.0-rc.N` independently. **Staging environment can only deploy one tag at a time.** This is the operational reason to avoid concurrent release branches even though semantic-release supports them.

After confirming the behavior, delete `release/1.3.0`:

```bash
git push origin --delete release/1.3.0
git branch -d release/1.3.0
```

---

## Pass criteria

The model is validated when **all** of the following are true at the end of Phase 7:

- [ ] `main` tags in order: `v1.0.0`, `v1.0.1`, `v1.1.0`.
- [ ] `main` `git log --first-parent --oneline` is linear (no merge commits).
- [ ] `dev` was never blocked by the release/hotfix flow — alpha publishing continued the entire time.
- [ ] No CHANGELOG or `package.json` merge conflict was encountered (the `merge=ours` rule was never even tested because no merge happened — fast-forwards only).
- [ ] Cherry-picks were straight `git cherry-pick -x`, no manual conflict resolution.
- [ ] Cut-to-ship duration recorded for each cycle (this is the metric that matters for adopting the model in the real repo — the `RELEASE_STRATEGY.md` "Cycle length assumption" section).

If any of these fail, capture the exact state (branch, tag, package.json version, workflow run URL) and investigate before recommending the model for production adoption.

---

## Cleanup

After the test passes, the repo can be archived or wiped. The validation only needs to happen once per change to `.releaserc` or the workflows.

```bash
# Optional: archive the test repo on GitHub via Settings → Danger Zone → Archive.
```
