# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`brain/wiki/index.md`** — full wiki index (~23 pages covering architecture, decisions, risks, patterns, tech stack). Read wiki pages relevant to the topic you're about to work in.
- **`brain/schema.md`** — page format reference (updated date, tags, related links, concise content).
- **`.planning/ROADMAP.md`** — project roadmap and phase structure.
- **`.planning/phases/`** — phase plans with decision records (serve as ADR equivalents).
- **`brain/`** — the full brain archive for deep context.

If none of these files exist, **proceed silently**. Don't flag their absence; don't suggest creating them. The `/domain-modeling` skill creates artefacts lazily.

## File structure

Single-context repo (one app, one codebase):

```
/
├── brain/wiki/       ← wiki pages (architecture, decisions, patterns)
├── brain/schema.md   ← wiki format reference
├── .planning/        ← roadmap, phases, decision records
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept, use the term as defined in `brain/wiki/`. Don't drift to synonyms. If a concept isn't in the wiki yet, note it for `/domain-modeling`.

## Flag archived decisions

If your output contradicts an archived decision in `.planning/phases/` or `brain/wiki/`, surface it explicitly rather than silently overriding.
