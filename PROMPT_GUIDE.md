---
description: Complete guide for LLMs to autonomously manage, test, and optimize PromptL prompts via MCP
auto_execution_mode: 3
---

# LATITUDE MCP SERVER - LLM GUIDE

> "Autonomous prompt engineering: Create → Validate → Test → Iterate → Optimize"

## CRITICAL WORKFLOW

```
1. pull_prompts  → Download all prompts to ./prompts/*.promptl
2. Edit locally  → Your IDE, full context
3. add_prompt    → Push with validation (overwrites if exists)
4. run_prompt    → Test with parameters
5. Iterate       → Analyze output → improve → re-push → re-test
```

**7 MCP tools. Client-side validation. Dynamic descriptions. Git-style versioning.**

---

## THE 7 TOOLS

| Tool | Type | Purpose | Dynamic Feature |
|------|------|---------|-----------------|
| `list_prompts` | Read | List all prompt names in LIVE | — |
| `get_prompt` | Read | Get full prompt content by name | — |
| `run_prompt` | Execute | Execute prompt with parameters | 🎯 Shows all prompts with their params |
| `pull_prompts` | Sync | Download LIVE → `./prompts/*.promptl` (FULL SYNC) | — |
| `add_prompt` | Write | Add/update prompts (overwrites if exists, never deletes others) | 🎯 Shows available prompts |
| `push_prompts` | Sync | Replace ALL prompts (FULL SYNC, deletes extras) | — |
| `docs` | Read | Documentation (52 topics, semantic search) | — |

### 🎯 Dynamic Descriptions

**run_prompt** shows you what parameters each prompt needs:
```
Available prompts (10):
- email-writer (params: recipient, topic, tone)
- sentiment-analyzer (no params)
```

**add_prompt** shows you what prompts already exist:
```
Available prompts (10): email-writer, sentiment-analyzer, ...
```

---

## AUTONOMOUS WORKFLOWS

### Create → Test → Iterate

```javascript
// 1. Create prompt
add_prompt({
  prompts: [{
    name: "email-extractor",
    content: `---
provider: openai
model: gpt-4o
temperature: 0.2
schema:
  type: object
  properties:
    email: { type: string }
  required: [email]
---
<user>Extract from: {{ text }}</user>`
  }],
  versionName: "feat/email-extractor-v1"
})

// 2. Test
run_prompt({
  name: "email-extractor",
  parameters: { text: "Contact john@example.com" }
})

// 3. Analyze output → if needs improvement, iterate
add_prompt({
  prompts: [{
    name: "email-extractor",
    content: "... improved version ..."
  }],
  versionName: "fix/improve-accuracy"
})

// 4. Re-test → repeat until quality threshold met
```

### Bulk Testing for Optimization

```bash
# Test multiple prompts with MCP Inspector
for prompt in email-extractor sentiment-analyzer; do
  npx @modelcontextprotocol/inspector \
    -e LATITUDE_API_KEY=$KEY \
    -e LATITUDE_PROJECT_ID=$ID \
    --cli npx -y latitude-mcp-server@3.2.0 \
    --method tools/call \
    --tool-name run_prompt \
    --tool-arg name=$prompt \
    --tool-arg 'parameters={"text":"test"}'
done

# Analyze outputs → update weak prompts → re-test
```

---

## VERSION NAMING

```javascript
// Git-style naming (optional)
versionName: "feat/add-email-extractor"
versionName: "fix/typo-in-system-message"
versionName: "refactor/simplify-logic"
versionName: "perf/reduce-tokens"

// If omitted → auto-generates timestamp
```

---

## VALIDATION

All writes validate BEFORE API calls:

```javascript
add_prompt({
  prompts: [{
    name: "broken",
    content: `<user><assistant>Nested!</assistant></user>`  // ❌
  }]
})

// Error Code: `message-tag-inside-message`
// Location: Line 1, Column 7
// Fix: Move the nested tag outside its parent.
```

---

## SYNC BEHAVIOR

- `push_prompts` - FULL SYNC (deletes extras)
- `pull_prompts` - FULL SYNC (deletes local first)
- `add_prompt` - ADDITIVE (never deletes)

---

## QUICK COMMANDS

```
"Pull all"          → pull_prompts
"Add this file"     → add_prompt(filePaths: ["./prompts/x.promptl"])
"Test prompt"       → run_prompt(name: "x", parameters: {...})
"What params?"      → Check run_prompt description (dynamic)
"What exists?"      → Check add_prompt description (dynamic)
```
