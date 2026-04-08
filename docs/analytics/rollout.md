# Analytics Rollout and Verification (AN-5)

This runbook defines how to validate analytics changes locally, verify event delivery after deploy, and record rollout outcomes.

It is the execution checklist for AN-1 through AN-4 instrumentation and guardrail work.

## Scope

- Analytics contract: `docs/analytics/event-spec.md`
- Transport and gating: `src/lib/analytics/trackEvent.ts`
- Payload derivation and dedupe: `src/lib/analytics/playthroughEventData.ts`
- Store/runtime instrumentation: `src/stores/playthroughs/**`, `src/hooks/usePlaythroughImportExport.ts`, `src/app/providers.tsx`

## Local validation

Run the smallest analytics-focused checks first.

```bash
pnpm exec biome format --write src/lib/analytics src/stores/playthroughs src/hooks/usePlaythroughImportExport.ts src/app/providers.tsx
pnpm exec biome lint --diagnostic-level=error --max-diagnostics=500 src/lib/analytics src/stores/playthroughs src/hooks/usePlaythroughImportExport.ts src/app/providers.tsx
pnpm test:run -- src/lib/analytics/__tests__/playthroughEventData.test.ts src/stores/playthroughs/__tests__/analytics-events.test.ts src/stores/playthroughs/__tests__/playthrough-resume-observer.test.ts
pnpm type-check
```

If those pass and scope expands beyond analytics modules, run broader validation:

```bash
pnpm test:run
pnpm validate
```

## Pre-deploy checklist

- Analytics event names and payload keys match `docs/analytics/event-spec.md`.
- Dedupe behavior is covered:
  - `run_checkpoint_reached` uses monotonic checkpoint dedupe.
  - `playthrough_resumed` emits once per playthrough per tab session.
- Transition-only events are guarded:
  - `fusion_created` emits on transition to complete fusion only.
  - `encounter_marked_deceased` emits on transition to deceased only.

## Guardrails and operator controls

- Payload guardrails in `trackEvent` enforce per-event allowlisted keys and primitive value shapes.
- Invalid payloads are dropped safely (no throw) and counted in debug counters.
- Kill switch for custom events:
  - `NEXT_PUBLIC_DISABLE_CUSTOM_ANALYTICS=true` (or `1`, `yes`, `on`)
  - behavior: blocks all custom events while leaving pageview analytics wiring unchanged
- Debug counters/logging:
  - `NEXT_PUBLIC_ANALYTICS_DEBUG=true` enables low-noise debug logs without payload values
  - counters are available via `getAnalyticsDebugCounters()` and resettable via `resetAnalyticsDebugCounters()`

## Vercel verification checklist

Run this after deploying the branch (preview first, then production).

### 1) Confirm deploy target

- Verify commit SHA and branch in Vercel deployment details.
- For production verification, confirm deployment is on the production environment.

### 2) Generate deterministic event traffic

In a fresh browser session, execute this sequence in the app:

1. Create a new playthrough.
2. Add encounters until a checkpoint is crossed (for example 1 and 5).
3. Create one fusion via any supported path.
4. Flip a fused encounter.
5. Mark one encounter as deceased.
6. Export the playthrough.
7. Reload and reopen the same playthrough in the same tab, then in a new tab.

Expected semantics:

- `playthrough_created`: one event per successful create call.
- `run_checkpoint_reached`: one event per threshold per playthrough.
- `playthrough_resumed`: one event per playthrough per tab session.
- `fusion_created`: one event per transition into complete fusion.
- `fusion_flipped`: one event per successful flip.
- `encounter_marked_deceased`: one event per transition to deceased.
- `playthrough_exported`: one event per successful export flow.

### 3) Validate events in Vercel Analytics

- Filter by deployment and time range covering the test session.
- Confirm event names appear exactly as defined in contract.
- Inspect sampled payloads and verify:
  - Shared properties are present on each event.
  - Bucket labels are valid contract values.
  - Event-specific properties are present and low-cardinality.

### 4) Dedupe sanity checks

- Reload same tab and confirm no second `playthrough_resumed` for same playthrough.
- Open a new tab and confirm `playthrough_resumed` can emit once there.
- Repeat non-crossing encounter edits and confirm no extra checkpoint events.

## Manual QA matrix (required)

Run this matrix before production rollout and attach evidence (notes + screenshots/log snippets) to the release ticket.

| Scenario | Setup | Expected Result |
| --- | --- | --- |
| Lifecycle emits | Consent ON, production deployment | `playthrough_created`, `playthrough_resumed`, `playthrough_exported` emit on successful canonical paths only |
| Progression emits | Consent ON, production deployment | `fusion_created`, `fusion_flipped`, `encounter_marked_deceased`, `run_checkpoint_reached` emit on transition-only paths |
| Checkpoint dedupe | Consent ON, production deployment | Each checkpoint threshold emits at most once per playthrough |
| Resume dedupe | Consent ON, same-tab and new-tab checks | Same tab does not double-emit; new tab may emit once |
| Consent denied | Consent OFF in cookie preferences | No custom events are emitted |
| Preview environment | Consent ON, preview deployment | Custom events remain gated per environment policy |
| Guardrail drop behavior | Trigger invalid payload in test harness/spec test | Event is dropped safely, debug blocked counter increments, no throw |
| Kill switch | `NEXT_PUBLIC_DISABLE_CUSTOM_ANALYTICS=true` | No custom events emitted while pageview wiring remains intact |

## Release evidence checklist

- Attach command output for:
  - `pnpm exec vitest run src/lib/analytics/__tests__/trackEvent.test.ts src/lib/analytics/__tests__/playthroughEventData.test.ts src/stores/playthroughs/__tests__/analytics-events.test.ts src/stores/playthroughs/__tests__/playthrough-export-analytics.test.ts src/stores/playthroughs/__tests__/playthrough-resume-observer.test.ts`
  - `pnpm type-check`
- Attach Vercel Analytics screenshots showing event names and sampled property keys.
- Attach consent-OFF verification evidence showing no custom events.
- Record any anomalies and whether rollout was blocked.

## Known limitations

- Local and preview environments may intentionally suppress analytics when environment/consent gating is not satisfied.
- Analytics ingestion and dashboard availability can lag by several minutes.
- Ad blockers/privacy extensions can suppress client event delivery.
- Session-based checks must be repeated in a clean tab context to avoid false negatives.

## Rollout record template

Use this section during each rollout and keep it in the merge commit.

```md
### Rollout record

- Date:
- Branch/PR:
- Deployment URL(s):
- Validation commands run:
  - [ ] format
  - [ ] lint
  - [ ] targeted tests
  - [ ] type-check
- Vercel verification:
  - [ ] canonical event names observed
  - [ ] shared properties present
  - [ ] dedupe behavior confirmed
  - [ ] consent denied emits no custom events
  - [ ] guardrail drop behavior verified
  - [ ] kill switch behavior verified
- Rollback readiness:
  - [ ] rollback trigger evaluated
  - [ ] rollback command/env toggle tested
- Notes / anomalies:
```

## Rollback playbook

Use this when analytics causes production instability or incorrect telemetry.

### Trigger conditions

- Sustained invalid-payload drops beyond expected noise floor.
- Reproducible double-emits on canonical no-op paths.
- Verified consent gating regression (events emitted when consent is denied).

### Immediate rollback action

1. Set `NEXT_PUBLIC_DISABLE_CUSTOM_ANALYTICS=true` in Vercel environment variables.
2. Redeploy the affected environment.
3. Re-run a smoke path (create/resume/export + one progression transition) and verify no custom events appear.

### Recovery and re-enable

1. Fix root cause and validate locally with targeted analytics tests.
2. Deploy to preview and re-run the manual QA matrix.
3. Re-enable custom analytics by removing the kill switch variable, then redeploy.
