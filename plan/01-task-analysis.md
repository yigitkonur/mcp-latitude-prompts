# Task Analysis: Documentation-as-Tools for Latitude MCP Server

**Date:** 2024-12-02
**Task Type:** Feature Development / Integration
**Complexity:** Medium-High

## Request Breakdown

**What:** Create self-documenting tools that guide AI agents in writing PromptL prompts for Latitude.so
**Why:** Enable AI assistants to understand PromptL syntax without external lookups - they can query documentation on-demand
**Who:** AI agents (Claude, GPT, etc.) using the MCP server to manage Latitude prompts
**When:** Implementation ready after planning approval

## Core Concept

> "Every tool response is an opportunity to prompt the model" — MCP Best Practice

Instead of multiple scattered documentation tools, create:
1. **`latitude_help`** — Master menu of ALL server capabilities
2. **`latitude_get_docs`** — Single tool with `topic` enum parameter for PromptL documentation

## Scope Definition

### In Scope
- `latitude_help` tool returning full server capabilities overview
- `latitude_get_docs` tool with enum for 10 PromptL topics
- Documentation resources at `docs://latitude/{topic}` URIs
- Markdown documentation content for all PromptL syntax features
- `nextActions` suggestions in documentation responses

### Out of Scope
- Modifying existing Latitude API tools (only adding new docs tools)
- External API calls for documentation (all embedded)
- Complex documentation versioning
- User-editable documentation

## Documentation Topics (Enum Values)

| Topic | Description | Key Content |
|-------|-------------|-------------|
| `overview` | What is PromptL, why use it | Introduction, benefits, quick start |
| `structure` | Config section + Messages | YAML frontmatter, message types |
| `variables` | `{{ }}` syntax, assignments | Interpolation, defaults, expressions |
| `conditionals` | `if/else/endif` | Boolean logic, nested conditions |
| `loops` | `for/each/endfor` | Array iteration, index access |
| `references` | Prompt chaining with `<prompt>` | Including other prompts, parameters |
| `tools` | Function calling setup | Tool definition, schemas |
| `chains` | Step-by-step with `<step>` | Multi-step prompts, response chaining |
| `agents` | Multi-agent orchestration | Agent definition, collaboration |
| `techniques` | Prompting patterns | Few-shot, CoT, ToT, Role prompting |

## Source of Truth

### Codebase Files
- `src/tools/latitude.tool.ts` — Existing tool registration patterns
- `src/resources/latitude.resource.ts` — Existing resource patterns  
- `src/types/latitude.types.ts` — Zod schema patterns
- `src/index.ts` — Server initialization and registration

### External Research
- User-provided PromptL documentation (comprehensive syntax guide)
- MCP self-documenting patterns research (help tool, dual content blocks)

## New Files to Create

```
src/
├── docs/
│   └── promptl.docs.ts          # All documentation content as constants
├── tools/
│   └── docs.tool.ts             # latitude_help + latitude_get_docs tools
├── resources/
│   └── docs.resource.ts         # docs://latitude/* resources
└── types/
    └── docs.types.ts            # Zod schemas for docs tools
```

## Unknowns / Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Single tool vs multiple tools? | Single `latitude_get_docs` with enum — cleaner, discoverable |
| How to structure responses? | Markdown with: Overview, Syntax, Examples, Next Steps |
| Include resources too? | Yes — dual approach: tools + URI resources |
| How many topics? | 10 topics covering all PromptL syntax |

## Success Criteria

- [ ] AI agents can call `latitude_help` to understand all server capabilities
- [ ] AI agents can call `latitude_get_docs` with any topic to learn PromptL syntax
- [ ] Documentation includes working examples for each syntax feature
- [ ] Each doc response suggests relevant `nextActions`
- [ ] Resources accessible via `docs://latitude/{topic}` URIs

## Next Steps

1. Create `02-research-findings.md` — Extract PromptL syntax from user docs
2. Create `03-execution-strategy.md` — Implementation approach
3. Execute implementation upon approval
