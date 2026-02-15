# MCP Latitude AI

> **AI-powered prompt management** for [Latitude.so](https://latitude.so) via Model Context Protocol

Manage PromptL prompts directly from Claude, Windsurf, or any MCP client. Features **intelligent validation**, **dynamic tool descriptions**, and **git-style versioning**.

[![npm version](https://img.shields.io/npm/v/mcp-latitude-ai.svg)](https://www.npmjs.com/package/mcp-latitude-ai)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## ✨ Key Features

- **🤖 Smart Validation** - Client-side PromptL validation with AST-powered error messages
- **📋 Dynamic Descriptions** - Tools show available prompts and their parameters automatically
- **🔄 Full Sync** - Push/pull with automatic conflict resolution
- **🎯 Atomic Operations** - Validate ALL before pushing ANY (all-or-nothing)
- **📚 52 Doc Topics** - Comprehensive PromptL syntax guide with semantic search
- **🏷️ Git-Style Versioning** - Name your changes like commits (feat/add-auth, fix/typo)
- **⚡ Zero Config** - Just set `LATITUDE_API_KEY` and go

---

## Quick Start

### Installation

```bash
pnpm add -g mcp-latitude-ai
```

### Configuration

Set environment variables:

```bash
export LATITUDE_API_KEY="your-api-key"
export LATITUDE_PROJECT_ID="your-project-id"
```

Get your API key from [Latitude Settings](https://app.latitude.so/settings).

### Usage with MCP Client

Add to your MCP client config (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "latitude": {
      "command": "npx",
      "args": ["mcp-latitude-ai"],
      "env": {
        "LATITUDE_API_KEY": "your-api-key",
        "LATITUDE_PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

---

## 🛠️ Available Tools (7)

| Tool | Type | Description |
|------|------|-------------|
| `list_prompts` | Read | List all prompts in LIVE |
| `get_prompt` | Read | Get full prompt content by name |
| `run_prompt` | Execute | 🎯 **Dynamic:** Shows all prompts with their parameters |
| `push_prompts` | Write | 🔄 **FULL SYNC:** Replace ALL prompts (deletes extras) |
| `pull_prompts` | Read | 🔄 **FULL SYNC:** Download all prompts (deletes local first) |
| `add_prompt` | Write | 🎯 **Dynamic:** Add/update prompts (shows available prompts) |
| `docs` | Read | Get documentation (52 topics, semantic search) |

### 🎯 What Makes This Special?

**Dynamic Tool Descriptions** - The MCP server updates tool descriptions in real-time:
- `run_prompt` shows: `"my-prompt" (params: name, email, company)`
- `add_prompt` shows: `"Available prompts (10): prompt-a, prompt-b, ..."`

Your AI assistant sees exactly what prompts exist and what parameters they need!

---

## 🚀 Real-World Workflows

### Workflow 1: New Project Setup

```bash
# Pull all prompts from LIVE to start local development
pull_prompts({ outputDir: "./prompts" })
# Downloads 10 files to ./prompts/
# Deletes any existing local .promptl files first (FULL SYNC)
```

**What you see:**
```
✅ Prompts Pulled from LIVE

Directory: /Users/you/project/prompts
Deleted: 0 existing files
Written: 10 files

Files:
- cover-letter-generate.promptl
- sentiment-analyzer.promptl
...

Tip: Edit files locally, then use `add_prompt` to push changes.
```

### Workflow 2: Add New Prompt (with Dynamic Guidance)

```bash
# The tool description shows you what prompts already exist!
add_prompt({
  prompts: [{
    name: "email-writer",
    content: `---
provider: openai
model: gpt-4o
---
<user>
Write email to {{ recipient }} about {{ topic }}
</user>`
  }],
  versionName: "feat/add-email-writer"  # Optional git-style naming
})
```

**Dynamic Description Shows:**
```
Add or update prompt(s) in LIVE without deleting others.

Available prompts (10): cover-letter-generate, sentiment-analyzer, ...
```

**Result:**
```
✅ Prompts Added to LIVE

Summary:
- Added: 1
- Updated: 0

Added:
- email-writer

Current LIVE prompts (11): cover-letter-generate, ..., email-writer
```

### Workflow 3: Run Prompt (with Parameter Discovery)

```bash
# The tool description shows you what parameters each prompt needs!
run_prompt({
  name: "email-writer",
  parameters: {
    recipient: "Alice",
    topic: "project update"
  }
})
```

**Dynamic Description Shows:**
```
Execute a prompt with parameters.

Available prompts (11):
- cover-letter-generate (params: job_details, career_patterns, company_name)
- email-writer (params: recipient, topic)
- sentiment-analyzer (no params)
...
```

**Result:**
```
✅ Prompt Executed

Prompt: email-writer

Parameters:
{
  "recipient": "Alice",
  "topic": "project update"
}

Response:
Subject: Project Update

Dear Alice,

I wanted to share an update on our project...

Tokens: 245 total
```

### Workflow 4: Validation Catches Errors

```bash
# Try to add a prompt with nested tags (invalid PromptL)
add_prompt({
  prompts: [{
    name: "broken",
    content: `---
model: gpt-4
---
<user><assistant>Nested!</assistant></user>`
  }]
})
```

**Validation Error (Before ANY API Call):**
```
❌ Validation Failed - No Changes Made

1 prompt(s) have errors. Fix all errors before pushing.

### broken
Error Code: `message-tag-inside-message`
Error: Message tags cannot be inside of another message
Root Cause: Message/role tags (<system>, <user>, <assistant>, <tool>) cannot be nested.
Location: Line 4, Column 7
Code Context:
```
2: model: gpt-4
3: ---
4: <user><assistant>Nested!</assistant></user>

          ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```
Fix: Move the nested tag outside its parent. Use code block (```yaml) for examples.

Action Required: Fix the errors above, then retry.
```

### Workflow 5: Full Sync (Initialization)

```bash
# Push local prompts to LIVE - deletes remote prompts not in your folder
push_prompts({
  folderPath: "/absolute/path/to/prompts",
  versionName: "feat/initial-prompts"  # Optional
})
```

**Result:**
```
✅ Prompts Pushed to LIVE

Summary:
- Added: 3
- Modified: 0
- Deleted: 8  # Removed old prompts not in your list

Current LIVE prompts (3): prompt-a, prompt-b, prompt-c
```

---

## 📚 Documentation Topics (52)

### Core Syntax (12)
`overview`, `structure`, `variables`, `conditionals`, `loops`, `references`, `tools`, `chains`, `agents`, `techniques`, `agent-patterns`, `mocking`

### Configuration (8)
`config-basics`, `config-generation`, `config-json-output`, `config-advanced`, `providers-openai`, `providers-anthropic`, `providers-google`, `providers-azure`

### Messages (2)
`messages-roles`, `messages-multimodal`

### Tools (4)
`tools-builtin`, `tools-custom`, `tools-schema`, `tools-orchestration`

### Techniques (12)
`technique-role`, `technique-few-shot`, `technique-cot`, `technique-tot`, `technique-react`, `technique-self-consistency`, `technique-constitutional`, `technique-socratic`, `technique-meta`, `technique-iterative`, `technique-step-back`, `technique-rag`

### Recipes (8)
`recipe-classification`, `recipe-extraction`, `recipe-generation`, `recipe-chatbot`, `recipe-rag`, `recipe-analysis`, `recipe-moderation`, `recipe-support`

### Guides (6)
`conversation-history`, `guide-debugging`, `guide-safety`, `guide-performance`, `guide-testing`, `guide-versioning`

---

## 🛠️ Development

### Build

```bash
pnpm build  # Compiles TypeScript to dist/
```

### Testing with MCP Inspector

```bash
# List all tools
npx @modelcontextprotocol/inspector \
  -e LATITUDE_API_KEY=your-key \
  -e LATITUDE_PROJECT_ID=your-id \
  --cli node dist/index.js \
  --method tools/list

# Test list_prompts
npx @modelcontextprotocol/inspector \
  -e LATITUDE_API_KEY=your-key \
  -e LATITUDE_PROJECT_ID=your-id \
  --cli node dist/index.js \
  --method tools/call \
  --tool-name list_prompts

# Test add_prompt with file
npx @modelcontextprotocol/inspector \
  -e LATITUDE_API_KEY=your-key \
  -e LATITUDE_PROJECT_ID=your-id \
  --cli node dist/index.js \
  --method tools/call \
  --tool-name add_prompt \
  --tool-arg 'filePaths=["./prompts/test.promptl"]'

# Test from npm package
npx @modelcontextprotocol/inspector \
  -e LATITUDE_API_KEY=your-key \
  -e LATITUDE_PROJECT_ID=your-id \
  --cli npx -y mcp-latitude-ai@3.1.0 \
  --method tools/call \
  --tool-name list_prompts
```

### Local Development

```bash
# Build and run
pnpm build
node dist/index.js

# With environment variables
LATITUDE_API_KEY=xxx LATITUDE_PROJECT_ID=yyy node dist/index.js

# Watch mode (requires nodemon)
pnpm add -g nodemon
nodemon --watch src --exec "pnpm build && node dist/index.js"
```

---

## Project Structure

```
mcp-latitude-ai/
├── src/
│   ├── docs/              # Documentation system (52 topics)
│   │   ├── types.ts       # Type definitions
│   │   ├── metadata.ts    # Search metadata
│   │   ├── help.ts        # Help content
│   │   ├── core-syntax.ts # Core PromptL syntax (12 topics)
│   │   ├── phase1.ts      # Tier 1 topics (8)
│   │   ├── phase2.ts      # Tier 2 topics (13)
│   │   ├── phase3.ts      # Tier 3 topics (6)
│   │   ├── techniques.ts  # Prompting techniques (8)
│   │   ├── recipes.ts     # Use case recipes (5)
│   │   └── index.ts       # DOCS_MAP + functions
│   ├── utils/             # Utilities
│   │   ├── config.util.ts # Environment config
│   │   └── logger.util.ts # Logging
│   ├── api.ts             # Latitude API client
│   ├── docs.ts            # Documentation exports
│   ├── index.ts           # MCP server entry
│   ├── server.ts          # MCP server setup
│   ├── tools.ts           # 8 MCP tools
│   └── types.ts           # Type definitions
├── scripts/
│   └── ensure-executable.js
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LATITUDE_API_KEY` | Yes | Your Latitude API key |
| `LATITUDE_PROJECT_ID` | Yes | Your project ID |
| `DEBUG` | No | Enable debug logging |

---

## PromptL Syntax Overview

PromptL is a templating language for AI prompts:

```promptl
---
provider: OpenAI
model: gpt-4o
temperature: 0.7
schema:
  type: object
  properties:
    answer:
      type: string
  required: [answer]
---
<system>
You are a helpful assistant.
</system>

<user>
{{ question }}
</user>
```

**Key Features:**
- YAML config header (provider, model, temperature)
- Message tags (`<system>`, `<user>`, `<assistant>`)
- Variables (`{{ name }}`)
- Conditionals (`{{ if }}`, `{{ else }}`)
- Loops (`{{ for item in items }}`)
- Tools (function calling)
- Chains (multi-step `<step>`)
- Agents (autonomous `type: agent`)

Use `docs({ action: "get", topic: "overview" })` for complete guide.

---

## 📖 Tool Reference

### list_prompts()

List all prompts in LIVE version.

**Returns:** Array of prompt names with project ID

**Example:**
```javascript
list_prompts()
// Returns: cover-letter-generate, sentiment-analyzer, email-writer (10 total)
```

---

### get_prompt({ name })

Get full prompt content by name.

**Parameters:**
- `name` (string) - Prompt name

**Returns:** Full PromptL content with config and messages

**Example:**
```javascript
get_prompt({ name: "email-writer" })
// Returns full .promptl content
```

---

### run_prompt({ name, parameters })

🎯 **Dynamic:** Execute a prompt. Tool description shows all prompts with their parameters!

**Parameters:**
- `name` (string) - Prompt name
- `parameters` (object, optional) - Input parameters

**Returns:** AI response with token usage

**Dynamic Description:**
```
Available prompts (10):
- email-writer (params: recipient, topic)
- sentiment-analyzer (no params)
- cover-letter-generate (params: job_details, career_patterns, company_name)
```

**Example:**
```javascript
run_prompt({
  name: "email-writer",
  parameters: { recipient: "Alice", topic: "update" }
})
```

---

### add_prompt({ prompts?, filePaths?, versionName? })

🎯 **Dynamic:** Add or update prompts without deleting others. Tool description shows available prompts!

**Behavior:** If prompt exists → overwrites. If new → adds. Never deletes other prompts.

**Parameters (choose one):**

**Option A - Direct content:**
- `prompts` (array) - Array of `{ name, content }`

**Option B - From files:**
- `filePaths` (array) - Array of paths to `.promptl` files

**Common:**
- `versionName` (string, optional) - Git-style name like `feat/add-auth` or `fix/typo`

**Returns:** Summary of added/updated prompts

**Example:**
```javascript
add_prompt({
  filePaths: ["./prompts/new-prompt.promptl"],
  versionName: "feat/add-new-prompt"
})
```

---

### push_prompts({ prompts?, filePaths?, versionName? })

🔄 **FULL SYNC:** Replace ALL prompts in LIVE. Deletes remote prompts not in your list.

**Use for:** Initial setup, complete sync, resetting LIVE to match local.

**Parameters (choose one):**

**Option A - Direct content:**
- `prompts` (array) - Array of `{ name, content }`

**Option B - From files:**
- `filePaths` (array) - Array of paths to `.promptl` files

**Common:**
- `versionName` (string, optional) - Git-style name like `feat/initial-setup`

**Returns:** Summary of added/modified/deleted prompts

**Example:**
```javascript
push_prompts({
  filePaths: ["./prompts/prompt-a.promptl", "./prompts/prompt-b.promptl"],
  versionName: "feat/complete-rewrite"
})
```

---

### pull_prompts({ outputDir? })

🔄 **FULL SYNC:** Download all prompts from LIVE. Deletes existing local `.promptl` files first.

**Use for:** Initial clone, resetting local to match LIVE.

**Parameters:**
- `outputDir` (string, optional) - Output directory (default: `./prompts`)

**Returns:** List of downloaded files

**Example:**
```javascript
pull_prompts({ outputDir: "./my-prompts" })
```

---

### docs({ action, topic?, query? })

Access comprehensive PromptL documentation (52 topics).

**Parameters:**
- `action` (string) - `"help"` (overview), `"get"` (topic), or `"find"` (search)
- `topic` (string, optional) - Topic name for `"get"`
- `query` (string, optional) - Search query for `"find"`

**Returns:** Documentation content

**Examples:**
```javascript
docs({ action: "help" })                      // Overview
docs({ action: "find", query: "json output" }) // Semantic search
docs({ action: "get", topic: "chains" })       // Specific topic
```

---

## ✅ Validation Features

### Client-Side Validation with AST

All write operations (`add_prompt`, `push_prompts`) validate prompts **before** making API calls using the official `promptl-ai` library.

**Benefits:**
- ⚡ **Fast feedback** - No wasted API calls
- 🎯 **Precise errors** - Exact line and column numbers
- 📝 **Code frames** - See surrounding context with `^~~~` pointer
- 🤖 **LLM-actionable** - Errors include root cause and fix suggestions

### Atomic Operations

**Validate ALL, push ALL or NOTHING:**

```javascript
// Trying to push 10 prompts, but 1 has an error
add_prompt({
  filePaths: [
    "./prompts/valid-1.promptl",
    "./prompts/valid-2.promptl",
    "./prompts/BROKEN.promptl",  // Has nested tags
    // ... 7 more valid prompts
  ]
})

// Result: NOTHING is pushed
// Error shows exactly what's wrong in BROKEN.promptl
// Fix the error, retry → all 10 push successfully
```

### Error Message Example

```
❌ Validation Failed - No Changes Made

1 prompt(s) have errors.

### my-prompt
Error Code: `message-tag-inside-message`
Error: Message tags cannot be inside of another message
Root Cause: Message/role tags cannot be nested inside each other.
Location: Line 107, Column 1
Code Context:
```
105: ## EXAMPLES
106: 
107: <assistant>

      ^~~~~~~~~~~~
108: questions:
109:   - id: q1
```
Fix: Move the nested tag outside its parent. Use code block (```yaml) instead.
```

### Supported Error Types

- `message-tag-inside-message` - Nested role tags
- `content-tag-inside-content` - Nested content tags
- `config-not-found` - Missing YAML frontmatter
- `invalid-config` - Malformed YAML
- `unclosed-block` - Missing closing tag
- `variable-not-defined` - Undefined variable
- `invalid-tool-call-placement` - Tool call outside `<assistant>`
- ...and more from official `promptl-ai` compiler

---

## 🔄 Migration Guide (v2 → v3)

### Tool Changes

| Old Tool (v2) | New Tool (v3) | Notes |
|---------------|---------------|-------|
| `append_prompts` | `add_prompt` | Always overwrites if exists (no `overwrite` param needed) |
| `replace_prompt` | `add_prompt` | Same behavior, unified tool |

**Migration:**
```javascript
// OLD (v2)
append_prompts({ filePaths: [...], overwrite: true })
replace_prompt({ filePath: "./prompt.promptl" })

// NEW (v3)
add_prompt({ filePaths: [...] })  // Always overwrites if exists
```

---

## 🔧 Troubleshooting

### "Validation Failed" Errors

**Problem:** Prompt fails with nested tag error

**Solution:** The error shows exact location with code frame:
```
Error Code: `message-tag-inside-message`
Location: Line 4, Column 7
Code Context:
4: <user><assistant>Nested!</assistant></user>
          ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Fix: Move the nested tag outside its parent.
```

Follow the fix suggestion - errors are LLM-actionable!

### "No Changes Made" After Push

**Problem:** `push_prompts` reports no changes

**Cause:** All prompts are already up to date (content matches LIVE)

**Solution:** This is normal - no action needed

### Version Naming Best Practices

**Good:**
- `feat/add-sentiment-analyzer`
- `fix/typo-in-greeting`
- `refactor/simplify-prompts`
- `docs/update-examples`

**Avoid:**
- `test` (too vague)
- `update` (what was updated?)
- `v1.2.3` (use semantic versioning elsewhere)

### Dynamic Descriptions Not Updating

**Problem:** Tool descriptions show old prompt list

**Cause:** Cache not refreshed (30s TTL)

**Solution:** Wait 30 seconds or restart MCP server

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm build` to verify
5. Submit a pull request

---

## License

ISC License - see LICENSE file for details

---

## Links

- [Latitude Platform](https://latitude.so)
- [Latitude Documentation](https://docs.latitude.so)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [npm Package](https://www.npmjs.com/package/mcp-latitude-ai)
- [GitHub Repository](https://github.com/yigitkonur/mcp-latitude-ai)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/yigitkonur/mcp-latitude-ai/issues)
- **Documentation:** Use `docs({ action: "help" })` tool
- **Latitude Support:** [Latitude Discord](https://discord.gg/latitude)

---

**Built with ❤️ for the MCP ecosystem**
