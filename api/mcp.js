// ============================================================
// MICIMICI MCP v2.0 — Educational Multimedia Search + Notion
// 
// 7 media search tools (Bing, Pexels, Pixabay, Unsplash,
//   Wikimedia, Europeana, OpenClipart)
// 3 Notion tools (search, save page, create database)
//
// Env vars:
//   PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY,
//   EUROPEANA_API_KEY — media providers
//   NOTION_TOKEN — Notion Internal Integration Token
// ============================================================

import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

// ============================================================
// MEDIA SEARCH FUNCTIONS
// ============================================================

async function searchBing(query, num, filters = {}) {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('form', 'IRFLTR');
    params.set('first', '1');
    params.set('adlt', 'moderate');

    const qft = [];
    const sizeMap = { small: 'small', medium: 'medium', large: 'large', wallpaper: 'wallpaper' };
    const colorMap = {
        bw: 'bw', color: 'color', red: 'FGcls_RED', orange: 'FGcls_ORANGE',
        yellow: 'FGcls_YELLOW', green: 'FGcls_GREEN', teal: 'FGcls_TEAL',
        blue: 'FGcls_BLUE', purple: 'FGcls_PURPLE', pink: 'FGcls_PINK',
        brown: 'FGcls_BROWN', black: 'FGcls_BLACK', white: 'FGcls_WHITE', gray: 'FGcls_GRAY'
    };
    const typeMap = { photo: 'photo', clipart: 'clipart', linedrawing: 'linedrawing', animatedgif: 'animatedgif', transparent: 'transparent' };
    const layoutMap = { square: 'square', wide: 'wide', tall: 'tall' };
    const peopleMap = { face: 'face', portrait: 'portrait' };
    const dateMap = { '24h': 'lt1440', 'week': 'lt10080', 'month': 'lt43200', 'year': 'lt525600' };
    const licenseMap = {
        creativeCommons: 'license-L2_L3_L4_L5_L6_L7', publicDomain: 'license-L1',
        share: 'license-L2_L3_L4_L5_L6_L7', shareCommercially: 'license-L2_L3_L4',
        modify: 'license-L2_L3_L5_L6', modifyCommercially: 'license-L2_L3'
    };

    if (filters.size && sizeMap[filters.size]) qft.push('filterui:imagesize-' + sizeMap[filters.size]);
    if (filters.color && colorMap[filters.color]) qft.push('filterui:color2-' + colorMap[filters.color]);
    if (filters.type && typeMap[filters.type]) qft.push('filterui:photo-' + typeMap[filters.type]);
    if (filters.layout && layoutMap[filters.layout]) qft.push('filterui:aspect-' + layoutMap[filters.layout]);
    if (filters.people && peopleMap[filters.people]) qft.push('filterui:face-' + peopleMap[filters.people]);
    if (filters.date && dateMap[filters.date]) qft.push('filterui:age-' + dateMap[filters.date]);
    if (filters.license && licenseMap[filters.license]) qft.push('filterui:' + licenseMap[filters.license]);
    if (qft.length) params.set('qft', '+' + qft.join('+'));

    const url = 'https://www.bing.com/images/search?' + params.toString();
    const resp = await fetch(url, {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,it;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    if (!resp.ok) throw new Error('Bing fetch failed: HTTP ' + resp.status);
    const html = await resp.text();

    const results = [];
    const decodeEntities = s => s.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'");
    const regex = /<a[^>]*class="[^"]*iusc[^"]*"[^>]*m="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null && results.length < num) {
        try {
            const d = JSON.parse(decodeEntities(match[1]));
            if (d.murl) results.push({ url: d.murl, thumb: d.turl || d.murl, title: d.t || '', width: d.w || 0, height: d.h || 0, sourceUrl: d.purl || '', provider: 'bing' });
        } catch(e) {}
    }
    if (!results.length) {
        const regex2 = /\bm="(\{[^"]*murl[^"]*\})"/g;
        while ((match = regex2.exec(html)) !== null && results.length < num) {
            try {
                const d = JSON.parse(decodeEntities(match[1]));
                if (d.murl) results.push({ url: d.murl, thumb: d.turl || d.murl, title: d.t || '', width: d.w || 0, height: d.h || 0, sourceUrl: d.purl || '', provider: 'bing' });
            } catch(e) {}
        }
    }
    return results;
}

async function searchPixabay(query, num, opts = {}) {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error('Pixabay API not configured');

    if (opts.media_type === 'video') {
        const url = `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${num}` +
            (opts.video_type && opts.video_type !== 'all' ? `&video_type=${opts.video_type}` : '') +
            (opts.category ? `&category=${opts.category}` : '') +
            (opts.order ? `&order=${opts.order}` : '') +
            (opts.lang ? `&lang=${opts.lang}` : '') +
            (opts.editors_choice ? '&editors_choice=true' : '');
        const resp = await fetch(url);
        const data = await resp.json();
        if (!data.hits?.length) return [];
        return data.hits.map(v => {
            const small = v.videos?.small || {};
            const medium = v.videos?.medium || {};
            return { id: v.id, url: small.url || medium.url || '', urlHD: medium.url || small.url || '', thumb: `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg`, title: v.tags || '', duration: v.duration || 0, width: small.width || 0, height: small.height || 0, provider: 'pixabay', credit: 'Pixabay / ' + (v.user || ''), pageUrl: v.pageURL || '' };
        }).filter(v => v.url);
    }

    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${num}` +
        (opts.image_type && opts.image_type !== 'all' ? `&image_type=${opts.image_type}` : '') +
        (opts.orientation && opts.orientation !== 'all' ? `&orientation=${opts.orientation}` : '') +
        (opts.category ? `&category=${opts.category}` : '') +
        (opts.colors ? `&colors=${opts.colors}` : '') +
        (opts.order ? `&order=${opts.order}` : '') +
        (opts.lang ? `&lang=${opts.lang}` : '') +
        (opts.editors_choice ? '&editors_choice=true' : '') +
        (opts.min_width ? `&min_width=${opts.min_width}` : '') +
        (opts.min_height ? `&min_height=${opts.min_height}` : '');
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.hits?.length) return [];
    return data.hits.map(item => ({ url: item.largeImageURL || item.webformatURL, thumb: item.previewURL, title: item.tags || '', width: item.imageWidth || 0, height: item.imageHeight || 0, provider: 'pixabay' }));
}

async function searchPexels(query, num, opts = {}) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('Pexels API not configured');

    if (opts.media_type === 'video') {
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${num}&size=small`;
        const resp = await fetch(url, { headers: { 'Authorization': apiKey } });
        const data = await resp.json();
        if (!data.videos?.length) return [];
        return data.videos.map(v => {
            const sdFile = v.video_files?.find(f => f.quality === 'sd' && f.width <= 960) || v.video_files?.find(f => f.quality === 'sd') || v.video_files?.[0];
            const hdFile = v.video_files?.find(f => f.quality === 'hd' && f.width <= 1920) || v.video_files?.find(f => f.quality === 'hd');
            return { id: v.id, url: sdFile?.link || hdFile?.link || '', urlHD: hdFile?.link || sdFile?.link || '', thumb: v.image || '', title: v.url?.split('/').pop()?.replace(/-/g, ' ') || 'Pexels video', duration: v.duration || 0, width: sdFile?.width || 0, height: sdFile?.height || 0, provider: 'pexels', credit: 'Pexels', pageUrl: v.url || '' };
        }).filter(v => v.url);
    }

    let url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${num}`;
    if (opts.orientation) url += `&orientation=${opts.orientation}`;
    if (opts.size) url += `&size=${opts.size}`;
    if (opts.color) url += `&color=${opts.color}`;
    const resp = await fetch(url, { headers: { 'Authorization': apiKey } });
    const data = await resp.json();
    if (!data.photos?.length) return [];
    return data.photos.map(p => ({ url: p.src.large || p.src.original, thumb: p.src.medium || p.src.small, title: p.alt || p.photographer || '', width: p.width || 0, height: p.height || 0, provider: 'pexels' }));
}

async function searchUnsplash(query, num, opts = {}) {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) throw new Error('Unsplash API not configured');
    let url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${num}&client_id=${key}`;
    if (opts.orientation) url += `&orientation=${opts.orientation}`;
    if (opts.color) url += `&color=${opts.color}`;
    if (opts.order_by) url += `&order_by=${opts.order_by}`;
    if (opts.content_filter) url += `&content_filter=${opts.content_filter}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.results?.length) return [];
    return data.results.map(p => ({ url: p.urls.regular || p.urls.full, thumb: p.urls.small || p.urls.thumb, title: p.description || p.alt_description || '', width: p.width || 0, height: p.height || 0, provider: 'unsplash' }));
}

async function searchWikimedia(query, num, opts = {}) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${num}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=300`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.query?.pages) return [];
    const results = [];
    for (const pid in data.query.pages) {
        const page = data.query.pages[pid];
        if (page.imageinfo?.[0]) {
            const img = page.imageinfo[0];
            results.push({ url: img.url, thumb: img.thumburl || img.url, title: page.title.replace('File:', ''), width: img.width || 0, height: img.height || 0, provider: 'wikimedia' });
        }
    }
    return results;
}

async function searchEuropeana(query, num) {
    const apiKey = process.env.EUROPEANA_API_KEY;
    if (!apiKey) throw new Error('Europeana API not configured');
    const url = `https://api.europeana.eu/record/v2/search.json?wskey=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&qf=TYPE:IMAGE&media=true&thumbnail=true&reusability=open&rows=${num}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.items) return [];
    return data.items.map(item => {
        const thumb = item.edmPreview?.[0] || '';
        return { url: item.edmIsShownBy?.[0] || thumb, thumb, title: item.title?.[0] || '', width: 0, height: 0, provider: 'europeana' };
    }).filter(i => i.url);
}

async function searchOpenClipart(query, num) {
    const url = `https://openclipart.org/search/json/?query=${encodeURIComponent(query)}&amount=${num}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.payload?.length) return [];
    return data.payload.slice(0, num).map(item => ({
        url: item.svg?.url || item.svg?.png_2400px || '',
        thumb: item.svg?.png_thumb || item.svg?.url || '',
        title: item.title || '', width: 300, height: 300, provider: 'openclipart'
    })).filter(i => i.url);
}

// ============================================================
// NOTION FUNCTIONS
// ============================================================

function getNotionHeaders() {
    const token = process.env.NOTION_TOKEN;
    if (!token) throw new Error('NOTION_TOKEN not configured. Add your Notion Internal Integration Token as an environment variable.');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
    };
}

async function notionSearch(query, filter_type) {
    const body = { query };
    if (filter_type === 'page') body.filter = { value: 'page', property: 'object' };
    if (filter_type === 'database') body.filter = { value: 'database', property: 'object' };

    const resp = await fetch('https://api.notion.com/v1/search', {
        method: 'POST', headers: getNotionHeaders(), body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (data.object === 'error') throw new Error(`Notion API error: ${data.message}`);

    return (data.results || []).map(item => {
        const title = item.properties?.title?.title?.[0]?.plain_text ||
                      item.properties?.Name?.title?.[0]?.plain_text ||
                      item.title?.[0]?.plain_text || '(untitled)';
        return {
            id: item.id,
            type: item.object,
            title,
            url: item.url || '',
            created: item.created_time || '',
            updated: item.last_edited_time || ''
        };
    });
}

async function notionSavePage(title, content_markdown, parent_page_id, icon_emoji) {
    const children = markdownToNotionBlocks(content_markdown);

    const body = {
        properties: {
            title: { title: [{ text: { content: title } }] }
        },
        children
    };

    if (parent_page_id) {
        body.parent = { page_id: parent_page_id };
    } else {
        body.parent = { page_id: parent_page_id || undefined };
    }

    if (icon_emoji) body.icon = { type: 'emoji', emoji: icon_emoji };

    // If no parent, we need to use a different approach — create in workspace
    if (!parent_page_id) {
        // Search for a default parent or create at workspace level
        // Notion API requires a parent for pages
        throw new Error('parent_page_id is required. Use notion_search to find a page to use as parent.');
    }

    const resp = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST', headers: getNotionHeaders(), body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (data.object === 'error') throw new Error(`Notion API error: ${data.message}`);

    return { id: data.id, url: data.url, title, created: data.created_time };
}

async function notionCreateDatabase(title, parent_page_id, properties_config) {
    const properties = { Name: { title: {} } };

    // Parse simple property definitions
    if (properties_config) {
        for (const prop of properties_config) {
            switch (prop.type) {
                case 'text': case 'rich_text':
                    properties[prop.name] = { rich_text: {} }; break;
                case 'number':
                    properties[prop.name] = { number: {} }; break;
                case 'select':
                    properties[prop.name] = { select: { options: (prop.options || []).map(o => ({ name: o })) } }; break;
                case 'multi_select':
                    properties[prop.name] = { multi_select: { options: (prop.options || []).map(o => ({ name: o })) } }; break;
                case 'date':
                    properties[prop.name] = { date: {} }; break;
                case 'checkbox':
                    properties[prop.name] = { checkbox: {} }; break;
                case 'url':
                    properties[prop.name] = { url: {} }; break;
                case 'email':
                    properties[prop.name] = { email: {} }; break;
            }
        }
    }

    const body = {
        parent: { page_id: parent_page_id },
        title: [{ text: { content: title } }],
        properties
    };

    const resp = await fetch('https://api.notion.com/v1/databases', {
        method: 'POST', headers: getNotionHeaders(), body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (data.object === 'error') throw new Error(`Notion API error: ${data.message}`);

    return { id: data.id, url: data.url, title };
}

// Simple markdown → Notion blocks converter
function markdownToNotionBlocks(md) {
    if (!md) return [];
    const blocks = [];
    const lines = md.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('### ')) {
            blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: trimmed.slice(4) } }] } });
        } else if (trimmed.startsWith('## ')) {
            blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.slice(3) } }] } });
        } else if (trimmed.startsWith('# ')) {
            blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.slice(2) } }] } });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: trimmed.slice(2) } }] } });
        } else if (/^\d+\.\s/.test(trimmed)) {
            blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ text: { content: trimmed.replace(/^\d+\.\s/, '') } }] } });
        } else if (trimmed.startsWith('> ')) {
            blocks.push({ object: 'block', type: 'quote', quote: { rich_text: [{ text: { content: trimmed.slice(2) } }] } });
        } else if (trimmed.startsWith('---')) {
            blocks.push({ object: 'block', type: 'divider', divider: {} });
        } else {
            blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed } }] } });
        }
    }
    return blocks;
}


// ============================================================
// MCP HANDLER — TOOL DEFINITIONS
// ============================================================

export default createMcpHandler(
    (server) => {
        // ── BING ──
        server.tool(
            "bing_search_images",
            "Search Bing Images and get full-resolution URLs. Supports filters: size, color, type (photo/clipart/linedrawing/animatedgif/transparent), layout, people, date, license.",
            {
                query: z.string().min(1).max(500).describe("Search query"),
                max_results: z.number().int().min(1).max(35).default(10).describe("Max images (1-35)"),
                size: z.enum(["small","medium","large","wallpaper"]).optional(),
                color: z.enum(["bw","color","red","orange","yellow","green","teal","blue","purple","pink","brown","black","gray","white"]).optional(),
                type: z.enum(["photo","clipart","linedrawing","animatedgif","transparent"]).optional(),
                layout: z.enum(["square","wide","tall"]).optional(),
                people: z.enum(["face","portrait"]).optional(),
                date: z.enum(["24h","week","month","year"]).optional(),
                license: z.enum(["creativeCommons","publicDomain","share","shareCommercially","modify","modifyCommercially"]).optional()
            },
            async ({ query, max_results, ...filters }) => {
                const results = await searchBing(query, max_results || 10, filters);
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }
        );

        // ── PIXABAY ──
        server.tool(
            "pixabay_search",
            "Search Pixabay for royalty-free images and videos. All content is CC0 licensed (free for any use). Supports image types (photo/illustration/vector), video types (film/animation), categories, color filters, and orientation.",
            {
                query: z.string().min(1).max(500).describe("Search query"),
                media_type: z.enum(["image","video"]).default("image").describe("Type of media"),
                max_results: z.number().int().min(1).max(50).default(10).describe("Max results"),
                image_type: z.enum(["all","photo","illustration","vector"]).optional().describe("Image subtype (only for images)"),
                video_type: z.enum(["all","film","animation"]).optional().describe("Video subtype (only for video)"),
                orientation: z.enum(["all","horizontal","vertical"]).optional(),
                category: z.enum(["backgrounds","fashion","nature","science","education","feelings","health","people","religion","places","animals","industry","computer","food","sports","transportation","travel","buildings","business","music"]).optional(),
                colors: z.enum(["grayscale","transparent","red","orange","yellow","green","turquoise","blue","lilac","pink","white","gray","black","brown"]).optional(),
                order: z.enum(["popular","latest"]).optional(),
                lang: z.enum(["it","en","de","fr","es","pt","nl","ja","ko","zh"]).optional(),
                editors_choice: z.boolean().optional(),
                min_width: z.number().int().min(0).optional(),
                min_height: z.number().int().min(0).optional()
            },
            async ({ query, max_results, ...opts }) => {
                const results = await searchPixabay(query, max_results || 10, opts);
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }
        );

        // ── PEXELS ──
        server.tool(
            "pexels_search",
            "Search Pexels for high-quality free photos and videos. Supports orientation, size, and color filters.",
            {
                query: z.string().min(1).max(500).describe("Search query"),
                media_type: z.enum(["photo","video"]).default("photo").describe("Search photos or videos"),
                max_results: z.number().int().min(1).max(80).default(10).describe("Max results"),
                orientation: z.enum(["landscape","portrait","square"]).optional(),
                size: z.enum(["large","medium","small"]).optional(),
                color: z.string().optional().describe("Color: red, orange, yellow, green, turquoise, blue, violet, pink, brown, black, gray, white, or hex code")
            },
            async ({ query, max_results, ...opts }) => {
                const results = await searchPexels(query, max_results || 10, opts);
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }
        );

        // ── UNSPLASH ──
        server.tool(
            "unsplash_search",
            "Search Unsplash for high-quality free photos. Supports orientation, color, and content filtering. Attribution: 'Photo by [name] on Unsplash'.",
            {
                query: z.string().min(1).max(500).describe("Search query"),
                max_results: z.number().int().min(1).max(30).default(10).describe("Max results"),
                orientation: z.enum(["landscape","portrait","squarish"]).optional(),
                color: z.enum(["black_and_white","black","white","yellow","orange","red","purple","magenta","green","teal","blue"]).optional(),
                order_by: z.enum(["relevant","latest"]).optional(),
                content_filter: z.enum(["low","high"]).optional().describe("'high' filters content unsuitable for younger audiences")
            },
            async ({ query, max_results, ...opts }) => {
                const results = await searchUnsplash(query, max_results || 10, opts);
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }
        );

        // ── WIKIMEDIA ──
        server.tool(
            "wikimedia_search",
            "Search Wikimedia Commons for free educational media: images, diagrams, scientific illustrations, maps. All under free licenses (CC, public domain).",
            {
                query: z.string().min(1).max(500).describe("Search query (e.g. 'water cycle', 'solar system diagram')"),
                max_results: z.number().int().min(1).max(50).default(10).describe("Max results")
            },
            async ({ query, max_results }) => {
                const results = await searchWikimedia(query, max_results || 10);
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }
        );

        // ── EUROPEANA ──
        server.tool(
            "europeana_search",
            "Search Europeana for European cultural heritage: artworks, historical photos, manuscripts, maps from museums across Europe.",
            {
                query: z.string().min(1).max(500).describe("Search query (e.g. 'Renaissance painting', 'medieval manuscript')"),
                max_results: z.number().int().min(1).max(50).default(10).describe("Max results")
            },
            async ({ query, max_results }) => {
                const results = await searchEuropeana(query, max_results || 10);
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }
        );

        // ── OPENCLIPART ──
        server.tool(
            "openclipart_search",
            "Search OpenClipart for public domain SVG clipart and vector graphics. All content is CC0. Great for educational materials and worksheets.",
            {
                query: z.string().min(1).max(500).describe("Search query"),
                max_results: z.number().int().min(1).max(50).default(10).describe("Max results")
            },
            async ({ query, max_results }) => {
                const results = await searchOpenClipart(query, max_results || 10);
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }
        );

        // ══════════════════════════════════════════════════════════
        // NOTION TOOLS
        // ══════════════════════════════════════════════════════════

        // ── NOTION SEARCH ──
        server.tool(
            "notion_search",
            "Search your Notion workspace for pages and databases. Use this to find content, locate parent pages for saving, or browse your workspace structure.",
            {
                query: z.string().describe("Search text (e.g. 'lesson plans', 'math worksheets')"),
                filter_type: z.enum(["page","database","all"]).default("all").describe("Filter by type: page, database, or all")
            },
            async ({ query, filter_type }) => {
                const results = await notionSearch(query, filter_type === 'all' ? undefined : filter_type);
                if (!results.length) return { content: [{ type: "text", text: "No results found for: " + query }] };
                const summary = results.map(r => `• [${r.type}] ${r.title}\n  ID: ${r.id}\n  URL: ${r.url}`).join('\n\n');
                return { content: [{ type: "text", text: `Found ${results.length} result(s):\n\n${summary}` }] };
            }
        );

        // ── NOTION SAVE PAGE ──
        server.tool(
            "notion_save_page",
            "Create a new page in your Notion workspace. Supports markdown content (headings, lists, quotes, dividers). Use notion_search first to find a parent page ID.",
            {
                title: z.string().describe("Page title"),
                content: z.string().describe("Page content in markdown format (supports # headings, - lists, > quotes, --- dividers)"),
                parent_page_id: z.string().describe("ID of the parent page. Use notion_search to find one."),
                icon_emoji: z.string().optional().describe("Optional emoji icon for the page (e.g. '📚', '🧪')")
            },
            async ({ title, content, parent_page_id, icon_emoji }) => {
                const result = await notionSavePage(title, content, parent_page_id, icon_emoji);
                return { content: [{ type: "text", text: `✅ Page created!\n\nTitle: ${result.title}\nURL: ${result.url}\nID: ${result.id}` }] };
            }
        );

        // ── NOTION CREATE DATABASE ──
        server.tool(
            "notion_create_database",
            "Create a new Notion database under a parent page. Define columns with types like text, number, select, multi_select, date, checkbox, url, email. Great for creating trackers, registers, or organized content collections.",
            {
                title: z.string().describe("Database title (e.g. 'Student Progress Tracker')"),
                parent_page_id: z.string().describe("ID of the parent page. Use notion_search to find one."),
                properties: z.array(z.object({
                    name: z.string().describe("Column name"),
                    type: z.enum(["text","rich_text","number","select","multi_select","date","checkbox","url","email"]).describe("Column type"),
                    options: z.array(z.string()).optional().describe("Options for select/multi_select types")
                })).describe("Database columns/properties to create")
            },
            async ({ title, parent_page_id, properties }) => {
                const result = await notionCreateDatabase(title, parent_page_id, properties);
                return { content: [{ type: "text", text: `✅ Database created!\n\nTitle: ${result.title}\nURL: ${result.url}\nID: ${result.id}` }] };
            }
        );
    },
    {
        name: "Micimici MCP",
        version: "2.0.0"
    },
    {
        basePath: "/api",
        verboseSerialization: true
    }
);
