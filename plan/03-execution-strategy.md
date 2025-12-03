# Execution Strategy: Documentation-as-Tools Implementation

**Date:** 2024-12-02
**Based On:** Research from `02-research-findings.md`
**Execution Type:** Hybrid (Code + Content)

---

## Approach

### Why This Approach
Based on MCP best practices research and existing codebase patterns:
- **Single tool with enum** is cleaner than multiple tools
- **Help tool as entry point** guides AI to discover capabilities
- **Dual content blocks** (JSON + markdown) follows "every response is a prompt" pattern
- **Embedded documentation** (no external calls) ensures reliability

### What Will Be Created

| # | File | Purpose |
|---|------|---------|
| 1 | `src/types/docs.types.ts` | Zod schemas for docs tools |
| 2 | `src/docs/promptl.docs.ts` | Documentation content (10 topics) |
| 3 | `src/tools/docs.tool.ts` | Tool handlers (help + get_docs) |
| 4 | `src/resources/docs.resource.ts` | Resource handlers (docs://latitude/*) |
| 5 | `src/index.ts` | Update to register new tools/resources |

---

## File Structure

```
src/
├── docs/
│   └── promptl.docs.ts          # NEW: 10 topic documentation strings
├── tools/
│   ├── latitude.tool.ts         # EXISTING
│   └── docs.tool.ts             # NEW: latitude_help + latitude_get_docs
├── resources/
│   ├── latitude.resource.ts     # EXISTING
│   └── docs.resource.ts         # NEW: docs://latitude/{topic}
├── types/
│   ├── latitude.types.ts        # EXISTING
│   └── docs.types.ts            # NEW: DocsTopicEnum schema
└── index.ts                      # MODIFY: import & register docs
```

---

## Tool Specifications

### Tool 1: `latitude_help`

**Purpose:** Master menu of ALL server capabilities

**Input Schema:**
```typescript
z.object({})  // No parameters
```

**Response:**
```markdown
# Latitude MCP Server

## Available Tools (18 total)

### Documentation
- `latitude_help` - This help menu
- `latitude_get_docs` - Get PromptL documentation by topic

### Projects
- `latitude_list_projects` - List all projects
- `latitude_create_project` - Create new project
...

## Documentation Topics
Call `latitude_get_docs` with one of:
- `overview` - Introduction to PromptL
- `structure` - Config + Messages basics
- `variables` - {{ }} syntax
- `conditionals` - if/else logic
- `loops` - for/each iteration
- `references` - Include other prompts
- `tools` - Function calling
- `chains` - Multi-step prompts
- `agents` - Multi-agent orchestration
- `techniques` - Prompting best practices

## Quick Start Workflow
1. `latitude_list_projects` → Find your project
2. `latitude_get_docs("structure")` → Learn PromptL basics
3. `latitude_push_prompt` → Create your prompt
4. `latitude_run_prompt` → Execute and test

## Resources
- `latitude://projects` - List projects
- `docs://latitude/{topic}` - Documentation
```

### Tool 2: `latitude_get_docs`

**Purpose:** Get PromptL documentation for specific topic

**Input Schema:**
```typescript
z.object({
  topic: z.enum([
    'overview',
    'structure', 
    'variables',
    'conditionals',
    'loops',
    'references',
    'tools',
    'chains',
    'agents',
    'techniques'
  ]).describe(`Documentation topic. Options:
    - overview: What is PromptL, getting started
    - structure: Config section + message types
    - variables: {{ }} interpolation and expressions
    - conditionals: if/else/endif logic
    - loops: for/each iteration over arrays
    - references: Include other prompts with <prompt>
    - tools: Function calling configuration
    - chains: Multi-step prompts with <step>
    - agents: Multi-agent orchestration
    - techniques: Few-shot, CoT, ToT, role prompting`)
})
```

**Response Pattern:**
```typescript
{
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        topic: 'variables',
        title: 'Variables & Expressions',
        sections: ['overview', 'syntax', 'examples', 'patterns', 'next_steps'],
        related_topics: ['conditionals', 'loops'],
        related_tools: ['latitude_push_prompt', 'latitude_get_prompt']
      }, null, 2),
      mimeType: 'application/json'
    },
    {
      type: 'text', 
      text: DOCS_VARIABLES  // Full markdown content
    }
  ]
}
```

---

## Documentation Content Structure

Each topic in `promptl.docs.ts`:

```typescript
export const DOCS_VARIABLES = `# Variables & Expressions

## Overview
Variables in PromptL allow you to inject dynamic content into your prompts using \`{{ }}\` syntax.

## Syntax

### Basic Interpolation
\`\`\`promptl
{{ variable_name }}
\`\`\`

### Assignment
\`\`\`promptl
{{ myVar = "value" }}
{{ count = 42 }}
\`\`\`

### Default Values
\`\`\`promptl
{{ name || "Guest" }}
{{ config.timeout || 30 }}
\`\`\`

### Expressions
\`\`\`promptl
{{ price * quantity }}
{{ firstName + " " + lastName }}
\`\`\`

## Examples

### Example 1: User Greeting
\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
{{ greeting = "Hello" }}
{{ name = user.name || "there" }}

<system>You are a friendly assistant.</system>
<user>{{ greeting }}, {{ name }}!</user>
\`\`\`

### Example 2: Dynamic Pricing
\`\`\`promptl
{{ total = items.length * pricePerItem }}
{{ discount = total > 100 ? 0.1 : 0 }}
{{ finalPrice = total * (1 - discount) }}

Your order total: ${{ finalPrice }}
\`\`\`

## Common Patterns

| Pattern | Syntax | Use Case |
|---------|--------|----------|
| Fallback | \`{{ x \\|\\| "default" }}\` | Handle missing values |
| Object access | \`{{ user.profile.name }}\` | Nested data |
| Array access | \`{{ items[0] }}\` | List items |
| Math | \`{{ a + b * c }}\` | Calculations |

## Tips
- Always provide defaults for optional variables
- Use descriptive variable names
- Keep expressions simple; complex logic goes in conditionals

## Next Steps
- **Related Topics:** \`conditionals\`, \`loops\`
- **Try:** Create a prompt with \`latitude_push_prompt\` using variables
- **Read:** \`latitude_get_docs({ topic: "conditionals" })\`
`;
```

---

## Task Breakdown

### Task 01: Create Docs Types
**File:** `src/types/docs.types.ts`
**Steps:**
1. Create file with Zod schema for topic enum
2. Export `DocsTopicEnum` and `GetDocsInputSchema`
3. Export `HelpInputSchema` (empty object)

**DoD:** File compiles, types exported
**Test:** `npm run build` passes
**If Fail:** Check Zod syntax, compare with latitude.types.ts

---

### Task 02: Create Documentation Content
**File:** `src/docs/promptl.docs.ts`
**Steps:**
1. Create file with 10 exported constants (DOCS_OVERVIEW through DOCS_TECHNIQUES)
2. Each constant is markdown string with: Overview, Syntax, Examples, Patterns, Next Steps
3. Export `DOCS_MAP` object mapping topic → content
4. Export `HELP_CONTENT` markdown for help tool

**DoD:** All 10 topics + help content exported
**Test:** Import in REPL, verify content
**If Fail:** Check string escaping, template literal syntax

---

### Task 03: Create Docs Tools
**File:** `src/tools/docs.tool.ts`
**Steps:**
1. Create file following latitude.tool.ts pattern
2. Implement `handleHelp()` returning HELP_CONTENT
3. Implement `handleGetDocs(topic)` returning DOCS_MAP[topic]
4. Export `registerDocsTools(server)` function
5. Include JSON summary + markdown content in responses

**DoD:** Both tools return correct content
**Test:** MCP inspector call
**If Fail:** Check handler return format, verify import paths

---

### Task 04: Create Docs Resources
**File:** `src/resources/docs.resource.ts`
**Steps:**
1. Create file following latitude.resource.ts pattern
2. Register `docs://latitude/{topic}` resource template
3. Handler returns markdown content for topic
4. Export `registerDocsResources(server)` function

**DoD:** Resources accessible via URI
**Test:** MCP inspector resource read
**If Fail:** Check ResourceTemplate syntax, URI pattern

---

### Task 05: Update Index
**File:** `src/index.ts`
**Steps:**
1. Import `docsTools` from `./tools/docs.tool.js`
2. Import `docsResources` from `./resources/docs.resource.js`
3. Call `docsTools.registerTools(serverInstance)` after latitude tools
4. Call `docsResources.registerResources(serverInstance)` after latitude resources

**DoD:** Server starts with all tools/resources
**Test:** `npm run mcp:stdio` then check with inspector
**If Fail:** Check import paths (.js extension), registration order

---

### Task 06: Integration Test
**Steps:**
1. Run `npm run build`
2. Run `npm run mcp:inspect`
3. Test `latitude_help` tool
4. Test `latitude_get_docs` with each topic
5. Test `docs://latitude/variables` resource

**DoD:** All tools and resources work correctly
**Test:** Manual verification in inspector
**If Fail:** Check console errors, debug handler logic

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Documentation too verbose | Medium | Low | Keep each topic ~500 words, link to related topics |
| Enum not discovered by AI | Low | Medium | List all topics in tool description + help output |
| Build failures | Low | High | Follow existing patterns exactly, incremental testing |
| Content outdated | Low | Low | Single source file easy to update |

---

## Success Criteria

- [ ] `npm run build` passes without errors
- [ ] `latitude_help` returns comprehensive server overview
- [ ] `latitude_get_docs` returns correct content for all 10 topics
- [ ] Each doc includes: Overview, Syntax, Examples, Next Steps
- [ ] Resources accessible at `docs://latitude/{topic}`
- [ ] Documentation includes actionable `nextActions` suggestions
- [ ] Total new tools: 2 (`latitude_help`, `latitude_get_docs`)
- [ ] Total doc topics: 10

---

## Dependencies

**Requires:**
- Existing server infrastructure (index.ts, McpServer)
- Zod library (already installed)
- Existing patterns from latitude.tool.ts / latitude.resource.ts

**Blocks:**
- Nothing - this is additive, doesn't modify existing functionality

---

## Execution Order

```
Task 01 (types) → Task 02 (content) → Task 03 (tools) → Task 04 (resources) → Task 05 (index) → Task 06 (test)
     ↓                  ↓                    ↓                  ↓                    ↓
  5 min             30 min              15 min             10 min              5 min         10 min
```

**Total Estimated Time:** ~75 minutes
