## 1. Baseline and compatibility audit

- [ ] 1.1 Confirm strict Node `24.x` policy and rollback trigger conditions for this migration.
- [ ] 1.2 Inventory all runtime/version pins in scope (local config, CI workflows, deployment runtime settings).
- [ ] 1.3 Run dependency/tooling compatibility checks on Node 24 and list blockers with mitigation owners.

## 2. Runtime pin migration

- [ ] 2.1 Update local runtime declarations to Node 24 and verify local engine warnings are eliminated.
- [ ] 2.2 Update CI runtime declarations to Node 24 and verify no active required workflow retains Node 22.
- [ ] 2.3 Align deployment runtime configuration to Node 24, including any external platform setting not stored in-repo.

## 3. Validation and rollout readiness

- [ ] 3.1 Run targeted smoke checks for install/build/test paths on Node 24.
- [ ] 3.2 Run full validation in repo order: `pnpm type-check`, `pnpm test:run`, `pnpm validate`.
- [ ] 3.3 Confirm required CI checks pass on Node 24 without engine mismatch warnings.
- [ ] 3.4 Publish migration notes with exact rollback steps and rollback verification criteria.
