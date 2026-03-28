---
description: Load domain constraints for a specific game topic
agent: plan
subtask: true
---

If `$ARGUMENTS` is empty, respond only:
`Usage: /domain-context <topic>`

Allowed topics:

- `nuzlocke-core-rules`
- `fusion-mechanics`
- `pokemon-data`
- `ui-components`
- `team-member-selection-architecture`

If `$ARGUMENTS` is not one of the allowed topics, respond only:
`Invalid topic. Use one of: nuzlocke-core-rules, fusion-mechanics, pokemon-data, ui-components, team-member-selection-architecture`

Read and summarize exactly one file:
`docs/agents/domain/$ARGUMENTS.md`

Output format:

## Critical invariants

- 3-6 bullets

## Implementation implications

- 3-6 bullets

## Common mistakes

- 2-4 bullets

## Source

- `docs/agents/domain/$ARGUMENTS.md`
