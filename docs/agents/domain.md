# Domain Docs

Before exploring the codebase, read:

- `CONTEXT.md` at the repository root
- Relevant ADRs under `docs/adr/`

If these files do not exist, proceed silently. Domain-modeling workflows create them when terminology or architectural decisions are resolved.

## File structure

This is a single-context repository:

/
├── CONTEXT.md
├── docs/adr/
└── src/

Use terminology defined in `CONTEXT.md`. If work conflicts with an existing ADR, surface the conflict explicitly rather than silently overriding it.
