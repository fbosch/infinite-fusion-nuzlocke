# AGENTS

Local rules for data scraping and generation scripts.

## Constraints

- Keep script outputs deterministic for identical inputs.
- Validate fetched or scraped payloads before writing generated data files.
- Fail loudly on network, parse, or schema errors; do not silently produce partial trusted output.
- Keep script changes scoped; avoid drive-by edits to app runtime code from script tasks.

## Validation

- After script logic changes, run the smallest relevant checks first, then broader validation when output files are touched.

## Domain references

- `docs/agents/domain/pokemon-data.md`
