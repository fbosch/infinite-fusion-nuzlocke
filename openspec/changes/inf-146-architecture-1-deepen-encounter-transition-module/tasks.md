## 1. Deep transition ownership

- [x] 1.1 Define or consolidate canonical encounter transition operations that own side-effect ordering across encounter CRUD, status, fusion, and drag/drop behavior.
- [ ] 1.2 Route existing mutation paths to those deep operations so callers no longer encode rule sequencing.
- [ ] 1.3 Keep first encounter tracking, death permanence, team effects, cleanup, and event emission behavior unchanged.

## 2. Test seam reshaping

- [ ] 2.1 Add focused tests that assert observable encounter/team/graveyard outcomes through deep transition operations.
- [ ] 2.2 Replace shallow helper tests where assertions only duplicate implementation details without protecting behavior.

## 3. Verification

- [x] 3.1 Run `pnpm type-check`.
- [x] 3.2 Run `pnpm test:run`.
- [ ] 3.3 Run broader `pnpm validate` only if scope becomes cross-cutting.
