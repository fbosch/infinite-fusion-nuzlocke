# Version Boundaries

This document defines which version values represent app releases versus persisted data compatibility.

## Two independent version tracks

### 1) App release version (SemVer)

- **Purpose:** identify the shipped application build for releases, support, and diagnostics.
- **Source of truth:** `package.json` `version` (overridable by `NEXT_PUBLIC_APP_VERSION`).
- **Where it is exposed:**
  - `next.config.ts` sets `NEXT_PUBLIC_APP_VERSION` from `package.json` when no explicit override is provided.
  - `src/components/Footer.tsx` renders `Version {NEXT_PUBLIC_APP_VERSION}` in the UI.
- **Lifecycle:** advanced by release tooling (Release Please) when release PRs are merged.

### 2) Persisted data/schema compatibility version

- **Purpose:** preserve compatibility for local storage/imported playthrough data and settings migrations.
- **Scope:** local playthrough/settings/export payload schema markers, not deployment or release identity.
- **Current marker value:** `1.0.0` (compatibility marker, not app SemVer).
- **Where it is used:**
  - Playthrough schema field: `src/stores/playthroughs/types.ts` (`PlaythroughSchema.version`).
  - Playthrough migration defaults: `src/stores/playthroughs/migrations.ts` (`migrateVersion`, migration defaults).
  - Default playthrough creation: `src/stores/playthroughs/defaultPlaythrough.ts`.
  - Import/export payload marker: `src/hooks/usePlaythroughImportExport.ts` (`exportData.version`).
  - Settings schema/version marker: `src/stores/settings.ts` (`SettingsSchema.version`).

## Boundary rules

- App release version and persisted schema version are intentionally decoupled.
- A patch/minor/major app release does **not** imply a schema version change.
- A schema compatibility change does **not** require mirroring the app SemVer value.
- User-facing version displays (footer/diagnostics) must use app release version, never persisted schema markers.
- Migration logic must treat persisted version fields as compatibility metadata only.

## Non-goals

- This document does not change migration behavior or bump any schema marker.
- This document does not change release automation/version bump policy.
- This document does not introduce new UI version surfaces beyond existing footer diagnostics.
