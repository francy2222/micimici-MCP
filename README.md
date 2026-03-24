# 🐱 Micimici MCP v2.0

**Educational Multimedia Search + Notion Integration — an MCP server for AI assistants**

Micimici MCP is a [Model Context Protocol](https://modelcontextprotocol.io/) server that gives AI assistants (Claude, ChatGPT, Cursor, etc.) the ability to:

- **Search 7 multimedia sources** for educational content: images, videos, diagrams, cultural heritage
- **Read and write to Notion** workspaces: search pages, create content, build databases

Built by a special needs teacher for the educational community. Free, open, and privacy-respecting.

## 🔗 Live Server

```
https://micimici-mcp-v2.vercel.app/api/mcp
```

Connect it in any MCP-compatible client (Claude Desktop, Cursor, ChatGPT, etc.).

## 🛠️ 10 Tools Available

### Media Search (7 tools)

| Tool | Source | Content | License |
|------|--------|---------|---------|
| `bing_search_images` | Bing | Photos, clipart, line drawings, GIFs | Various |
| `pixabay_search` | Pixabay | Photos, illustrations, vectors, videos | CC0 |
| `pexels_search` | Pexels | Professional photos and videos | Free |
| `unsplash_search` | Unsplash | High-quality HD photos | Free (attribution) |
| `wikimedia_search` | Wikimedia Commons | Diagrams, scientific illustrations, maps | CC / Public Domain |
| `europeana_search` | Europeana | European cultural heritage, artworks | Open |
| `openclipart_search` | OpenClipart | SVG clipart, vector graphics | CC0 / Public Domain |

### Notion Integration (3 tools)

| Tool | Description |
|------|-------------|
| `notion_search` | Search your Notion workspace for pages and databases |
| `notion_save_page` | Create a new page with markdown content under any parent page |
| `notion_create_database` | Create a structured database with typed columns (text, number, select, date, checkbox, etc.) |

## 🚀 Deploy Your Own

### 1. Clone and deploy to Vercel

```bash
git clone https://github.com/francy2222/micimici-mcp.git
cd micimici-mcp
vercel deploy
```

### 2. Set environment variables in Vercel Dashboard

**Media providers (optional — each enables its tool):**
- `PEXELS_API_KEY` — from [pexels.com/api](https://www.pexels.com/api/)
- `PIXABAY_API_KEY` — from [pixabay.com/api/docs](https://pixabay.com/api/docs/)
- `UNSPLASH_ACCESS_KEY` — from [unsplash.com/developers](https://unsplash.com/developers)
- `EUROPEANA_API_KEY` — from [pro.europeana.eu/page/get-api](https://pro.europeana.eu/page/get-api)

**Notion (optional — enables notion_* tools):**
- `NOTION_TOKEN` — from [notion.so/my-integrations](https://www.notion.so/my-integrations)

> **Note:** Bing, Wikimedia, and OpenClipart work without API keys.

### 3. Connect to your AI tool

In Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "micimici": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-deploy.vercel.app/api/mcp"]
    }
  }
}
```

## 🏫 Why "Micimici"?

Named after Micimici, one of the beloved cats in our school community's cat colony. Because every good project needs a cat.

## 📄 License

MIT License — Free to use, modify, and distribute.

Built with ❤️ by Francesca Bertolini — Special Needs Teacher & Self-taught Developer
