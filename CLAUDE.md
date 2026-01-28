# n8n Workflow Builder

This project helps create high-quality n8n workflows using Claude with access to n8n-specific tools and skills.

## Available Tools

### n8n-MCP Server

The n8n-MCP server provides structured access to n8n's node documentation and workflow management capabilities.

**Key Capabilities:**
- Access to 1,084 n8n nodes (537 core + 547 community)
- 2,709 workflow templates with complete metadata
- 2,646 pre-extracted real-world configurations
- 265 AI-capable tool variants with full documentation
- Workflow validation and testing tools

**Use the MCP tools to:**
- Search for nodes by functionality
- Get detailed node schemas and property requirements
- Validate workflow configurations
- Access real-world workflow examples
- Manage workflows (create, update, activate) when API credentials are configured

### GitHub MCP Server

Provides GitHub integration for repository management, issues, pull requests, and more.

**Capabilities:**
- Create, read, update repositories
- Manage issues and pull requests
- Access GitHub Actions
- Code search and security features

**Configuration:** Requires Docker and a GitHub Personal Access Token (stored securely in environment variables).

### n8n Skills

Seven complementary skills that activate automatically based on context:

| Skill | Purpose |
|-------|---------|
| **n8n MCP Tools Expert** | Guides effective use of MCP tools for searching nodes, validating configs |
| **n8n Expression Syntax** | Correct `{{}}` expression patterns, `$json`, `$node`, `$now`, `$env` variables |
| **n8n Workflow Patterns** | 5 proven patterns: webhook, HTTP API, database, AI, scheduled workflows |
| **n8n Validation Expert** | Interprets validation errors, troubleshooting, validation profiles |
| **n8n Node Configuration** | Operation-aware node setup, property dependencies, AI connection types |
| **n8n Code JavaScript** | Code node patterns, return format `[{json: {...}}]`, production patterns |
| **n8n Code Python** | Python in Code nodes (use JavaScript for 95% of cases) |

### Frontend Design Skill

Creates distinctive, production-grade frontend interfaces that avoid generic AI aesthetics.

**Use for:**
- Building web components, pages, or applications
- Creating visually striking and memorable interfaces
- Implementing bold aesthetic directions (minimalist, maximalist, brutalist, retro-futuristic, etc.)

**Key principles:**
- Choose distinctive typography (avoid Inter, Roboto, Arial)
- Commit to cohesive color themes with sharp accents
- Use purposeful animations and micro-interactions
- Create unexpected layouts with asymmetry and grid-breaking elements

## Workflow Creation Process

1. **Understand the requirement** - Clarify what the workflow should accomplish
2. **Search for nodes** - Use MCP tools to find appropriate nodes for each step
3. **Check templates** - Look for similar existing workflows as reference
4. **Configure nodes** - Use node schemas to set correct properties
5. **Write expressions** - Map data between nodes using proper syntax
6. **Validate** - Run validation to catch configuration issues
7. **Test** - Always test in a development/copy workflow first

## Critical Rules

### Safety First
- **NEVER edit production workflows directly** - Always copy, test, then deploy
- Export backups before making changes to existing workflows
- Validate all changes before activating

### Expression Syntax
- Webhook data is under `$json.body`, not `$json` directly
- Use `{{ }}` for expressions in node parameters
- Reference previous nodes: `{{ $node["NodeName"].json.field }}`

### Code Node Returns
- JavaScript must return: `[{json: {...}}]`
- Always return an array of objects with `json` property

### Node Configuration
- Check operation-specific requirements (e.g., `sendBody` requires `contentType`)
- Use validation profiles: minimal (draft) → runtime (testing) → strict (production)
- Pay attention to nodeType format variations when searching

## Common Patterns

### Webhook Processing
Webhook Trigger → Process Data → Transform → Send Response

### HTTP API Integration
Trigger → HTTP Request → Parse Response → Store/Forward

### Database Operations
Trigger → Query/Transform → Database Node → Handle Results

### AI Workflows
Trigger → Prepare Context → AI Node → Process Response → Output

### Scheduled Tasks
Schedule Trigger → Fetch Data → Process → Notify/Store

## Resources

- [n8n-MCP Documentation](https://github.com/czlonkowski/n8n-mcp)
- [n8n-Skills Documentation](https://github.com/czlonkowski/n8n-skills)
- [n8n Official Docs](https://docs.n8n.io/)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Frontend Design Skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
