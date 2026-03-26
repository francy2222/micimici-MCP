# 🐱 Micimici MCP — Skill for AI Assistants

> Install this skill to teach your AI assistant how to use the Micimici MCP server effectively.

---

## What is Micimici MCP?

Micimici MCP is an MCP server that provides **11 tools** for educational content creation:
- **7 multimedia search tools** — find images, videos, diagrams from free sources
- **3 Notion tools** — search, create pages, and build databases in your Notion workspace
- **1 publishing tool** — publish HTML pages to shareable public URLs

**Server endpoint:** `https://micimici-mcp.vercel.app/api/mcp`

---

## Quick Start

### Step 1 — Connect to your AI tool

**Claude Desktop** — add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "micimici": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://micimici-mcp.vercel.app/api/mcp"]
    }
  }
}
```

**Claude.ai** — add as custom MCP connector in Settings → Connectors with URL:
```
https://micimici-mcp.vercel.app/api/mcp
```

**Cursor / Other MCP clients** — use the same endpoint URL above.

### Step 2 — Load the tools

If tools are not automatically available, load them with:
```
tool_search("micimici")
```

This will make all 11 tools visible to the AI assistant.

---

## Tool Reference

### 🖼️ Multimedia Search (7 tools)

All search tools return an array of results with: `url`, `thumb`, `title`, `width`, `height`, `provider`.

#### `web_search_images`
General web image search with powerful filters.

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `max_results` | integer | 1–35 (default 10) |
| `size` | enum | small, medium, large, wallpaper |
| `color` | enum | bw, color, red, orange, yellow, green, teal, blue, purple, pink, brown, black, gray, white |
| `type` | enum | photo, clipart, linedrawing, animatedgif, transparent |
| `layout` | enum | square, wide, tall |
| `people` | enum | face, portrait |
| `date` | enum | 24h, week, month, year |
| `license` | enum | creativeCommons, publicDomain, share, shareCommercially, modify, modifyCommercially |

**Best for:** General image search, coloring pages (type: linedrawing), clipart, filtered searches.

**Example prompts:**
- "Search for coloring pages of animals" → `web_search_images` with type: linedrawing
- "Find transparent PNG icons of school supplies" → `web_search_images` with type: transparent

---

#### `pixabay_search`
Royalty-free photos, illustrations, vectors, and videos. All CC0 (free for any use).

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `media_type` | enum | image, video (default: image) |
| `max_results` | integer | 1–50 (default 10) |
| `image_type` | enum | all, photo, illustration, vector |
| `video_type` | enum | all, film, animation |
| `orientation` | enum | all, horizontal, vertical |
| `category` | enum | backgrounds, fashion, nature, science, education, feelings, health, people, religion, places, animals, industry, computer, food, sports, transportation, travel, buildings, business, music |
| `colors` | enum | grayscale, transparent, red, orange, yellow, green, turquoise, blue, lilac, pink, white, gray, black, brown |
| `order` | enum | popular, latest |
| `lang` | enum | it, en, de, fr, es, pt, nl, ja, ko, zh |
| `editors_choice` | boolean | Curated high-quality content |

**Best for:** Educational illustrations (image_type: illustration), science diagrams, CC0 content, videos for presentations.

**Example prompts:**
- "Find educational illustrations about photosynthesis" → `pixabay_search` with category: science, image_type: illustration
- "Search for short nature videos" → `pixabay_search` with media_type: video, category: nature

---

#### `pexels_search`
High-quality professional photos and videos, free to use.

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `media_type` | enum | photo, video (default: photo) |
| `max_results` | integer | 1–80 (default 10) |
| `orientation` | enum | landscape, portrait, square |
| `size` | enum | large, medium, small |
| `color` | string | red, orange, yellow, green, turquoise, blue, violet, pink, brown, black, gray, white, or hex code |

**Best for:** Professional photos for presentations, worksheets, posters. Videos for web pages.

---

#### `unsplash_search`
Premium HD photography. Attribution appreciated: "Photo by [name] on Unsplash".

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `max_results` | integer | 1–30 (default 10) |
| `orientation` | enum | landscape, portrait, squarish |
| `color` | enum | black_and_white, black, white, yellow, orange, red, purple, magenta, green, teal, blue |
| `order_by` | enum | relevant, latest |
| `content_filter` | enum | low, high (use "high" for school-safe content) |

**Best for:** Hero images, backgrounds, artistic photos. Use content_filter: high for school use.

---

#### `wikimedia_search`
Free educational media from Wikimedia Commons: diagrams, maps, scientific illustrations. All CC or public domain. No API key required.

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `max_results` | integer | 1–50 (default 10) |

**Best for:** Water cycle diagrams, solar system illustrations, anatomy charts, historical maps, scientific figures.

**Example prompts:**
- "Find a diagram of the water cycle" → `wikimedia_search` with query: "water cycle diagram"
- "Search for a map of ancient Rome" → `wikimedia_search` with query: "ancient Rome map"

---

#### `europeana_search`
European cultural heritage: artworks, historical photographs, manuscripts, maps from museums and archives across Europe. No API key required for basic searches.

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `max_results` | integer | 1–50 (default 10) |

**Best for:** Art history, Renaissance paintings, medieval manuscripts, historical photographs, cultural studies.

---

#### `openclipart_search`
Public domain SVG clipart and vector graphics. All CC0. No API key required.

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `max_results` | integer | 1–50 (default 10) |

**Best for:** Simple illustrations for worksheets, icons, decorative elements.

⚠️ **Note:** OpenClipart API can be unstable. Use as fallback after other sources.

---

### 📝 Notion Integration (3 tools)

#### `notion_search`
Search pages and databases in the connected Notion workspace.

| Parameter | Type | Values |
|-----------|------|--------|
| `query` | string | Search text (required) |
| `filter_type` | enum | page, database, all (default: all) |

**Returns:** List of results with `id`, `type`, `title`, `url`.

**Important:** Use this tool first to find the `parent_page_id` needed by `notion_save_page` and `notion_create_database`.

---

#### `notion_save_page`
Create a new Notion page with Markdown content under a parent page.

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | string | Page title (required) |
| `content` | string | Page body in Markdown (required) |
| `parent_page_id` | string | ID of parent page — use `notion_search` to find it (required) |
| `icon_emoji` | string | Emoji icon for the page, e.g. "📚" (optional) |

**Supported Markdown:**
- `# Heading 1`, `## Heading 2`, `### Heading 3`
- `- Bulleted list` or `* Bulleted list`
- `1. Numbered list`
- `> Blockquote`
- `---` Divider
- Plain text → paragraph

---

#### `notion_create_database`
Create a structured Notion database with typed columns.

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | string | Database title (required) |
| `parent_page_id` | string | ID of parent page (required) |
| `properties` | array | Column definitions (required) |

**Column types:** `text`, `number`, `select`, `multi_select`, `date`, `checkbox`, `url`, `email`

For `select` and `multi_select`, provide options:
```json
{ "name": "Subject", "type": "select", "options": ["Math", "Science", "History"] }
```

**Example — Student progress tracker:**
```json
{
  "title": "Student Progress",
  "parent_page_id": "...",
  "properties": [
    { "name": "Subject", "type": "select", "options": ["Math", "Science", "Italian", "Music", "History"] },
    { "name": "Score", "type": "number" },
    { "name": "Date", "type": "date" },
    { "name": "Completed", "type": "checkbox" },
    { "name": "Notes", "type": "text" }
  ]
}
```

---

### 🌐 Publishing (1 tool)

#### `publish_html_page`
Publish a complete HTML page to a public URL (valid 24 hours). Optionally save the link to Notion.

| Parameter | Type | Description |
|-----------|------|-------------|
| `html` | string | Complete HTML content (required) |
| `title` | string | Page title for Notion bookmark (optional) |
| `save_to_notion` | boolean | Also save link to Notion (default: false) |
| `parent_page_id` | string | Notion parent page ID — required if save_to_notion is true |

**Why use this?** Notion filters many external image URLs. When you generate an HTML page with images from Pexels, Pixabay, etc., publishing it first guarantees all images display correctly. The teacher gets a shareable link, and Notion stores only the link (not the filtered images).

---

## Common Workflows

### 1. Create an educational page with images
```
1. Search images: pexels_search("water cycle", max_results: 3)
2. Build HTML page with the image URLs
3. Publish: publish_html_page(html, title: "Water Cycle", save_to_notion: true, parent_page_id: "...")
```

### 2. Organize content in Notion
```
1. Find parent: notion_search("Lessons")
2. Create page: notion_save_page(title: "Lesson 5: Volcanoes", content: "## Objectives\n- ...", parent_page_id: "...")
```

### 3. Build a tracking database
```
1. Find parent: notion_search("Getting Started")
2. Create database: notion_create_database(title: "Reading Log", parent_page_id: "...", properties: [...])
```

### 4. Find images for worksheets
```
- Coloring pages: web_search_images(query: "cat", type: "linedrawing")
- Scientific diagrams: wikimedia_search(query: "cell structure")
- Professional photos: pexels_search(query: "rainforest", orientation: "landscape")
- Cultural heritage: europeana_search(query: "Leonardo da Vinci")
```

---

## Configuration

### Environment Variables (Vercel Dashboard)

| Variable | Required | Source |
|----------|----------|--------|
| `PEXELS_API_KEY` | For Pexels | [pexels.com/api](https://www.pexels.com/api/) |
| `PIXABAY_API_KEY` | For Pixabay | [pixabay.com/api/docs](https://pixabay.com/api/docs/) |
| `UNSPLASH_ACCESS_KEY` | For Unsplash | [unsplash.com/developers](https://unsplash.com/developers) |
| `EUROPEANA_API_KEY` | For Europeana | [pro.europeana.eu](https://pro.europeana.eu/page/get-api) |
| `NOTION_TOKEN` | For Notion tools | [notion.so/my-integrations](https://www.notion.so/my-integrations) |

**Tools that work without any key:** `web_search_images`, `wikimedia_search`, `openclipart_search`

### Notion Setup
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new Internal Integration
3. Copy the token → add as `NOTION_TOKEN` on Vercel
4. In Notion, open any page → "..." → "Connections" → add your integration
5. The integration can only access pages where it has been explicitly added

---

## About

Built by **Francesca Bertolini** — Special Needs Teacher & Self-taught Developer from Italy 🇮🇹

Named after Micimici, one of three inseparable orange kittens in the school community's cat colony. 🐱

**Repository:** [github.com/francy2222/micimici-MCP](https://github.com/francy2222/micimici-MCP)
**License:** MIT
