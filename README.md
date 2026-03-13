# eduframe-mcp

Eduframe MCP server — exposes [Eduframe](https://www.eduframe.nl/) resources as MCP tools.

## Configuration

The server requires two environment variables:

| Variable | Description |
|---|---|
| `EDUFRAME_API_TOKEN` | Your Eduframe API token (Bearer token) |
| `EDUFRAME_EDUCATOR_SLUG` | Your Eduframe educator slug (tenant identifier) |

## Tools

### Leads (`src/tools/leads.ts`)

| Tool | Description |
|---|---|
| `list_leads` | Get all lead records. Supports `cursor`, `per_page`, and `email` filter parameters. |
| `get_lead` | Get one lead record by ID. |
| `create_lead` | Create a new lead. Accepts `title`, `first_name`, `middle_name`, `last_name`, `email`, `phone`, `company_name`, `status`, `quality`, `value`, `wants_newsletter`, `comment`, `administrator_id`, `account_id`, `user_id`, `label_ids`, `lead_products`, and `address_attributes`. |
| `update_lead` | Update the status of an existing lead. Requires `id` and `status`. |
| `delete_lead` | Delete a lead by ID. |
