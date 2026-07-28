# Public TUI visual-system prototype

> **THROWAWAY:** This branch exists only to settle the visual direction in
> “Prototype the public TUI visual system.” Do not merge it as production code.

Three structurally different portfolio directions are switchable with
`?variant=a`, `?variant=b`, and `?variant=c`:

- **A — Operational shell:** persistent navigation and a compact application-like
  workspace.
- **B — Editorial dossier:** reading-first, generous, résumé-like narrative.
- **C — Evidence navigator:** a compact master/detail surface that foregrounds
  evidence.

Each direction exercises `/about` and
`/projects/distributed-event-platform`. The header controls switch light/dark
theme, English/Croatian content, and IBM Plex/Atkinson type pairs.

Run it with:

```sh
npm install && npm start
```

Use the floating arrows or the keyboard Left/Right arrows to change variants.
