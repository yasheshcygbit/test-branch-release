# test-branch-release

A throwaway repository for validating the trunk-based release strategy described in the parent project's `RELEASE_STRATEGY.md`. The whole point of this repo is to walk through a full release cycle end-to-end with three simulated teams before adopting the model in production repos.

## Layout

- `src/math.ts`, `src/string.ts` — trivial code so we have something to change in PRs
- `.releaserc` — semantic-release config: `main` (stable) / `release/*` (rc) / `dev` (alpha)
- `.github/workflows/` — three release workflows, one per channel
- `.gitattributes` — `merge=ours` on `package.json` and `CHANGELOG.md` to neutralize the version/changelog conflict class
- `TEST_PLAN.md` — the scripted walkthrough; this is the actual test

## Branches

| Branch       | Role                              | Tag format         | Trigger workflow       |
| ------------ | --------------------------------- | ------------------ | ---------------------- |
| `dev`        | Trunk; default branch for PRs     | `X.Y.Z-alpha.N`    | `release-alpha.yml`    |
| `release/*`  | Ephemeral, one per release cycle  | `X.Y.Z-rc.N`       | `release-rc.yml`       |
| `main`       | Production; advanced via fast-forward only | `X.Y.Z`     | `release-prod.yml`     |

## Teams

Three simulated teams contribute in parallel:

- **blue** — branches `blue/feature/*`, `blue/fix/*`; PR titles prefixed `[blue]`
- **green** — branches `green/feature/*`, `green/fix/*`; PR titles prefixed `[green]`
- **yellow** — branches `yellow/feature/*`, `yellow/fix/*`; PR titles prefixed `[yellow]`

## How to run the test

Read `TEST_PLAN.md` and execute its phases in order. Each phase has copy-pasteable commands and a validation checklist. The plan exercises a normal release cycle, a QA bug fix via cherry-pick, parallel team work on `dev` after the cut, a fast-forward to prod, and a hotfix scenario.

## One-time setup

```bash
# After cloning, before the first push:
npm install
git add package-lock.json
git commit -m "chore: add lockfile"

# Make dev the default branch on GitHub (Settings → Branches).
# Optionally add branch protection: require PRs to merge into dev/release/*/main; protect main against direct pushes.
# Add a Personal Access Token as the GITHUB_TOKEN secret if the default token doesn't have enough scope to push tags.
```

## Companion docs

- `../rdhnav-node-backend/RELEASE_STRATEGY.md` — the proposal under test
- `../rdhnav-node-backend/.agents/plans/release-strategy-migration.plan.md` — the migration plan
