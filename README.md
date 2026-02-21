MCP server that bridges your AI assistant to [Latitude.so](https://latitude.so) prompt management. list, read, run, push, and pull PromptL prompts — all from inside a conversation. like prompt DevOps without leaving your editor.

```bash
npx mcp-latitude-ai
```

[![npm](https://img.shields.io/npm/v/mcp-latitude-ai.svg?style=flat-square)](https://www.npmjs.com/package/mcp-latitude-ai)
[![node](https://img.shields.io/badge/node-18+-93450a.svg?style=flat-square)](https://nodejs.org/)
[![license](https://img.shields.io/badge/license-MIT-grey.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## what it does

7 tools exposed over MCP stdio transport. your AI assistant gets full access to your Latitude prompt library.

| tool | what it does |
|:---|:---|
| `list_prompts` | list all prompt names in the LIVE version |
| `get_prompt` | get full PromptL content by name |
| `run_prompt` | execute a prompt with parameters, get response + token usage |
| `push_prompts` | full sync — replace all LIVE prompts from a local folder of `.promptl` files |
| `pull_prompts` | full sync — download all LIVE prompts to local `.promptl` files |
| `add_prompt` | additive merge — add/update prompts without deleting others |
| `docs` | query 52-topic embedded documentation on PromptL syntax and techniques |

- **pre-validation** — every prompt is parsed with `promptl-ai` before push. if anything has errors, nothing gets deployed
- **3-step transactional deploy** — draft, push with SHA-256 content hashes, publish to LIVE
- **diff engine** — only changed prompts get pushed, compared by content hash
- **dynamic tool descriptions** — `run_prompt` and `add_prompt` descriptions are built at startup with your actual prompt names and their `{{ variables }}`
- **30-second prompt cache** — force-refreshed after any mutation
- **52-topic docs system** — PromptL syntax, techniques (ReAct, CoT, ToT, RAG, etc.), recipes, provider configs

## install

```bash
npm install -g mcp-latitude-ai
```

or just run it directly:

```bash
npx mcp-latitude-ai
```

or build from source:

```bash
git clone https://github.com/yigitkonur/mcp-latitude-ai.git
cd mcp-latitude-ai
pnpm install && pnpm build
```

## configure

two required env vars:

```bash
export LATITUDE_API_KEY="your-api-key"       # from https://app.latitude.so/settings/api-keys
export LATITUDE_PROJECT_ID="your-project-id"
```

| variable | default | description |
|:---|:---|:---|
| `LATITUDE_API_KEY` | — | required. API key |
| `LATITUDE_PROJECT_ID` | — | required. target project ID |
| `LATITUDE_BASE_URL` | `https://gateway.latitude.so` | override API base URL |
| `DEBUG` | — | `true` for all debug logs, or comma-separated module names |

config is loaded in priority order: `~/.mcp/configs.json` < `.env` file < direct env vars.

### global config file

optional. place at `~/.mcp/configs.json`:

```json
{
  "latitude": {
    "environments": {
      "LATITUDE_API_KEY": "your-key",
      "LATITUDE_PROJECT_ID": "your-project-id"
    }
  }
}
```

## usage with Claude Desktop

add to your MCP client config:

```json
{
  "mcpServers": {
    "latitude": {
      "command": "npx",
      "args": ["-y", "mcp-latitude-ai"],
      "env": {
        "LATITUDE_API_KEY": "your-api-key",
        "LATITUDE_PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

## development

```bash
pnpm install
pnpm build                # compile TypeScript
pnpm mcp:stdio            # build + run stdio
pnpm mcp:inspect          # build + run with MCP inspector at localhost:3000
pnpm dev:stdio            # run with @modelcontextprotocol/inspector
```

logs go to `~/.mcp/data/<package-name>.<session-uuid>.log` — stdout is reserved for the MCP stdio stream.

## how push works

the deploy pipeline is transactional:

1. read all `.promptl` files from your folder
2. validate every prompt with `promptl-ai` — abort on any error
3. compute diff against current LIVE (SHA-256 content hashes)
4. `POST /versions` — create a named draft
5. `POST /versions/:uuid/push` — submit changes
6. `POST /versions/:commitUuid/publish` — publish to LIVE

`add_prompt` uses the same pipeline but merges new prompts into a temp copy of the existing set first — so nothing gets deleted.

## project structure

```
src/
  index.ts        — entry point, env validation
  server.ts       — MCP server factory + stdio transport
  tools.ts        — all 7 tool definitions and handlers
  api.ts          — Latitude HTTP client, diff engine, validation
  types.ts        — TypeScript interfaces
  docs/
    index.ts      — 52-topic docs map, search, and lookup
    types.ts      — doc topic types
    help.ts       — server overview content
    metadata.ts   — topic search metadata
    core-syntax.ts, phase1.ts, phase2.ts, phase3.ts, techniques.ts, recipes.ts
```

## troubleshooting

| problem | fix |
|:---|:---|
| server exits immediately | check `LATITUDE_API_KEY` and `LATITUDE_PROJECT_ID` are set |
| push rejected | validation failed — check the error report for line/column details |
| stale prompt list | cache TTL is 30s. any mutation forces an immediate refresh |
| logs not appearing | logs go to file, not console. check `~/.mcp/data/` |
| debug output needed | set `DEBUG=true` or `DEBUG=api.ts,tools.ts` for specific modules |

## license

MIT
