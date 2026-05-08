---
name: impeccable-design-review
description: Run Impeccable-backed UI design reviews for this app. Use when auditing visual design, UX polish, responsive quality, AI-slop anti-patterns, hierarchy, spacing, typography, color, motion, or when the user asks for Impeccable, design audit, design critique, design backlog, polish, bolder, quieter, layout, typeset, colorize, or harden passes.
---

# Impeccable Design Review

Use this skill for design critique and audit work, not implementation by default.

## Project Entry Points

- Deterministic scan: `pnpm design:detect`
- JSON scan: `pnpm design:detect:json`
- URL scan: run the app with `pnpm dev`, then `pnpm dlx impeccable detect http://localhost:4000`
- Focused file scan: `pnpm dlx impeccable detect --fast src/components/Header`

## Review Lens

Before scoring aesthetics, identify the user job:

- Nuzlocke run tracking is dense operational UI; clarity and scan speed beat decorative novelty.
- Pokemon theme should appear through type, sprites, status language, and restrained color accents, not generic SaaS gradients.
- Desktop tables must remain information-dense; mobile flows must expose the next action without horizontal guesswork.

## Workflow

1. Run `pnpm design:detect:json` and treat findings as deterministic signals, not the complete review.
2. Run a browser pass on key screens: home table, mobile home table, team/PC interactions, settings/import, empty or first-run state when reachable.
3. Check console errors during the browser pass; separate functional bugs from design issues.
4. Classify each finding by severity: `P0 blocks task`, `P1 causes likely wrong action`, `P2 slows or confuses`, `P3 polish debt`.
5. Return a prioritized backlog. Each item needs observed evidence, impacted screen/flow, and next action.

## NEVER

- NEVER treat Impeccable detector output as exhaustive; it catches anti-patterns, not product fit.
- NEVER recommend lower information density for the main tracker unless it preserves scan speed.
- NEVER propose a generic landing-page redesign for core run-state screens.
- NEVER file color-only findings without checking contrast, state semantics, and Pokemon domain meaning.
- NEVER change UI during an audit unless the user explicitly asks for implementation.

## Fast Checks

- Hierarchy: page title, active playthrough, current route, and primary action must be visible without reading the whole header.
- Density: table rows, sprites, tags, and controls should group by task, not by component boundary.
- Responsiveness: mobile must avoid clipped controls, hidden critical actions, and ambiguous horizontal scroll.
- States: empty, loading, disabled, invalid, success, and destructive states need distinct copy and visual treatment.
- Craft: avoid default gray-on-gray surfaces, nested-card noise, generic gradients, cramped touch targets, and inconsistent radii/shadows.
