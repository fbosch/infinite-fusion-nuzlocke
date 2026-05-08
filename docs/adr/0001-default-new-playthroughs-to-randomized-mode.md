# Default New Playthroughs To Randomized Mode

**Status:** accepted
**Date:** 2026-05-08

## Context

Analytics shows randomized mode is the most-used game mode. New playthrough creation still defaults to classic mode, which makes the common path require an extra choice and makes accidental classic runs more likely.

## Decision

Default new playthroughs to randomized mode. Existing playthrough data stays unchanged, and explicit user game-mode choices during creation continue to override the default.

## Alternatives Considered

Keeping classic as the default preserves the historical behavior, but it no longer matches observed usage. Defaulting to the current active playthrough's mode keeps continuity between runs, but it can carry over an old choice when the user expects the recommended default.

## Consequences

Creating a playthrough without changing mode will create a randomized run. Existing imported, persisted, and active playthroughs should not be migrated by this decision, so compatibility work stays limited to new-run creation behavior and tests.
