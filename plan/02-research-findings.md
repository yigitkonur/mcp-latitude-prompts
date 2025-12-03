# Research Findings: PromptL Syntax & Documentation Structure

**Date:** 2024-12-02
**Research Scope:** PromptL syntax extraction + codebase pattern analysis
**Files Analyzed:** 4 codebase files
**External Sources:** User-provided Latitude documentation (~200KB)

---

## Key Facts

### Fact 1: Codebase Tool Registration Pattern
**Source:** `src/tools/latitude.tool.ts:505-518`
**Evidence:**
```typescript
server.registerTool(
  'latitude_list_projects',
  {
    title: 'List Latitude Projects',
    description: LIST_PROJECTS_DESC,
    inputSchema: ListProjectsInputSchema,
  },
  handleListProjects,
);
```
**Relevance:** New docs tools must follow this exact pattern - name, metadata object with title/description/inputSchema, handler function.

### Fact 2: Zod Schema Pattern for Tool Inputs
**Source:** `src/types/latitude.types.ts:264-268`
**Evidence:**
```typescript
export const CreateProjectInputSchema = z.object({
  name: z.string().describe('Project name'),
});
```
**Relevance:** Documentation tool schema needs `topic` enum with `.describe()` for each option.

### Fact 3: Resource Registration Pattern
**Source:** `src/resources/latitude.resource.ts:22-50`
**Evidence:**
```typescript
server.registerResource(
  'latitude-projects',
  new ResourceTemplate('latitude://projects', { list: undefined }),
  { title: 'Latitude Projects', description: '...' },
  async (uri) => { /* handler */ }
);
```
**Relevance:** Documentation resources should follow: `docs://latitude/{topic}` URI pattern.

### Fact 4: Tool Response Format
**Source:** `src/tools/latitude.tool.ts:231-241`
**Evidence:**
```typescript
return { content: [{ type: 'text' as const, text: result.content }] };
```
**Relevance:** Documentation tools should return same format. Can add second content block for guidance (best practice from research).

---

## PromptL Syntax Extraction

### Topic 1: OVERVIEW
**Purpose:** Introduction to PromptL, what it is, why use it
**Key Points:**
- PromptL = Prompt Templating Language for Latitude
- Two sections: Config (YAML) + Messages (XML-like)
- Supports variables, conditionals, loops, references
- Works with any LLM provider (OpenAI, Anthropic, etc.)

### Topic 2: STRUCTURE
**Purpose:** Basic prompt structure - config + messages
**Key Points:**
- Config section enclosed in `---` (triple dashes)
- YAML format for config (model, temperature, etc.)
- Messages are chat-based: system, user, assistant, tool
- System message = plain text (no tags needed)
- Other messages use XML tags: `<user>`, `<assistant>`, `<tool>`

**Example:**
```yaml
---
provider: OpenAI
model: gpt-4o
temperature: 0.7
---
You are a helpful assistant.

<user>
  Hello, how are you?
</user>
```

### Topic 3: VARIABLES
**Purpose:** Dynamic content with `{{ }}` syntax
**Key Points:**
- Interpolation: `{{ variable_name }}`
- Assignment: `{{ myVar = "value" }}`
- Default values: `{{ name || "default" }}`
- Expressions: `{{ price * quantity }}`
- Object access: `{{ user.name }}`, `{{ data['key'] }}`
- Array access: `{{ items[0] }}`

**Example:**
```
{{ greeting = "Hello" }}
{{ name = user.firstName || "Guest" }}

<user>
  {{ greeting }}, {{ name }}! Your total is ${{ price * quantity }}.
</user>
```

### Topic 4: CONDITIONALS
**Purpose:** Dynamic content based on conditions
**Key Points:**
- Syntax: `{{ if condition }}...{{ else }}...{{ endif }}`
- Boolean operators: `&&`, `||`, `!`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Nested conditions supported
- Can check variable existence: `{{ if myVar }}`

**Example:**
```
{{ if user.role == "admin" }}
  <system>User has admin privileges.</system>
{{ else if user.role == "moderator" }}
  <system>User has moderator access.</system>
{{ else }}
  <system>User has standard access.</system>
{{ endif }}
```

### Topic 5: LOOPS
**Purpose:** Iterate over arrays/collections
**Key Points:**
- Syntax: `{{ for item in items }}...{{ endfor }}`
- Index access: `{{ for item, index in items }}`
- Works with arrays and objects
- Can be nested
- Useful for few-shot examples

**Example:**
```
{{ for example in examples }}
<user>{{ example.input }}</user>
<assistant>{{ example.output }}</assistant>
{{ endfor }}

<user>{{ userInput }}</user>
```

### Topic 6: REFERENCES
**Purpose:** Include other prompts with `<prompt>`
**Key Points:**
- Syntax: `<prompt path="other-prompt" />`
- Pass parameters: `<prompt path="helper" param1="value" />`
- Supports relative paths: `<prompt path="../shared/common" />`
- Chain prompts together for modular design
- Referenced prompt's output becomes part of current prompt

**Example:**
```
---
provider: OpenAI
model: gpt-4o
---
<prompt path="system-instructions" />

<user>
  {{ userQuestion }}
</user>
```

### Topic 7: TOOLS (Function Calling)
**Purpose:** Define tools/functions for LLM to call
**Key Points:**
- Define in config section under `tools:`
- Each tool has: name, description, parameters (JSON Schema)
- LLM can call tools, get results, continue conversation
- Supports multiple tools per prompt

**Example:**
```yaml
---
provider: OpenAI
model: gpt-4o
tools:
  - name: get_weather
    description: Get current weather for a location
    parameters:
      type: object
      properties:
        location:
          type: string
          description: City name
      required:
        - location
---
You are a weather assistant.

<user>What's the weather in Tokyo?</user>
```

### Topic 8: CHAINS (Step-by-Step)
**Purpose:** Multi-step prompts with `<step>` tags
**Key Points:**
- Wrap each step in `<step>` tags
- Each step runs sequentially
- Previous step output available to next step
- Use for: reasoning chains, data transformation, multi-stage analysis
- `response` variable holds previous step's result

**Example:**
```
---
provider: OpenAI
model: gpt-4o
---
<step>
Analyze the following text and extract key themes:
{{ inputText }}
</step>

<step>
Based on the themes identified:
{{ response }}

Now generate a summary.
</step>
```

### Topic 9: AGENTS (Multi-Agent)
**Purpose:** Orchestrate multiple AI agents
**Key Points:**
- Config: `type: agent` + `agents: [list]`
- Each agent is a separate prompt file
- Main prompt orchestrates agent calls
- Agents can call other agents
- Use for: complex workflows, specialized tasks

**Example:**
```yaml
---
provider: OpenAI
model: gpt-4o
type: agent
agents:
  - agents/researcher
  - agents/writer
  - agents/editor
---
# Content Creation Team

Coordinate the team to create an article about: {{ topic }}

1. Researcher gathers information
2. Writer creates draft
3. Editor reviews and polishes
```

### Topic 10: TECHNIQUES
**Purpose:** Prompting best practices and patterns
**Key Points:**

**Few-Shot Learning:**
- Provide examples before the actual task
- Use loops to inject examples dynamically
- Format: input → output pairs

**Chain-of-Thought (CoT):**
- Add "Let's think step by step"
- Break complex problems into steps
- Show reasoning process

**Tree of Thoughts (ToT):**
- Explore multiple reasoning branches
- Evaluate each branch
- Select best path

**Role Prompting:**
- Assign specific persona/expertise
- Define communication style
- Include credentials/experience

---

## Documentation Structure Pattern

Each topic documentation should follow this structure:

```markdown
# {Topic Title}

## Overview
Brief description of what this feature does and when to use it.

## Syntax
```code
Exact syntax with placeholders
```

## Parameters (if applicable)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|

## Examples
### Basic Example
```promptl
...
```

### Advanced Example
```promptl
...
```

## Common Patterns
- Pattern 1: Description
- Pattern 2: Description

## Tips & Best Practices
- Tip 1
- Tip 2

## Next Steps
**Related Topics:** [topic1], [topic2]
**Suggested Tools:** `latitude_tool_name`
```

---

## Dependencies & Relationships

```
OVERVIEW
   ↓
STRUCTURE ──→ CONFIG + MESSAGES
   ↓
VARIABLES ──→ Used everywhere
   ↓
CONDITIONALS ←→ LOOPS (can be combined)
   ↓
REFERENCES ──→ Modular prompts
   ↓
TOOLS ──→ Function calling
   ↓
CHAINS ──→ Multi-step
   ↓
AGENTS ──→ Multi-agent (uses all above)
   ↓
TECHNIQUES ──→ Best practices (applies to all)
```

---

## Tool Design Decisions

### Option A: Multiple Tools (Rejected)
```
latitude_docs_overview
latitude_docs_structure
latitude_docs_variables
... (10 tools)
```
**Problems:** Clutters tool list, harder to discover, verbose.

### Option B: Single Tool with Enum (Selected)
```typescript
latitude_get_docs({ topic: "variables" })
```
**Benefits:**
- Single entry point
- Discoverable enum values in description
- Extensible (add topics without new tools)
- Clean tool list

### Help Tool Design
```typescript
latitude_help()  // No parameters
```
Returns:
- All available tools with brief descriptions
- All available resources
- Common workflows
- Quick start guide

---

## Response Pattern: JSON + Guidance

Following MCP best practice "every tool response is an opportunity to prompt":

```typescript
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        topic: 'variables',
        summary: 'Dynamic content with {{ }} syntax',
        sections: ['syntax', 'examples', 'patterns'],
      }, null, 2),
      mimeType: 'application/json'
    },
    {
      type: 'text',
      text: `# Variables in PromptL

## Overview
Variables let you inject dynamic content...

## Next Steps
**Related:** Call \`latitude_get_docs\` with topic "conditionals" or "loops"
**Try:** Use \`latitude_push_prompt\` to create a prompt with variables`
    }
  ]
};
```

---

## Insights & Conclusions

1. **Single `latitude_get_docs` tool is optimal** — enum parameter with 10 topics keeps things clean and discoverable.

2. **Help tool as entry point** — `latitude_help` should be the first thing an AI calls to understand the server.

3. **Documentation should include nextActions** — guide AI to related tools/topics after reading docs.

4. **Structure content for AI consumption** — clear sections, code examples, explicit syntax patterns.

5. **Keep examples realistic** — use practical PromptL examples that agents can adapt.

6. **Cross-reference topics** — each topic should link to related topics for progressive learning.
