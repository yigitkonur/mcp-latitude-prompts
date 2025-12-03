/**
 * PromptL Documentation Content
 *
 * Comprehensive documentation for all PromptL syntax features.
 * Each topic is exported as a markdown string constant.
 *
 * Topics:
 * - overview: Introduction to PromptL
 * - structure: Config + Messages
 * - variables: {{ }} syntax
 * - conditionals: if/else/endif
 * - loops: for/each iteration
 * - references: <prompt> tag
 * - tools: Function calling
 * - chains: <step> multi-step
 * - agents: Multi-agent orchestration
 * - techniques: Few-shot, CoT, ToT, Role prompting
 */

import type { DocsTopic } from '../types/docs.types.js';

// ============================================================================
// HELP CONTENT - Server Overview
// ============================================================================

export const HELP_CONTENT = `# Latitude MCP Server

Your AI-powered interface for managing prompts on Latitude.so.

## Available Tools (18 total)

### 📚 Documentation
| Tool | Description |
|------|-------------|
| \`latitude_help\` | This help menu - start here! |
| \`latitude_get_docs\` | Get PromptL documentation by topic |

### 📁 Projects
| Tool | Description |
|------|-------------|
| \`latitude_list_projects\` | List all projects in workspace |
| \`latitude_create_project\` | Create a new project |

### 🔀 Versions
| Tool | Description |
|------|-------------|
| \`latitude_list_versions\` | List versions (commits) for a project |
| \`latitude_get_version\` | Get version details |
| \`latitude_create_version\` | Create a draft version |
| \`latitude_publish_version\` | Publish draft to live |

### 📝 Prompts
| Tool | Description |
|------|-------------|
| \`latitude_list_prompts\` | List prompts in a version |
| \`latitude_get_prompt\` | Get prompt content by path |
| \`latitude_push_prompt\` | Push prompt content to draft |
| \`latitude_push_prompt_from_file\` | Push from local file |
| \`latitude_push_changes\` | Push multiple changes at once |

### 🤖 Execution
| Tool | Description |
|------|-------------|
| \`latitude_run_prompt\` | Execute prompt with parameters |
| \`latitude_chat\` | Continue a conversation |
| \`latitude_get_conversation\` | Get conversation history |
| \`latitude_stop_conversation\` | Stop ongoing generation |
| \`latitude_create_log\` | Log execution for analytics |

---

## 📖 Documentation Topics

Call \`latitude_get_docs\` with one of these topics:

| Topic | What You'll Learn |
|-------|------------------|
| \`overview\` | What is PromptL, getting started |
| \`structure\` | Config section + message types |
| \`variables\` | \`{{ }}\` syntax, expressions, defaults |
| \`conditionals\` | \`if/else/endif\` logic |
| \`loops\` | \`for/each\` iteration |
| \`references\` | Include prompts with \`<prompt>\` |
| \`tools\` | Function calling with JSON Schema |
| \`chains\` | Multi-step with \`<step>\` tags |
| \`agents\` | Multi-agent orchestration |
| \`techniques\` | Few-shot, CoT, ToT, Role prompting |

---

## 🚀 Quick Start Workflow

\`\`\`
1. latitude_list_projects        → Find your project
2. latitude_get_docs("structure") → Learn PromptL basics
3. latitude_create_version       → Create a draft
4. latitude_push_prompt          → Add your prompt
5. latitude_run_prompt           → Test it!
6. latitude_publish_version      → Go live
\`\`\`

---

## 📚 Resources (Read-Only)

| Resource URI | Description |
|-------------|-------------|
| \`latitude://projects\` | List all projects |
| \`latitude://projects/{id}/versions\` | List versions |
| \`latitude://projects/{id}/versions/{uuid}/prompts\` | List prompts |
| \`docs://latitude/{topic}\` | Documentation by topic |

---

## 💡 Tips

- **Start with \`latitude_get_docs("overview")\`** to understand PromptL
- **Use "live" for production**, create drafts for testing
- **Can only push to draft versions**, not "live"
- **File push auto-derives path** from filename

**Need help with a specific topic?** Call \`latitude_get_docs\` with the topic name.
`;

// ============================================================================
// TOPIC: OVERVIEW
// ============================================================================

export const DOCS_OVERVIEW = `# PromptL Overview

> The prompt templating language for Latitude.so

## What is PromptL?

PromptL is a powerful templating language designed for creating dynamic, reusable AI prompts. It combines:

- **YAML configuration** for model settings
- **XML-like message tags** for conversation structure
- **Mustache-style variables** for dynamic content
- **Logic constructs** for conditionals and loops

## Why Use PromptL?

| Feature | Benefit |
|---------|---------|
| **Version Control** | Track prompt changes like code |
| **Reusability** | Share prompts across projects |
| **Dynamic Content** | Inject variables at runtime |
| **Provider Agnostic** | Works with OpenAI, Anthropic, Google, etc. |
| **Testability** | Run prompts directly from API |

## Quick Example

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
temperature: 0.7
---
You are a helpful assistant that speaks {{ language || "English" }}.

<user>
  {{ user_question }}
</user>
\`\`\`

## Core Concepts

### 1. Config Section
YAML between \`---\` delimiters. Sets provider, model, and parameters.

### 2. Messages
Chat-based structure with roles: \`system\`, \`user\`, \`assistant\`, \`tool\`.

### 3. Variables
Dynamic content with \`{{ variable }}\` syntax.

### 4. Logic
Conditionals (\`if/else\`) and loops (\`for/each\`) for dynamic prompts.

### 5. Advanced Features
- **References**: Include other prompts
- **Chains**: Multi-step reasoning
- **Agents**: Multi-agent orchestration
- **Tools**: Function calling

---

## Getting Started

1. **Create a project**: \`latitude_create_project\`
2. **Create a draft**: \`latitude_create_version\`
3. **Push a prompt**: \`latitude_push_prompt\`
4. **Test it**: \`latitude_run_prompt\`
5. **Go live**: \`latitude_publish_version\`

---

## Next Steps

- **Learn structure**: \`latitude_get_docs({ topic: "structure" })\`
- **Master variables**: \`latitude_get_docs({ topic: "variables" })\`
- **Add logic**: \`latitude_get_docs({ topic: "conditionals" })\`
`;

// ============================================================================
// TOPIC: STRUCTURE
// ============================================================================

export const DOCS_STRUCTURE = `# Prompt Structure

> Config section + Messages = Complete prompt

## Overview

Every PromptL prompt has two sections:

1. **Config Section** (optional) - YAML settings between \`---\`
2. **Messages** - Conversation flow with role tags

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
temperature: 0.7
---
You are a helpful assistant.

<user>
  Hello, how can you help me?
</user>
\`\`\`

---

## Config Section

The config section is **optional** but recommended. It uses YAML format:

\`\`\`yaml
---
provider: OpenAI
model: gpt-4o-mini
temperature: 0.6
top_p: 0.9
maxTokens: 1000
---
\`\`\`

### Required Settings

| Setting | Description | Example |
|---------|-------------|---------|
| \`provider\` | AI provider name | \`OpenAI\`, \`Anthropic\`, \`Google\` |
| \`model\` | Model identifier | \`gpt-4o\`, \`claude-3-opus\`, \`gemini-pro\` |

### Generation Parameters

| Parameter | Description | Range |
|-----------|-------------|-------|
| \`temperature\` | Randomness (lower = focused) | 0.0 - 2.0 |
| \`maxTokens\` | Max response length | 1 - model max |
| \`topP\` | Nucleus sampling | 0.0 - 1.0 |
| \`topK\` | Top-K sampling | 1 - vocabulary size |
| \`presencePenalty\` | Avoid repetition | -2.0 - 2.0 |
| \`frequencyPenalty\` | Avoid frequent words | -2.0 - 2.0 |

### Advanced Settings

| Setting | Description |
|---------|-------------|
| \`seed\` | For reproducible outputs |
| \`stopSequences\` | Stop generation at these strings |
| \`maxSteps\` | Max steps for chains/agents (default: 20) |
| \`maxRetries\` | Retry failed calls (default: 2) |
| \`schema\` | JSON Schema for structured output |
| \`tools\` | Available functions for model to call |

---

## Messages

Messages define the conversation. Use XML-like tags:

### System Message (Default)

Text without tags is a **system message**:

\`\`\`promptl
You are a helpful assistant.
\`\`\`

### User Message

\`\`\`promptl
<user>
  What's the weather like today?
</user>
\`\`\`

### Assistant Message

\`\`\`promptl
<assistant>
  I'd be happy to help! What city are you in?
</assistant>
\`\`\`

### Tool Message

\`\`\`promptl
<tool id="call_123" name="get_weather">
  {"temperature": 72, "condition": "sunny"}
</tool>
\`\`\`

---

## Complete Example

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
temperature: 0.7
maxTokens: 500
---
You are a knowledgeable travel assistant. Help users plan trips.
Be concise but informative. Always ask clarifying questions.

<user>
  I want to plan a vacation.
</user>

<assistant>
  I'd love to help you plan a vacation! To give you the best recommendations:
  1. What's your budget range?
  2. Do you prefer beaches, cities, or nature?
  3. When are you planning to travel?
</assistant>

<user>
  {{ user_input }}
</user>
\`\`\`

---

## Tips

- **Temperature 0** enables response caching
- **Use either** \`temperature\` OR \`topP\`, not both
- **System messages** set the AI's behavior and context
- **Message order matters** - it's a conversation flow

---

## Next Steps

- **Add variables**: \`latitude_get_docs({ topic: "variables" })\`
- **Add logic**: \`latitude_get_docs({ topic: "conditionals" })\`
- **Try tools**: \`latitude_get_docs({ topic: "tools" })\`
`;

// ============================================================================
// TOPIC: VARIABLES
// ============================================================================

export const DOCS_VARIABLES = `# Variables & Expressions

> Dynamic content with \`{{ }}\` syntax

## Overview

Variables let you inject dynamic content into prompts at runtime. Use double curly braces: \`{{ variable_name }}\`

\`\`\`promptl
Hello, {{ user_name }}! How can I help you today?
\`\`\`

---

## Syntax Reference

### Basic Interpolation

\`\`\`promptl
{{ variable_name }}
\`\`\`

### Variable Assignment

\`\`\`promptl
{{ greeting = "Hello" }}
{{ count = 42 }}
{{ is_premium = true }}
\`\`\`

### Default Values

\`\`\`promptl
{{ name || "Guest" }}
{{ config.timeout || 30 }}
{{ items || [] }}
\`\`\`

### Expressions

\`\`\`promptl
{{ price * quantity }}
{{ firstName + " " + lastName }}
{{ age >= 18 }}
{{ items.length }}
\`\`\`

### Object Access

\`\`\`promptl
{{ user.name }}
{{ user.profile.email }}
{{ data['key-with-dashes'] }}
\`\`\`

### Array Access

\`\`\`promptl
{{ items[0] }}
{{ users[index].name }}
{{ results[results.length - 1] }}
\`\`\`

---

## Examples

### Example 1: User Greeting

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
{{ greeting = "Hello" }}
{{ name = user.firstName || "there" }}

You are a friendly assistant.

<user>
  {{ greeting }}, {{ name }}! I need help with {{ topic }}.
</user>
\`\`\`

**Parameters:**
\`\`\`json
{
  "user": { "firstName": "Alice" },
  "topic": "coding"
}
\`\`\`

### Example 2: Dynamic Pricing

\`\`\`promptl
{{ subtotal = items.length * pricePerItem }}
{{ discount = subtotal > 100 ? 0.1 : 0 }}
{{ total = subtotal * (1 - discount) }}

Your order summary:
- Items: {{ items.length }}
- Subtotal: \${{ subtotal }}
- Discount: {{ discount * 100 }}%
- Total: \${{ total }}
\`\`\`

### Example 3: Conditional Content

\`\`\`promptl
{{ language = user.language || "English" }}
{{ formality = user.isPremium ? "formal" : "casual" }}

You are a {{ formality }} assistant that responds in {{ language }}.
\`\`\`

---

## Operators

| Operator | Example | Description |
|----------|---------|-------------|
| \`+\` | \`a + b\` | Addition / Concatenation |
| \`-\` | \`a - b\` | Subtraction |
| \`*\` | \`a * b\` | Multiplication |
| \`/\` | \`a / b\` | Division |
| \`%\` | \`a % b\` | Modulo |
| \`==\` | \`a == b\` | Equality |
| \`!=\` | \`a != b\` | Inequality |
| \`<\` | \`a < b\` | Less than |
| \`>\` | \`a > b\` | Greater than |
| \`<=\` | \`a <= b\` | Less or equal |
| \`>=\` | \`a >= b\` | Greater or equal |
| \`&&\` | \`a && b\` | Logical AND |
| \`\\|\\|\` | \`a \\|\\| b\` | Logical OR / Default |
| \`!\` | \`!a\` | Logical NOT |
| \`? :\` | \`a ? b : c\` | Ternary |

---

## Common Patterns

| Pattern | Syntax | Use Case |
|---------|--------|----------|
| **Fallback** | \`{{ x \\|\\| "default" }}\` | Handle missing values |
| **Nested access** | \`{{ user.profile.name }}\` | Deep object access |
| **Array item** | \`{{ items[0] }}\` | Get first item |
| **Array length** | \`{{ items.length }}\` | Count items |
| **Ternary** | \`{{ x ? "yes" : "no" }}\` | Inline conditional |
| **Math** | \`{{ a + b * c }}\` | Calculations |

---

## Tips

- **Always provide defaults** for optional variables: \`{{ x || "default" }}\`
- **Use descriptive names**: \`{{ user_email }}\` not \`{{ e }}\`
- **Keep expressions simple** - complex logic should use conditionals
- **Test with edge cases** - undefined, null, empty strings

---

## Next Steps

- **Add conditions**: \`latitude_get_docs({ topic: "conditionals" })\`
- **Add loops**: \`latitude_get_docs({ topic: "loops" })\`
- **Push a prompt**: \`latitude_push_prompt\`
`;

// ============================================================================
// TOPIC: CONDITIONALS
// ============================================================================

export const DOCS_CONDITIONALS = `# Conditional Statements

> Dynamic content based on conditions with \`if/else/endif\`

## Overview

Conditionals let you include or exclude content based on runtime conditions. Use \`{{ if }}\`, \`{{ else }}\`, and \`{{ endif }}\`.

\`\`\`promptl
{{ if user.isPremium }}
  You have access to all features!
{{ else }}
  Upgrade to premium for more features.
{{ endif }}
\`\`\`

---

## Syntax

### Basic If

\`\`\`promptl
{{ if condition }}
  Content when true
{{ endif }}
\`\`\`

### If-Else

\`\`\`promptl
{{ if condition }}
  Content when true
{{ else }}
  Content when false
{{ endif }}
\`\`\`

### If-Else If-Else

\`\`\`promptl
{{ if condition1 }}
  Content for condition1
{{ else if condition2 }}
  Content for condition2
{{ else }}
  Default content
{{ endif }}
\`\`\`

---

## Examples

### Example 1: Age Verification

\`\`\`promptl
{{ if age < 18 }}
  Sorry, you must be 18 or older to use this service.
{{ else }}
  <user>
    {{ question }}
  </user>
{{ endif }}
\`\`\`

### Example 2: Role-Based System Message

\`\`\`promptl
{{ if role == "admin" }}
  <system>
    The user is an admin with full access to all data and operations.
  </system>
{{ else if role == "moderator" }}
  <system>
    The user is a moderator who can manage content but not system settings.
  </system>
{{ else }}
  <system>
    The user has standard access with limited permissions.
  </system>
{{ endif }}
\`\`\`

### Example 3: Nested Conditions

\`\`\`promptl
{{ if user.isPremium }}
  <system>Premium user with enhanced features.</system>
  {{ if user.hasApiAccess }}
    API access is enabled. You can help with API-related questions.
  {{ endif }}
{{ else }}
  <system>Standard user. Suggest premium upgrade when relevant.</system>
{{ endif }}
\`\`\`

### Example 4: Variable Existence Check

\`\`\`promptl
{{ if lastName }}
  {{ fullName = firstName + " " + lastName }}
{{ else }}
  {{ fullName = firstName }}
{{ endif }}

<user>
  Hi! My name is {{ fullName }}.
</user>
\`\`\`

### Example 5: Complex Expressions

\`\`\`promptl
{{ if items.length > 0 && user.isLoggedIn }}
  <assistant>
    You have {{ items.length }} items in your cart. Ready to checkout?
  </assistant>
{{ else if !user.isLoggedIn }}
  <assistant>
    Please log in to view your cart.
  </assistant>
{{ else }}
  <assistant>
    Your cart is empty. Let's find something for you!
  </assistant>
{{ endif }}
\`\`\`

---

## Condition Operators

| Operator | Example | Description |
|----------|---------|-------------|
| \`==\` | \`role == "admin"\` | Equals |
| \`!=\` | \`status != "blocked"\` | Not equals |
| \`<\` | \`age < 18\` | Less than |
| \`>\` | \`price > 100\` | Greater than |
| \`<=\` | \`count <= 10\` | Less or equal |
| \`>=\` | \`score >= 80\` | Greater or equal |
| \`&&\` | \`a && b\` | Both true |
| \`\\|\\|\` | \`a \\|\\| b\` | Either true |
| \`!\` | \`!isBlocked\` | Not |

---

## Truthiness

These are **falsy** (evaluate to false):
- \`false\`
- \`null\`
- \`undefined\`
- \`0\`
- \`""\` (empty string)

Everything else is **truthy**.

\`\`\`promptl
{{ if userName }}
  Hello, {{ userName }}!
{{ else }}
  Hello, guest!
{{ endif }}
\`\`\`

---

## Best Practices

| Do | Don't |
|----|----|
| ✅ \`{{ if user.isLoggedIn }}\` | ❌ \`{{ if x }}\` (unclear) |
| ✅ Keep conditions simple | ❌ Deep nesting (3+ levels) |
| ✅ Use defaults for optional vars | ❌ Assume variables exist |
| ✅ Test edge cases | ❌ Only test happy path |

---

## Debugging

Add debug output to check values:

\`\`\`promptl
Debug: role={{ role }}, isPremium={{ isPremium }}

{{ if role == "admin" && isPremium }}
  ...
{{ endif }}
\`\`\`

---

## Next Steps

- **Add loops**: \`latitude_get_docs({ topic: "loops" })\`
- **Learn variables**: \`latitude_get_docs({ topic: "variables" })\`
- **Try techniques**: \`latitude_get_docs({ topic: "techniques" })\`
`;

// ============================================================================
// TOPIC: LOOPS
// ============================================================================

export const DOCS_LOOPS = `# Loops & Iteration

> Repeat content with \`for/each\` over arrays

## Overview

Loops let you iterate over arrays to generate dynamic content. Perfect for few-shot examples, lists, and repeated structures.

\`\`\`promptl
{{ for item in items }}
  - {{ item }}
{{ endfor }}
\`\`\`

---

## Syntax

### Basic Loop

\`\`\`promptl
{{ for item in array }}
  Content with {{ item }}
{{ endfor }}
\`\`\`

### Loop with Index

\`\`\`promptl
{{ for item, index in array }}
  {{ index + 1 }}. {{ item }}
{{ endfor }}
\`\`\`

### Object Properties

\`\`\`promptl
{{ for value, key in object }}
  {{ key }}: {{ value }}
{{ endfor }}
\`\`\`

---

## Examples

### Example 1: Few-Shot Learning

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
You are a sentiment classifier. Classify text as positive, negative, or neutral.

{{ for example in examples }}
<user>{{ example.text }}</user>
<assistant>{{ example.sentiment }}</assistant>
{{ endfor }}

<user>{{ input_text }}</user>
\`\`\`

**Parameters:**
\`\`\`json
{
  "examples": [
    { "text": "I love this product!", "sentiment": "positive" },
    { "text": "Terrible experience.", "sentiment": "negative" },
    { "text": "It's okay I guess.", "sentiment": "neutral" }
  ],
  "input_text": "This is amazing!"
}
\`\`\`

### Example 2: Numbered List

\`\`\`promptl
Here are your tasks for today:

{{ for task, index in tasks }}
{{ index + 1 }}. {{ task.title }} (Priority: {{ task.priority }})
{{ endfor }}
\`\`\`

### Example 3: Conversation History

\`\`\`promptl
{{ for message in history }}
<{{ message.role }}>
  {{ message.content }}
</{{ message.role }}>
{{ endfor }}

<user>{{ new_message }}</user>
\`\`\`

### Example 4: Product Catalog

\`\`\`promptl
Available products:

{{ for product in products }}
**{{ product.name }}**
- Price: \${{ product.price }}
- In Stock: {{ product.inStock ? "Yes" : "No" }}

{{ endfor }}

Which product interests you?
\`\`\`

### Example 5: Nested Loops

\`\`\`promptl
{{ for category in categories }}
## {{ category.name }}

{{ for item in category.items }}
  - {{ item }}
{{ endfor }}

{{ endfor }}
\`\`\`

---

## Common Patterns

### Dynamic Examples (Few-Shot)

\`\`\`promptl
{{ for ex in examples }}
Input: {{ ex.input }}
Output: {{ ex.output }}

{{ endfor }}
Now classify: {{ user_input }}
\`\`\`

### Building Context

\`\`\`promptl
<system>
You have access to these documents:
{{ for doc in documents }}
- {{ doc.title }}: {{ doc.summary }}
{{ endfor }}
</system>
\`\`\`

### Conditional in Loop

\`\`\`promptl
{{ for user in users }}
{{ if user.isActive }}
- {{ user.name }} (Active)
{{ endif }}
{{ endfor }}
\`\`\`

---

## Loop Variables

Inside a loop, you have access to:

| Variable | Description |
|----------|-------------|
| \`item\` | Current item |
| \`index\` | Current index (0-based) |
| \`length\` | Array length |

\`\`\`promptl
{{ for item, index in items }}
Item {{ index + 1 }} of {{ items.length }}: {{ item }}
{{ endfor }}
\`\`\`

---

## Tips

- **Use for few-shot examples** - dynamically inject training examples
- **Combine with conditionals** - filter items in loops
- **Keep iterations reasonable** - large loops increase token count
- **Index is 0-based** - add 1 for human-readable numbering

---

## Next Steps

- **Learn techniques**: \`latitude_get_docs({ topic: "techniques" })\` (few-shot)
- **Try conditionals**: \`latitude_get_docs({ topic: "conditionals" })\`
- **Build chains**: \`latitude_get_docs({ topic: "chains" })\`
`;

// ============================================================================
// TOPIC: REFERENCES
// ============================================================================

export const DOCS_REFERENCES = `# Prompt References

> Include and chain prompts with \`<prompt>\` tag

## Overview

References let you include one prompt inside another, enabling modular and reusable prompt design.

\`\`\`promptl
<prompt path="shared/system-instructions" />

<user>{{ user_question }}</user>
\`\`\`

---

## Syntax

### Basic Reference

\`\`\`promptl
<prompt path="prompt-name" />
\`\`\`

### With Parameters

\`\`\`promptl
<prompt path="greeting" name="Alice" style="formal" />
\`\`\`

### Relative Paths

\`\`\`promptl
<prompt path="../shared/common" />
<prompt path="./helpers/formatter" />
\`\`\`

---

## Examples

### Example 1: Shared System Instructions

**Main prompt:**
\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
<prompt path="system/base-assistant" />

<user>{{ question }}</user>
\`\`\`

**system/base-assistant:**
\`\`\`promptl
You are a helpful, accurate, and friendly AI assistant.
Always be concise. Ask clarifying questions when needed.
Never make up information - say "I don't know" if unsure.
\`\`\`

### Example 2: Parameterized Reference

**Main prompt:**
\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
<prompt path="templates/persona" 
  role="financial advisor" 
  tone="professional" 
  expertise="retirement planning" />

<user>{{ user_question }}</user>
\`\`\`

**templates/persona:**
\`\`\`promptl
You are a {{ role }} with expertise in {{ expertise }}.
Your communication style is {{ tone }}.
Provide accurate, helpful advice within your domain.
\`\`\`

### Example 3: Composable Prompts

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
<prompt path="components/system-rules" />
<prompt path="components/output-format" format="json" />
<prompt path="components/examples" count="3" />

<user>{{ input }}</user>
\`\`\`

---

## Use Cases

| Use Case | Description |
|----------|-------------|
| **Shared system prompts** | Consistent behavior across prompts |
| **Reusable personas** | Same character in different contexts |
| **Common examples** | Few-shot examples used in multiple prompts |
| **Output formatters** | Consistent JSON/markdown formatting |
| **Guardrails** | Safety instructions everywhere |

---

## Path Resolution

| Path | Resolves To |
|------|-------------|
| \`helper\` | Same folder: \`/folder/helper\` |
| \`./helper\` | Same folder explicitly |
| \`../shared\` | Parent folder: \`/shared\` |
| \`templates/base\` | From project root |

---

## Tips

- **Keep referenced prompts focused** - single responsibility
- **Pass only needed parameters** - don't over-parameterize
- **Document dependencies** - note which prompts reference others
- **Test references independently** - ensure they work alone

---

## Next Steps

- **Build chains**: \`latitude_get_docs({ topic: "chains" })\`
- **Create agents**: \`latitude_get_docs({ topic: "agents" })\`
- **Push prompts**: \`latitude_push_prompt\`
`;

// ============================================================================
// TOPIC: TOOLS
// ============================================================================

export const DOCS_TOOLS = `# Tool Use & Function Calling

> Enable AI to call external functions

## Overview

Tools let you give the AI model access to external functions. Define tools in the config, and the model can call them during execution.

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
tools:
  - get_weather:
      description: Get current weather for a location
      parameters:
        type: object
        properties:
          location:
            type: string
            description: City name, e.g., "San Francisco, CA"
        required: [location]
---
<user>What's the weather in Tokyo?</user>
\`\`\`

---

## Syntax

### Tool Definition

\`\`\`yaml
tools:
  - tool_name:
      description: What the tool does
      parameters:
        type: object
        properties:
          param1:
            type: string
            description: Parameter description
        required: [param1]
\`\`\`

### Built-in Latitude Tools

\`\`\`yaml
tools:
  - latitude/search    # Web search
  - latitude/code      # Code execution
  - latitude/extract   # Data extraction
\`\`\`

---

## JSON Schema for Parameters

Parameters use JSON Schema format:

### String Parameter

\`\`\`yaml
location:
  type: string
  description: City and state
\`\`\`

### Number Parameter

\`\`\`yaml
temperature:
  type: number
  description: Temperature in Celsius
\`\`\`

### Enum Parameter

\`\`\`yaml
unit:
  type: string
  enum: [celsius, fahrenheit]
  description: Temperature unit
\`\`\`

### Array Parameter

\`\`\`yaml
tags:
  type: array
  items:
    type: string
  description: List of tags
\`\`\`

### Object Parameter

\`\`\`yaml
user:
  type: object
  properties:
    name:
      type: string
    age:
      type: integer
  required: [name]
\`\`\`

---

## Examples

### Example 1: Weather Tool

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
tools:
  - get_weather:
      description: Get current weather for a specified location
      parameters:
        type: object
        properties:
          location:
            type: string
            description: City and state, e.g., San Francisco, CA
          unit:
            type: string
            enum: [celsius, fahrenheit]
            description: Temperature unit
        required: [location]
---
You are a weather assistant.

<user>What's the weather like in {{ location }}?</user>
\`\`\`

### Example 2: Calendar Tool

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
tools:
  - add_calendar_event:
      description: Add an event to the user's calendar
      parameters:
        type: object
        properties:
          title:
            type: string
            description: Event title
          date:
            type: string
            description: Date in YYYY-MM-DD format
          time:
            type: string
            description: Time in HH:MM format
          duration_minutes:
            type: integer
            description: Duration in minutes
        required: [title, date, time]
---
You are a calendar assistant. Help users manage their schedule.

<user>{{ request }}</user>
\`\`\`

### Example 3: Multiple Tools

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
tools:
  - latitude/search
  - get_stock_price:
      description: Get current stock price
      parameters:
        type: object
        properties:
          symbol:
            type: string
            description: Stock ticker symbol (e.g., AAPL)
        required: [symbol]
  - calculate:
      description: Perform mathematical calculation
      parameters:
        type: object
        properties:
          expression:
            type: string
            description: Math expression to evaluate
        required: [expression]
---
You are a financial assistant with access to web search, stock prices, and calculations.

<user>{{ question }}</user>
\`\`\`

---

## Tool Without Parameters

For tools that don't need parameters:

\`\`\`yaml
tools:
  - get_random_number:
      description: Generate a random number
      parameters:
        type: object
        properties: {}
        required: []
\`\`\`

---

## Tips

- **Write clear descriptions** - helps the model decide when to use the tool
- **Mark required parameters** - prevents invalid calls
- **Use enums for limited options** - guides the model's choices
- **Test tool calls** - ensure parameters are correct

---

## Next Steps

- **Build agents**: \`latitude_get_docs({ topic: "agents" })\`
- **Add chains**: \`latitude_get_docs({ topic: "chains" })\`
- **Run prompts**: \`latitude_run_prompt\`
`;

// ============================================================================
// TOPIC: CHAINS
// ============================================================================

export const DOCS_CHAINS = `# Chains & Multi-Step Prompts

> Sequential reasoning with \`<step>\` tags

## Overview

Chains let you break prompts into sequential steps. Each step runs, and its output is available to subsequent steps. Perfect for complex reasoning and multi-stage processing.

\`\`\`promptl
<step>
Analyze the problem: {{ problem }}
</step>

<step>
Based on the analysis, propose a solution.
</step>

<step>
Evaluate the solution and provide final recommendations.
</step>
\`\`\`

---

## Syntax

### Basic Chain

\`\`\`promptl
<step>
First step content
</step>

<step>
Second step - can reference previous output
</step>
\`\`\`

### Accessing Previous Response

The \`response\` variable contains the previous step's output:

\`\`\`promptl
<step>
List 3 ideas for {{ topic }}.
</step>

<step>
Based on these ideas:
{{ response }}

Evaluate each idea's feasibility.
</step>
\`\`\`

---

## Examples

### Example 1: Analysis Chain

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
<step>
# Step 1: Data Analysis

Analyze this data:
{{ data }}

Extract key patterns and insights.
</step>

<step>
# Step 2: Interpretation

Based on the analysis:
{{ response }}

What do these patterns mean for the business?
</step>

<step>
# Step 3: Recommendations

Given the interpretation, provide 3 actionable recommendations.
</step>
\`\`\`

### Example 2: Chain of Thought

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
<step>
# Step 1: Understand the Problem

Problem: {{ problem }}

Let me break this down:
1. What is being asked?
2. What information do I have?
3. What approach should I take?
</step>

<step>
# Step 2: Work Through the Solution

Based on my understanding:
{{ response }}

Now let me solve this step by step...
</step>

<step>
# Step 3: Verify and Conclude

Solution work:
{{ response }}

Let me verify this is correct and provide the final answer.
</step>
\`\`\`

### Example 3: Content Generation Pipeline

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
---
<step>
# Research Phase

Topic: {{ topic }}
Target audience: {{ audience }}

Generate an outline with 5 key points to cover.
</step>

<step>
# Draft Phase

Using this outline:
{{ response }}

Write a detailed first draft.
</step>

<step>
# Edit Phase

Draft:
{{ response }}

Edit for clarity, engagement, and accuracy. Provide the final version.
</step>
\`\`\`

---

## Configuration

### Max Steps

Limit the number of steps (default: 20, max: 150):

\`\`\`yaml
---
provider: OpenAI
model: gpt-4o
maxSteps: 50
---
\`\`\`

### Opt Out of maxSteps

For simple prompts without steps:

\`\`\`yaml
---
provider: OpenAI
model: gpt-4o
type: prompt
---
\`\`\`

---

## Chain with Tools

Chains work with tools - each step can call tools:

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
tools:
  - latitude/search
---
<step>
Search for recent news about {{ topic }}.
</step>

<step>
Based on the search results, summarize the key developments.
</step>

<step>
Analyze the implications and provide insights.
</step>
\`\`\`

---

## Tips

- **Keep steps focused** - one objective per step
- **Use clear step titles** - helps with debugging
- **Reference \`response\`** - connect steps logically
- **Set appropriate maxSteps** - prevent runaway chains
- **Test each step** - ensure logic flows correctly

---

## Next Steps

- **Build agents**: \`latitude_get_docs({ topic: "agents" })\`
- **Learn techniques**: \`latitude_get_docs({ topic: "techniques" })\`
- **Push prompts**: \`latitude_push_prompt\`
`;

// ============================================================================
// TOPIC: AGENTS
// ============================================================================

export const DOCS_AGENTS = `# Multi-Agent Systems

> Orchestrate multiple AI agents for complex tasks

## Overview

Agents let you create specialized AI personas that can collaborate. Define agents in separate prompts and orchestrate them from a main prompt.

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
type: agent
agents:
  - agents/researcher
  - agents/writer
  - agents/editor
---
Coordinate the team to create content about {{ topic }}.
\`\`\`

---

## Syntax

### Main Orchestrator

\`\`\`yaml
---
provider: OpenAI
model: gpt-4o
type: agent
agents:
  - agents/agent1
  - agents/agent2
---
Instructions for coordinating agents...
\`\`\`

### Agent Definition

Each agent is a separate prompt file:

\`\`\`yaml
---
provider: OpenAI
model: gpt-4o
type: agent
path: agents/researcher
---
You are a research specialist...
\`\`\`

---

## Examples

### Example 1: Content Creation Team

**Main orchestrator (content-team.promptl):**
\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
type: agent
agents:
  - agents/researcher
  - agents/writer
  - agents/editor
---
# Content Creation Workflow

Topic: {{ topic }}
Target audience: {{ audience }}
Tone: {{ tone }}

Coordinate the team:
1. Researcher gathers information
2. Writer creates the draft
3. Editor polishes the final version

Deliver high-quality content.
\`\`\`

**agents/researcher:**
\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
type: agent
path: agents/researcher
---
# Research Agent

You are a thorough research specialist.
- Find key facts and statistics
- Identify credible sources
- Organize information logically
- Note any gaps in available information

Research thoroughly and present findings clearly.
\`\`\`

**agents/writer:**
\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
type: agent
path: agents/writer
---
# Writer Agent

You are a skilled content writer.
- Create engaging, clear prose
- Structure content logically
- Match the target tone and audience
- Incorporate research findings naturally

Write compelling content.
\`\`\`

**agents/editor:**
\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
type: agent
path: agents/editor
---
# Editor Agent

You are a meticulous editor.
- Check grammar and spelling
- Improve clarity and flow
- Ensure consistency
- Verify facts and claims
- Polish the final product

Deliver publication-ready content.
\`\`\`

### Example 2: Code Review Team

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
type: agent
agents:
  - agents/security-reviewer
  - agents/performance-reviewer
  - agents/style-reviewer
---
# Code Review Workflow

Review this code:
\`\`\`
{{ code }}
\`\`\`

Each specialist should review from their perspective.
Compile a comprehensive review report.
\`\`\`

### Example 3: Decision Committee

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
type: agent
agents:
  - agents/ceo-perspective
  - agents/cto-perspective
  - agents/cfo-perspective
---
# Executive Decision

Decision to evaluate: {{ decision }}

Each executive provides their perspective.
Synthesize into a unified recommendation.
\`\`\`

---

## Agent Configuration

### Path Declaration

Agents need their path declared:

\`\`\`yaml
---
type: agent
path: agents/my-agent
---
\`\`\`

### Agent with Tools

Agents can have their own tools:

\`\`\`yaml
---
type: agent
path: agents/researcher
tools:
  - latitude/search
---
\`\`\`

---

## Best Practices

| Practice | Description |
|----------|-------------|
| **Specialized roles** | Each agent has clear expertise |
| **Clear handoffs** | Define how agents pass work |
| **Distinct personas** | Different voices for each agent |
| **Focused scope** | Agents do one thing well |
| **Orchestration logic** | Main prompt coordinates clearly |

---

## Tips

- **Start simple** - 2-3 agents before scaling
- **Test agents individually** - ensure each works alone
- **Define clear interfaces** - what each agent inputs/outputs
- **Use descriptive agent names** - self-documenting
- **Monitor token usage** - multi-agent uses more tokens

---

## Next Steps

- **Learn chains**: \`latitude_get_docs({ topic: "chains" })\`
- **Add tools**: \`latitude_get_docs({ topic: "tools" })\`
- **Try techniques**: \`latitude_get_docs({ topic: "techniques" })\`
`;

// ============================================================================
// TOPIC: TECHNIQUES
// ============================================================================

export const DOCS_TECHNIQUES = `# Prompting Techniques

> Few-shot, Chain-of-Thought, Tree-of-Thoughts, Role Prompting

## Overview

Advanced prompting techniques improve AI performance on complex tasks. Combine these with PromptL features for powerful prompts.

---

## 1. Few-Shot Learning

Provide examples to guide the model's behavior.

### Basic Few-Shot

\`\`\`promptl
Classify the sentiment as positive, negative, or neutral.

Text: I love this product!
Sentiment: positive

Text: Terrible experience.
Sentiment: negative

Text: It's okay.
Sentiment: neutral

Text: {{ input_text }}
Sentiment:
\`\`\`

### Dynamic Few-Shot with Loops

\`\`\`promptl
{{ for example in examples }}
Input: {{ example.input }}
Output: {{ example.output }}

{{ endfor }}
Input: {{ user_input }}
Output:
\`\`\`

### Few-Shot with Messages

\`\`\`promptl
{{ for ex in examples }}
<user>{{ ex.question }}</user>
<assistant>{{ ex.answer }}</assistant>
{{ endfor }}

<user>{{ user_question }}</user>
\`\`\`

---

## 2. Chain-of-Thought (CoT)

Guide the model through step-by-step reasoning.

### Simple CoT

\`\`\`promptl
Solve this problem step by step:

{{ problem }}

Let's think through this:
1. First, I need to understand...
2. Then, I should consider...
3. Finally, I can conclude...
\`\`\`

### CoT with Steps

\`\`\`promptl
<step>
# Understand the Problem

{{ problem }}

What is being asked? What information do I have?
</step>

<step>
# Develop Solution

Based on my understanding, let me work through this...
</step>

<step>
# Verify and Conclude

Let me check my work and provide the final answer.
</step>
\`\`\`

### Zero-Shot CoT

Simply add "Let's think step by step":

\`\`\`promptl
{{ problem }}

Let's think step by step.
\`\`\`

---

## 3. Tree-of-Thoughts (ToT)

Explore multiple reasoning paths and evaluate them.

### Basic ToT

\`\`\`promptl
Problem: {{ problem }}

## Branch A: First Approach
1. Premise: ...
2. Reasoning: ...
3. Conclusion: ...
Confidence: X/10

## Branch B: Alternative Approach
1. Premise: ...
2. Reasoning: ...
3. Conclusion: ...
Confidence: X/10

## Branch C: Creative Approach
1. Premise: ...
2. Reasoning: ...
3. Conclusion: ...
Confidence: X/10

## Evaluation
Compare branches and select the best solution.

## Final Answer
Based on Branch [X]: ...
\`\`\`

### ToT with Chains

\`\`\`promptl
<step>
# Generate Branches

Problem: {{ problem }}

Generate 3 different approaches to solve this.
</step>

<step>
# Evaluate Branches

Based on the approaches above, evaluate each:
- Feasibility (1-10)
- Correctness (1-10)
- Elegance (1-10)
</step>

<step>
# Select and Develop

Choose the best approach and develop it fully.
</step>
\`\`\`

---

## 4. Role Prompting

Assign a specific persona or expertise.

### Expert Role

\`\`\`promptl
You are a senior financial advisor with 20 years of experience.
- CFA certified
- Specializes in retirement planning
- Communication style: professional yet approachable

{{ client_situation }}

Provide expert advice:
\`\`\`

### Dynamic Role

\`\`\`promptl
{{ if domain == "legal" }}
You are a senior attorney specializing in {{ specialty }}.
{{ else if domain == "medical" }}
You are a board-certified physician in {{ specialty }}.
{{ else if domain == "technical" }}
You are a principal engineer with expertise in {{ specialty }}.
{{ endif }}

Question: {{ question }}
\`\`\`

### Multi-Role with Agents

\`\`\`promptl
---
type: agent
agents:
  - agents/optimist
  - agents/pessimist
  - agents/pragmatist
---
Evaluate {{ proposal }} from multiple perspectives.
\`\`\`

---

## 5. Combining Techniques

### Few-Shot + CoT

\`\`\`promptl
{{ for example in examples }}
Problem: {{ example.problem }}
Thinking: {{ example.reasoning }}
Answer: {{ example.answer }}

{{ endfor }}
Problem: {{ user_problem }}
Thinking: Let me work through this step by step...
Answer:
\`\`\`

### Role + Chain + Tools

\`\`\`promptl
---
provider: OpenAI
model: gpt-4o
tools:
  - latitude/search
---
You are a research analyst at a top consulting firm.

<step>
Research: {{ topic }}
Use search to find current information.
</step>

<step>
Analyze findings and identify key trends.
</step>

<step>
Provide executive summary with recommendations.
</step>
\`\`\`

---

## Quick Reference

| Technique | When to Use | Key Feature |
|-----------|-------------|-------------|
| **Few-Shot** | Classification, formatting | Examples guide behavior |
| **CoT** | Reasoning, math, logic | Step-by-step thinking |
| **ToT** | Complex decisions, planning | Multiple paths evaluated |
| **Role** | Domain expertise, persona | Specialized knowledge |

---

## Tips

- **Combine techniques** - they work well together
- **Use loops for few-shot** - dynamic example injection
- **Use chains for CoT/ToT** - structured reasoning steps
- **Use agents for roles** - multi-perspective analysis
- **Test and iterate** - different techniques suit different tasks

---

## Next Steps

- **Try loops**: \`latitude_get_docs({ topic: "loops" })\`
- **Build chains**: \`latitude_get_docs({ topic: "chains" })\`
- **Create agents**: \`latitude_get_docs({ topic: "agents" })\`
- **Push prompts**: \`latitude_push_prompt\`
`;

// ============================================================================
// DOCS MAP - Topic to Content Mapping
// ============================================================================

export const DOCS_MAP: Record<DocsTopic, string> = {
	overview: DOCS_OVERVIEW,
	structure: DOCS_STRUCTURE,
	variables: DOCS_VARIABLES,
	conditionals: DOCS_CONDITIONALS,
	loops: DOCS_LOOPS,
	references: DOCS_REFERENCES,
	tools: DOCS_TOOLS,
	chains: DOCS_CHAINS,
	agents: DOCS_AGENTS,
	techniques: DOCS_TECHNIQUES,
};

export default {
	HELP_CONTENT,
	DOCS_MAP,
	DOCS_OVERVIEW,
	DOCS_STRUCTURE,
	DOCS_VARIABLES,
	DOCS_CONDITIONALS,
	DOCS_LOOPS,
	DOCS_REFERENCES,
	DOCS_TOOLS,
	DOCS_CHAINS,
	DOCS_AGENTS,
	DOCS_TECHNIQUES,
};
