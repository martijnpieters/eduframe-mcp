# eduframe-mcp

Eduframe MCP server — exposes [Eduframe](https://www.eduframe.nl/) resources as MCP tools.

## Usage in VSCode

Add the following configuration to your `.vscode/mcp.json` file to use this MCP server with GitHub Copilot in agent mode.

### Using `npx` (from GitHub)

```json
{
  "servers": {
    "eduframe": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:martijnpieters/eduframe-mcp"],
      "env": {
        "EDUFRAME_API_TOKEN": "${input:eduframe_api_token}"
      }
    }
  },
  "inputs": [
    {
      "id": "eduframe_api_token",
      "type": "promptString",
      "description": "Eduframe API token",
      "password": true
    }
  ]
}
```

### Development (from this repository)

First, build the project:

```sh
pnpm install && pnpm build
```

Then add the following to `.vscode/mcp.json` in this repository:

```json
{
  "servers": {
    "eduframe": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "EDUFRAME_API_TOKEN": "${input:eduframe_api_token}"
      }
    }
  },
  "inputs": [
    {
      "id": "eduframe_api_token",
      "type": "promptString",
      "description": "Eduframe API token",
      "password": true
    }
  ]
}
```

## Configuration

The server requires one environment variable:

| Variable | Description |
|---|---|
| `EDUFRAME_API_TOKEN` | Your Eduframe API token (Bearer token) |

## Tools

### Leads (`src/tools/leads.ts`)

| Tool | Description |
|---|---|
| `list_leads` | Get all lead records. Supports `cursor`, `per_page`, and `email` filter parameters. |
| `get_lead` | Get one lead record by ID. |
| `create_lead` | Create a new lead. Accepts `title`, `first_name`, `middle_name`, `last_name`, `email`, `phone`, `company_name`, `status`, `quality`, `value`, `wants_newsletter`, `comment`, `administrator_id`, `account_id`, `user_id`, `label_ids`, `lead_products`, and `address_attributes`. |
| `update_lead` | Update the status of an existing lead. Requires `id` and `status`. |
| `delete_lead` | Delete a lead by ID. |
