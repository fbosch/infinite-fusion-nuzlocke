## 1. Canonical emit ownership

- [ ] 1.1 Identify analytics semantic actions with divergent emit paths (including team context menu and table flows).
- [ ] 1.2 Move or centralize emit responsibility to canonical domain/store operations for those actions.
- [ ] 1.3 Ensure UI handlers invoke canonical operations instead of directly owning analytics emission semantics.

## 2. Semantic equivalence and source attribution

- [ ] 2.1 Ensure equivalent domain transitions emit one canonical event id and required shared contract fields.
- [ ] 2.2 Restrict entrypoint differences to bounded source metadata fields (`source_surface`, `trigger_method`) where applicable.
- [ ] 2.3 Remove or replace bypass-only semantics that cause missing or inconsistent event coverage.

## 3. Verification

- [ ] 3.1 Add focused tests proving equivalent actions from at least two surfaces produce equivalent telemetry semantics.
- [ ] 3.2 Add focused guard tests that fail when bypass paths skip canonical emit behavior.
- [ ] 3.3 Run targeted validation on touched analytics/store modules (format, lint, and targeted tests).
