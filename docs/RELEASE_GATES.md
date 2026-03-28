# Release Gates

This repository uses `master` as the default branch for CI and release automation.

## Branch trigger strategy

- CI workflows that gate releases run on `push` and `pull_request` events targeting `master`.
- Scheduled maintenance jobs are limited to `schedule` and `workflow_dispatch` events.

## Required release checks

Configure branch protection for `master` to require these checks:

1. `CI / Test Suite`
2. `CI / Code Quality`
3. `CI / Release Gate`

`CI / Release Gate` is an enforcement job that fails when upstream required jobs do not pass.

## Coverage workflows

- `Test Coverage` and `PR Coverage Report` follow the same `master` branch strategy.
- Coverage jobs are informational and should not replace required release gates unless explicitly promoted.
