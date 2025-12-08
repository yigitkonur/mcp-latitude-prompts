<h1 align="center">🚀 Latitude MCP Server 🚀</h1>
<h3 align="center">Stop copy-pasting prompts. Start managing them like a pro.</h3>

<p align="center">
  <strong>
    <em>The complete MCP server for Latitude.so prompt management. Create projects, version prompts, push from local files, run AI conversations — all from your AI assistant or CLI.</em>
  </strong>
</p>

<p align="center">
  <!-- Package Info -->
  <a href="https://www.npmjs.com/package/latitude-mcp-server"><img alt="npm" src="https://img.shields.io/npm/v/latitude-mcp-server.svg?style=flat-square&color=4D87E6"></a>
  <a href="#"><img alt="node" src="https://img.shields.io/badge/node-18+-4D87E6.svg?style=flat-square"></a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <!-- Features -->
  <a href="https://opensource.org/licenses/MIT"><img alt="license" src="https://img.shields.io/badge/License-ISC-F9A825.svg?style=flat-square"></a>
  <a href="#"><img alt="platform" src="https://img.shields.io/badge/platform-macOS_|_Linux_|_Windows-2ED573.svg?style=flat-square"></a>
</p>

<p align="center">
  <img alt="tools" src="https://img.shields.io/badge/🛠️_19_MCP_tools-full_CRUD_+_docs-2ED573.svg?style=for-the-badge">
  <img alt="resources" src="https://img.shields.io/badge/📚_6_resources-read_only_access-2ED573.svg?style=for-the-badge">
  <img alt="docs" src="https://img.shields.io/badge/📖_38_doc_topics-self_learning-4D87E6.svg?style=for-the-badge">
</p>

<div align="center">

### 🧭 Quick Navigation

[**⚡ Get Started**](#-get-started-in-60-seconds) •
[**✨ Features**](#-feature-breakdown) •
[**🛠️ Tools**](#-tool-reference) •
[**📚 Resources**](#-resource-templates) •
[**💻 CLI**](#-cli-reference)

</div>

---

**`latitude-mcp-server`** gives your AI assistant superpowers for managing prompts on [Latitude.so](https://latitude.so). Instead of switching between your IDE, Latitude dashboard, and AI chat, your AI can now create projects, version prompts, push content from local files, and even run prompts directly.

<div align="center">
<table>
<tr>
<td align="center">
<h3>📁</h3>
<b>Project Management</b><br/>
<sub>Create & list projects</sub>
</td>
<td align="center">
<h3>🔀</h3>
<b>Version Control</b><br/>
<sub>Drafts, publish, merge</sub>
</td>
<td align="center">
<h3>📝</h3>
<b>Prompt CRUD</b><br/>
<sub>Push from files or inline</sub>
</td>
<td align="center">
<h3>🤖</h3>
<b>AI Execution</b><br/>
<sub>Run prompts, chat, stream</sub>
</td>
</tr>
</table>
</div>

How it works:
- **You:** "Push my local prompt file to Latitude draft"
- **AI:** Reads file, extracts prompt path from filename, pushes to your project
- **You:** "Now run it with these parameters"
- **AI:** Executes prompt, streams response, maintains conversation
- **Result:** Full prompt lifecycle without leaving your IDE

---

## 💥 Why This Beats Manual Management

Managing prompts manually is a context-switching nightmare. This MCP server makes traditional workflows look ancient.

<table align="center">
<tr>
<td align="center"><b>❌ The Old Way (Pain)</b></td>
<td align="center"><b>✅ The MCP Way (Glory)</b></td>
</tr>
<tr>
<td>
<ol>
  <li>Write prompt in your IDE</li>
  <li>Open Latitude dashboard</li>
  <li>Copy-paste content manually</li>
  <li>Create version, test, debug</li>
  <li>Switch back to IDE, repeat</li>
</ol>
</td>
<td>
<ol>
  <li>Write prompt in your IDE</li>
  <li>Tell AI: "Push to Latitude"</li>
  <li>AI pushes, runs, shows results</li>
  <li>Iterate directly in conversation</li>
  <li>Ship faster. ☕</li>
</ol>
</td>
</tr>
</table>

We're not just wrapping an API. We're enabling **AI-native prompt development** with file-based workflows, automatic path derivation, and streaming execution.

---

## 🚀 Get Started in 60 Seconds

### 1. Get Your API Key

1. Go to [app.latitude.so/settings](https://app.latitude.so/settings)
2. Create or copy your API key
3. That's it — one key, all features unlocked

### 2. Configure Your MCP Client

<div align="center">

| Client | Config Location | Docs |
|:------:|:---------------:|:----:|
| 🖥️ **Claude Desktop** | `claude_desktop_config.json` | [Setup](#claude-desktop) |
| ⌨️ **Claude Code** | `~/.claude.json` or CLI | [Setup](#claude-code-cli) |
| 🎯 **Cursor** | `.cursor/mcp.json` | [Setup](#cursorwindsurf) |
| 🏄 **Windsurf** | MCP settings | [Setup](#cursorwindsurf) |

</div>

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "latitude": {
      "command": "npx",
      "args": ["latitude-mcp-server"],
      "env": {
        "LATITUDE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Claude Code (CLI)

One command setup:

```bash
claude mcp add latitude npx \
  --scope user \
  --env LATITUDE_API_KEY=your-api-key-here \
  -- latitude-mcp-server
```

Or manually add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "latitude": {
      "command": "npx",
      "args": ["latitude-mcp-server"],
      "env": {
        "LATITUDE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Cursor/Windsurf

Add to `.cursor/mcp.json` or MCP settings:

```json
{
  "mcpServers": {
    "latitude": {
      "command": "npx",
      "args": ["latitude-mcp-server"],
      "env": {
        "LATITUDE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

> **✨ Pro Tip:** The server outputs in TOON format by default — a token-efficient notation that uses 30-60% fewer tokens than JSON, keeping your LLM context lean.

---

## ✨ Feature Breakdown

<div align="center">

| Feature | What It Does | Why You Care |
| :---: | :--- | :--- |
| **📁 Projects**<br/>`list & create` | Manage Latitude projects | Organize prompts by use case |
| **🔀 Versions**<br/>`draft → live` | Git-like version control | Safe iteration without breaking prod |
| **📝 Prompts**<br/>`full CRUD` | Create, read, update prompts | Complete prompt lifecycle |
| **📄 File Push**<br/>`local → cloud` | Push prompts from local files | IDE-native workflow |
| **🤖 Execution**<br/>`run & chat` | Execute prompts with params | Test directly from AI |
| **📊 Logs**<br/>`monitoring` | View execution history | Debug and optimize |
| **🔄 Streaming**<br/>`real-time` | Stream AI responses | See results as they generate |

</div>

---

## 🛠️ Tool Reference

This server provides **19 MCP tools** covering the complete Latitude API plus built-in documentation with **38 topics**.

<div align="center">
<table>
<tr>
<td align="center">📁<br/><b>Projects</b></td>
<td align="center">🔀<br/><b>Versions</b></td>
<td align="center">📝<br/><b>Prompts</b></td>
<td align="center">🤖<br/><b>Execution</b></td>
<td align="center">📊<br/><b>Operations</b></td>
<td align="center">📚<br/><b>Docs</b></td>
</tr>
<tr>
<td valign="top">
<code>list_projects</code><br/>
<code>create_project</code>
</td>
<td valign="top">
<code>list_versions</code><br/>
<code>get_version</code><br/>
<code>create_version</code><br/>
<code>publish_version</code>
</td>
<td valign="top">
<code>list_prompts</code><br/>
<code>get_prompt</code><br/>
<code>push_prompt</code><br/>
<code>push_prompt_from_file</code>
</td>
<td valign="top">
<code>run_prompt</code><br/>
<code>chat</code><br/>
<code>get_conversation</code>
</td>
<td valign="top">
<code>list_logs</code><br/>
<code>create_log</code><br/>
<code>trigger_evaluation</code>
</td>
<td valign="top">
<code>help</code><br/>
<code>get_docs</code><br/>
<code>find_docs</code>
</td>
</tr>
</table>
</div>

---

### 📚 Documentation Tools (AI Self-Learning)

The server includes **38 documentation topics** organized by category, enabling AI agents to learn PromptL syntax on-demand. Topics include enhanced metadata (`useWhen` triggers, `difficulty`, `prerequisites`) for intelligent discovery.

#### `latitude_help`

Get complete server overview — all tools, documentation topics, and quick start workflow.

```json
{}
```

**Returns:** Server overview with 19 tools, 38 doc topics by category, and suggested next actions.

---

#### `latitude_find_docs` ⭐ NEW

**Semantic search for documentation.** Describe what you're trying to do, get matched topics. Uses `useWhen` triggers from topic metadata for intelligent matching.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | What are you trying to do? |
| `maxResults` | `number` | No | Max topics to return (default: 5) |

```json
{
  "query": "extract structured data from text"
}
```

**How it works:** Scores topics based on:
- Title/description match
- `useWhen` trigger phrases (e.g., "json output", "extract", "chatbot")
- Topic name relevance

**Returns:** Ranked topics with relevance scores and `getDocsCommand` for each.

---

#### `latitude_get_docs`

Get comprehensive PromptL documentation for a specific topic.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topic` | `enum` | Yes | One of 38 topics (see below) |

**Available Topics (38 total):**

| Category | Topics |
|----------|--------|
| **Core Syntax** (11) | `overview`, `structure`, `variables`, `conditionals`, `loops`, `references`, `tools`, `chains`, `agents`, `techniques`, `agent-patterns` |
| **Configuration** (7) | `config-basics`, `config-generation`, `config-json-output`, `config-advanced`, `providers-openai`, `providers-anthropic`, `providers-google` |
| **Messages** (2) | `messages-roles`, `messages-multimodal` |
| **Tools** (4) | `tools-builtin`, `tools-custom`, `tools-schema` |
| **Techniques** (4) | `technique-role`, `technique-few-shot`, `technique-cot`, `technique-tot` |
| **Recipes** (5) | `recipe-classification`, `recipe-extraction`, `recipe-generation`, `recipe-chatbot`, `recipe-rag` |
| **Guides** (6) | `conversation-history`, `guide-debugging`, `guide-safety`, `guide-performance`, `guide-testing`, `guide-versioning` |

```json
{
  "topic": "recipe-rag"
}
```

**Returns:** Comprehensive documentation with syntax, examples, best practices, related topics, and suggested tools.

---

#### Writing PromptL-Compliant Prompts

AI agents can use these tools to write valid PromptL prompts:

```
1. latitude_find_docs({ query: "build a chatbot" })  → Discover relevant topics
2. latitude_get_docs({ topic: "recipe-chatbot" })    → Learn chatbot patterns
3. latitude_get_docs({ topic: "conversation-history" }) → Learn context management
4. latitude_push_prompt                              → Push your prompt
5. latitude_run_prompt                               → Test execution
```

**Example: AI discovers how to extract structured data:**

```
AI: latitude_find_docs({ query: "extract JSON from text" })
   → Returns: config-json-output (score: 24), recipe-extraction (score: 18)

AI: latitude_get_docs({ topic: "config-json-output" })
   → Learns: schema config, JSON Schema types, constraints

AI: Now writes valid PromptL:
   ---
   provider: OpenAI
   model: gpt-4o
   schema:
     type: object
     properties:
       name: { type: string }
       email: { type: string }
     required: [name, email]
   ---
   Extract contact info from: {{ text }}
```

---

### Project Tools

#### `latitude_list_projects`

List all projects in your Latitude workspace.

```json
// No parameters required
{}
```

**Returns:** Array of projects with `id`, `name`, `createdAt`, `updatedAt`

---

#### `latitude_create_project`

Create a new project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Project name |

```json
{
  "name": "My Awesome Prompts"
}
```

---

### Version Tools

#### `latitude_list_versions`

List all versions (commits) for a project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |

```json
{
  "projectId": "27756"
}
```

---

#### `latitude_get_version`

Get details for a specific version.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |
| `versionUuid` | `string` | Yes | Version UUID |

---

#### `latitude_create_version`

Create a new draft version (branch).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |
| `name` | `string` | Yes | Version/commit name |

```json
{
  "projectId": "27756",
  "name": "feature-new-tone"
}
```

---

#### `latitude_publish_version`

Publish a draft version to make it live.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |
| `versionUuid` | `string` | Yes | Draft version UUID |
| `title` | `string` | No | Publication title |
| `description` | `string` | No | Publication notes |

---

### Prompt Tools

#### `latitude_list_prompts`

List all prompts in a version.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | `string` | Yes | — | Project ID |
| `versionUuid` | `string` | No | `"live"` | Version UUID |

---

#### `latitude_get_prompt`

Get a specific prompt by path.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | `string` | Yes | — | Project ID |
| `path` | `string` | Yes | — | Prompt path (e.g., `"my-prompt"`) |
| `versionUuid` | `string` | No | `"live"` | Version UUID |

```json
{
  "projectId": "27756",
  "path": "onboarding/welcome",
  "versionUuid": "79b52596-7941-4ed3-82cf-23e13fa170db"
}
```

---

#### `latitude_push_prompt`

Push prompt content to a draft version.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | `string` | Yes | — | Project ID |
| `versionUuid` | `string` | Yes | — | Draft version UUID |
| `path` | `string` | Yes | — | Prompt path |
| `content` | `string` | Yes | — | Full prompt content with frontmatter |
| `force` | `boolean` | No | `false` | Overwrite if exists |

```json
{
  "projectId": "27756",
  "versionUuid": "79b52596-7941-4ed3-82cf-23e13fa170db",
  "path": "greeting",
  "content": "---\nprovider: openai\nmodel: gpt-4o-mini\n---\nHello {{name}}! Welcome to our service."
}
```

---

#### `latitude_push_prompt_from_file` ⭐

**Push a prompt directly from a local file.** This is the killer feature for IDE workflows.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | `string` | Yes | — | Project ID |
| `versionUuid` | `string` | Yes | — | Draft version UUID |
| `filePath` | `string` | Yes | — | Absolute path to prompt file |
| `promptPath` | `string` | No | *derived* | Path in Latitude (auto-derived from filename) |
| `force` | `boolean` | No | `false` | Overwrite if exists |

**Auto-derivation:** If you push `/path/to/my-prompt.md`, it automatically becomes `my-prompt` in Latitude.

```json
{
  "projectId": "27756",
  "versionUuid": "79b52596-7941-4ed3-82cf-23e13fa170db",
  "filePath": "/Users/you/prompts/welcome-message.md"
}
```

**Supported extensions:** `.md`, `.promptl`, `.txt`

---

### Execution Tools

#### `latitude_run_prompt`

Execute a prompt and get AI response.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | `string` | Yes | — | Project ID |
| `path` | `string` | Yes | — | Prompt path |
| `versionUuid` | `string` | No | `"live"` | Version UUID |
| `parameters` | `object` | No | `{}` | Template variables |
| `userMessage` | `string` | No | — | Additional user input |
| `stream` | `boolean` | No | `false` | Enable streaming |

```json
{
  "projectId": "27756",
  "path": "greeting",
  "parameters": { "name": "World" },
  "stream": true
}
```

---

#### `latitude_chat`

Continue an existing conversation.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `conversationUuid` | `string` | Yes | — | Conversation UUID |
| `message` | `string` | Yes | — | User message |
| `stream` | `boolean` | No | `false` | Enable streaming |

---

#### `latitude_get_conversation`

Get full conversation history.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationUuid` | `string` | Yes | Conversation UUID |

---

### Operations Tools

#### `latitude_push_changes`

Push multiple document changes in a single operation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |
| `versionUuid` | `string` | Yes | Target version UUID (must be draft) |
| `changes` | `array` | Yes | Array of `{path, content, status}` |

**Change status values:** `"added"` | `"modified"` | `"deleted"`

---

#### `latitude_create_log`

Create a log entry for external executions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |
| `documentPath` | `string` | Yes | Prompt path |
| `messages` | `array` | Yes | Conversation messages |

---

#### `latitude_stop_conversation`

Stop an ongoing conversation/generation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationUuid` | `string` | Yes | Conversation UUID to stop |

---

## 📚 Resource Templates

Access Latitude data via MCP resources (read-only):

| Resource URI | Description |
|:-------------|:------------|
| `latitude://projects` | List all projects |
| `latitude://projects/{projectId}/versions` | List versions for project |
| `latitude://projects/{projectId}/versions/{versionUuid}/prompts` | List prompts in version |
| `latitude://projects/{projectId}/versions/{versionUuid}/prompts/{path}` | Get specific prompt |
| `docs://latitude/help` | Server overview & quick start |
| `docs://latitude/{topic}` | PromptL documentation by topic |

---

## 💻 CLI Reference

The server also works as a standalone CLI tool:

```bash
# Set your API key
export LATITUDE_API_KEY="your-key"

# Or use inline
LATITUDE_API_KEY="your-key" latitude-mcp projects list
```

### Commands

```bash
# Projects
latitude-mcp projects list
latitude-mcp projects create "My Project"

# Versions
latitude-mcp versions list <projectId>
latitude-mcp versions create <projectId> "Draft Name"

# Prompts
latitude-mcp prompts list <projectId> -v <versionUuid>
latitude-mcp prompts get <projectId> <path> -v <versionUuid>

# Push (inline content)
latitude-mcp push <projectId> <versionUuid> <promptPath> --content "---\nprovider: openai\n---\nHello!"

# Push (from file) ⭐
latitude-mcp push <projectId> <versionUuid> --file /path/to/prompt.md

# Run
latitude-mcp run <projectId> <path> -v <versionUuid> -p '{"name": "World"}'

# Chat
latitude-mcp chat <conversationUuid> -m "Follow up question"
```

### Options

| Flag | Description |
|------|-------------|
| `-v, --version-uuid` | Version UUID (default: `"live"`) |
| `-p, --parameters` | JSON parameters for run |
| `-m, --message` | Message for chat |
| `-s, --stream` | Enable streaming |
| `-o, --output-format` | `"toon"` or `"json"` (default: `"toon"`) |
| `--file` | Path to prompt file |
| `--content` | Inline prompt content |
| `--force` | Force overwrite |

---

## 🔥 Recommended Workflows

### Local Development Flow

```
1. Write prompt in your IDE: /prompts/my-feature.md
2. AI: "Push this to my Latitude draft"
   → latitude_push_prompt_from_file
3. AI: "Run it with test parameters"
   → latitude_run_prompt
4. Iterate on content locally
5. AI: "Push the updated version"
6. AI: "Publish to live"
   → latitude_publish_version
```

### Prompt Audit Flow

```
1. AI: "List all my Latitude projects"
   → latitude_list_projects
2. AI: "Show me all prompts in project 27756"
   → latitude_list_prompts
3. AI: "Get the content of the onboarding prompt"
   → latitude_get_prompt
4. AI: "Check the execution logs"
   → latitude_list_logs
```

### Conversation Testing Flow

```
1. AI: "Run the support-bot prompt"
   → latitude_run_prompt (returns conversationUuid)
2. AI: "Continue with: What about refunds?"
   → latitude_chat
3. AI: "Show the full conversation"
   → latitude_get_conversation
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LATITUDE_API_KEY` | Yes | — | Your Latitude API key |
| `LATITUDE_PROJECT_ID` | No | — | Default project ID (skip `projectId` in all tools) |
| `LATITUDE_BASE_URL` | No | `https://gateway.latitude.so` | API base URL |

### Skip `projectId` with Default Project

Set `LATITUDE_PROJECT_ID` to avoid specifying `projectId` in every tool call:

```json
{
  "mcpServers": {
    "latitude": {
      "command": "npx",
      "args": ["latitude-mcp-server"],
      "env": {
        "LATITUDE_API_KEY": "your-api-key",
        "LATITUDE_PROJECT_ID": "27756"
      }
    }
  }
}
```

When set, all tools that require `projectId` will use this default. You can still override per-call.

---

## 🔥 Common Issues & Quick Fixes

<details>
<summary><b>Expand for troubleshooting tips</b></summary>

| Problem | Solution |
| :--- | :--- |
| **"LATITUDE_API_KEY is required"** | Set the env variable in your MCP config or shell |
| **"Head commit not found"** | Project has no published version — use a specific `versionUuid` instead of `"live"` |
| **"Provider API Key not found"** | Add your LLM provider key (OpenAI, Anthropic) in [Latitude settings](https://app.latitude.so/settings) |
| **Push fails with "version is merged"** | Can only push to draft versions — create a new draft first |
| **File push path wrong** | The tool auto-derives from filename; use `promptPath` param to override |

</details>

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/yigitkonur/latitude-mcp-server.git
cd latitude-mcp-server

# Install
npm install

# Build
npm run build

# Test
npm test

# Run locally
LATITUDE_API_KEY=your-key node dist/index.js projects list
```

---

<div align="center">

**Built with 🚀 because managing prompts should be as easy as writing code.**

ISC © [Yiğit Konur](https://github.com/yigitkonur)

</div>
