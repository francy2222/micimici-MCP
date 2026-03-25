import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// ── MEDIA SEARCH FUNCTIONS ──

async function searchBing(query, num, filters = {}) {
    const params = new URLSearchParams(); params.set('q', query); params.set('form', 'IRFLTR'); params.set('first', '1'); params.set('adlt', 'moderate');
    const qft = [];
    const maps = { size:{small:'small',medium:'medium',large:'large',wallpaper:'wallpaper'}, color:{bw:'bw',color:'color',red:'FGcls_RED',orange:'FGcls_ORANGE',yellow:'FGcls_YELLOW',green:'FGcls_GREEN',teal:'FGcls_TEAL',blue:'FGcls_BLUE',purple:'FGcls_PURPLE',pink:'FGcls_PINK',brown:'FGcls_BROWN',black:'FGcls_BLACK',white:'FGcls_WHITE',gray:'FGcls_GRAY'}, type:{photo:'photo',clipart:'clipart',linedrawing:'linedrawing',animatedgif:'animatedgif',transparent:'transparent'}, layout:{square:'square',wide:'wide',tall:'tall'}, people:{face:'face',portrait:'portrait'}, date:{'24h':'lt1440',week:'lt10080',month:'lt43200',year:'lt525600'}, license:{creativeCommons:'license-L2_L3_L4_L5_L6_L7',publicDomain:'license-L1',share:'license-L2_L3_L4_L5_L6_L7',shareCommercially:'license-L2_L3_L4',modify:'license-L2_L3_L5_L6',modifyCommercially:'license-L2_L3'} };
    const pfx = { size:'filterui:imagesize-', color:'filterui:color2-', type:'filterui:photo-', layout:'filterui:aspect-', people:'filterui:face-', date:'filterui:age-', license:'filterui:' };
    for (const [k,v] of Object.entries(filters)) { if (v && maps[k]?.[v]) qft.push(pfx[k]+maps[k][v]); }
    if (qft.length) params.set('qft', '+'+qft.join('+'));
    const resp = await fetch('https://www.bing.com/images/search?'+params.toString(), { headers:{'Accept':'text/html','Accept-Language':'en-US,en;q=0.9','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'} });
    if (!resp.ok) throw new Error('Bing: HTTP '+resp.status);
    const html = await resp.text(), results = [], de = s=>s.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'");
    let m, rx = /<a[^>]*class="[^"]*iusc[^"]*"[^>]*m="([^"]+)"/g;
    while ((m=rx.exec(html)) && results.length<num) { try { const d=JSON.parse(de(m[1])); if(d.murl) results.push({url:d.murl,thumb:d.turl||d.murl,title:d.t||'',width:d.w||0,height:d.h||0,provider:'web'}); } catch(e){} }
    if (!results.length) { rx=/\bm="(\{[^"]*murl[^"]*\})"/g; while ((m=rx.exec(html))&&results.length<num) { try { const d=JSON.parse(de(m[1])); if(d.murl) results.push({url:d.murl,thumb:d.turl||d.murl,title:d.t||'',width:d.w||0,height:d.h||0,provider:'web'}); } catch(e){} } }
    return results;
}
async function searchPixabay(query, num, opts={}) {
    const k=process.env.PIXABAY_API_KEY; if(!k) throw new Error('PIXABAY_API_KEY not set');
    const base = opts.media_type==='video'?'https://pixabay.com/api/videos/':'https://pixabay.com/api/';
    let url=`${base}?key=${k}&q=${encodeURIComponent(query)}&per_page=${Math.max(num,3)}`;
    for (const [p,v] of Object.entries(opts)) { if(v && !['media_type','max_results'].includes(p) && v!=='all') url+=`&${p}=${v}`; }
    const data = await (await fetch(url)).json();
    if (opts.media_type==='video') return (data.hits||[]).slice(0,num).map(v=>{const s=v.videos?.small||{},m2=v.videos?.medium||{};return{id:v.id,url:s.url||m2.url||'',urlHD:m2.url||s.url||'',thumb:`https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg`,title:v.tags||'',duration:v.duration||0,width:s.width||0,height:s.height||0,provider:'pixabay'}}).filter(v=>v.url);
    return (data.hits||[]).slice(0,num).map(i=>({url:i.largeImageURL||i.webformatURL,thumb:i.previewURL,title:i.tags||'',width:i.imageWidth||0,height:i.imageHeight||0,provider:'pixabay'}));
}
async function searchPexels(query, num, opts={}) {
    const k=process.env.PEXELS_API_KEY; if(!k) throw new Error('PEXELS_API_KEY not set');
    if (opts.media_type==='video') { const data=await(await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${num}&size=small`,{headers:{Authorization:k}})).json(); return (data.videos||[]).map(v=>{const sd=v.video_files?.find(f=>f.quality==='sd'&&f.width<=960)||v.video_files?.find(f=>f.quality==='sd')||v.video_files?.[0];const hd=v.video_files?.find(f=>f.quality==='hd');return{id:v.id,url:sd?.link||hd?.link||'',urlHD:hd?.link||sd?.link||'',thumb:v.image||'',title:v.url?.split('/').pop()?.replace(/-/g,' ')||'',duration:v.duration||0,width:sd?.width||0,height:sd?.height||0,provider:'pexels'}}).filter(v=>v.url); }
    let url=`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${num}`;
    if(opts.orientation) url+=`&orientation=${opts.orientation}`; if(opts.size) url+=`&size=${opts.size}`; if(opts.color) url+=`&color=${opts.color}`;
    const data=await(await fetch(url,{headers:{Authorization:k}})).json();
    return (data.photos||[]).map(p=>({url:p.src.large||p.src.original,thumb:p.src.medium||p.src.small,title:p.alt||p.photographer||'',width:p.width||0,height:p.height||0,provider:'pexels'}));
}
async function searchUnsplash(query, num, opts={}) {
    const k=process.env.UNSPLASH_ACCESS_KEY; if(!k) throw new Error('UNSPLASH_ACCESS_KEY not set');
    let url=`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${num}&client_id=${k}`;
    if(opts.orientation) url+=`&orientation=${opts.orientation}`; if(opts.color) url+=`&color=${opts.color}`; if(opts.order_by) url+=`&order_by=${opts.order_by}`; if(opts.content_filter) url+=`&content_filter=${opts.content_filter}`;
    const data=await(await fetch(url)).json(); return (data.results||[]).map(p=>({url:p.urls.regular||p.urls.full,thumb:p.urls.small||p.urls.thumb,title:p.description||p.alt_description||'',width:p.width||0,height:p.height||0,provider:'unsplash'}));
}
async function searchWikimedia(query, num) {
    const data=await(await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${num}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=300`)).json();
    if(!data.query?.pages) return []; return Object.values(data.query.pages).filter(p=>p.imageinfo?.[0]).map(p=>{const i=p.imageinfo[0];return{url:i.url,thumb:i.thumburl||i.url,title:p.title.replace('File:',''),width:i.width||0,height:i.height||0,provider:'wikimedia'}});
}
async function searchEuropeana(query, num) {
    const k=process.env.EUROPEANA_API_KEY; if(!k) throw new Error('EUROPEANA_API_KEY not set');
    const data=await(await fetch(`https://api.europeana.eu/record/v2/search.json?wskey=${encodeURIComponent(k)}&query=${encodeURIComponent(query)}&qf=TYPE:IMAGE&media=true&thumbnail=true&reusability=open&rows=${num}`)).json();
    return (data.items||[]).map(i=>{const t=i.edmPreview?.[0]||'';return{url:i.edmIsShownBy?.[0]||t,thumb:t,title:i.title?.[0]||'',width:0,height:0,provider:'europeana'}}).filter(i=>i.url);
}
async function searchOpenClipart(query, num) {
    const data=await(await fetch(`https://openclipart.org/search/json/?query=${encodeURIComponent(query)}&amount=${num}`)).json();
    return (data.payload||[]).slice(0,num).map(i=>({url:i.svg?.url||i.svg?.png_2400px||'',thumb:i.svg?.png_thumb||i.svg?.url||'',title:i.title||'',width:300,height:300,provider:'openclipart'})).filter(i=>i.url);
}

// ── NOTION FUNCTIONS ──

function nh() { const t=process.env.NOTION_TOKEN; if(!t) throw new Error('NOTION_TOKEN not set'); return {'Authorization':`Bearer ${t}`,'Content-Type':'application/json','Notion-Version':'2022-06-28'}; }
async function notionSearch(query, ft) {
    const body={query}; if(ft==='page') body.filter={value:'page',property:'object'}; if(ft==='database') body.filter={value:'database',property:'object'};
    const data=await(await fetch('https://api.notion.com/v1/search',{method:'POST',headers:nh(),body:JSON.stringify(body)})).json(); if(data.object==='error') throw new Error(data.message);
    return (data.results||[]).map(r=>({id:r.id,type:r.object,title:r.properties?.title?.title?.[0]?.plain_text||r.properties?.Name?.title?.[0]?.plain_text||r.title?.[0]?.plain_text||'(untitled)',url:r.url||''}));
}
function mdToBlocks(md) { if(!md) return []; return md.split('\n').filter(l=>l.trim()).map(t=>{t=t.trim(); if(t.startsWith('### ')) return{object:'block',type:'heading_3',heading_3:{rich_text:[{text:{content:t.slice(4)}}]}}; if(t.startsWith('## ')) return{object:'block',type:'heading_2',heading_2:{rich_text:[{text:{content:t.slice(3)}}]}}; if(t.startsWith('# ')) return{object:'block',type:'heading_1',heading_1:{rich_text:[{text:{content:t.slice(2)}}]}}; if(t.startsWith('- ')||t.startsWith('* ')) return{object:'block',type:'bulleted_list_item',bulleted_list_item:{rich_text:[{text:{content:t.slice(2)}}]}}; if(/^\d+\.\s/.test(t)) return{object:'block',type:'numbered_list_item',numbered_list_item:{rich_text:[{text:{content:t.replace(/^\d+\.\s/,'')}}]}}; if(t.startsWith('> ')) return{object:'block',type:'quote',quote:{rich_text:[{text:{content:t.slice(2)}}]}}; if(t==='---') return{object:'block',type:'divider',divider:{}}; return{object:'block',type:'paragraph',paragraph:{rich_text:[{text:{content:t}}]}}; }); }
async function notionSavePage(title, content, pid, icon) {
    if(!pid) throw new Error('parent_page_id required');
    const body={parent:{page_id:pid},properties:{title:{title:[{text:{content:title}}]}},children:mdToBlocks(content)}; if(icon) body.icon={type:'emoji',emoji:icon};
    const data=await(await fetch('https://api.notion.com/v1/pages',{method:'POST',headers:nh(),body:JSON.stringify(body)})).json(); if(data.object==='error') throw new Error(data.message); return{id:data.id,url:data.url,title};
}
async function notionCreateDb(title, pid, props) {
    const properties={Name:{title:{}}}; for(const p of(props||[])){const t=p.type==='text'?'rich_text':p.type; if(['rich_text','number','date','checkbox','url','email'].includes(t)) properties[p.name]={[t]:{}}; else if(t==='select') properties[p.name]={select:{options:(p.options||[]).map(o=>({name:o}))}}; else if(t==='multi_select') properties[p.name]={multi_select:{options:(p.options||[]).map(o=>({name:o}))}}; }
    const data=await(await fetch('https://api.notion.com/v1/databases',{method:'POST',headers:nh(),body:JSON.stringify({parent:{page_id:pid},title:[{text:{content:title}}],properties})})).json(); if(data.object==='error') throw new Error(data.message); return{id:data.id,url:data.url,title};
}

// ── PUBLISH HTML FUNCTION ──

const PUBLISH_URL = 'https://claude-skill-valut.netlify.app/.netlify/functions/publish';

async function publishHtml(html) {
    const resp = await fetch(PUBLISH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html })
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Publish failed');
    return { url: data.url, id: data.id, expires: data.expires || '24 hours' };
}

// ── MCP SERVER FACTORY (new instance per request for serverless) ──

function createServer() {
    const s = new McpServer({ name:"Micimici MCP", version:"2.0.0" });

    s.tool("web_search_images","Search the web for images. Filters: size, color, type (photo/clipart/linedrawing), layout, people, date, license.",{query:z.string().min(1).max(500),max_results:z.number().int().min(1).max(35).default(10),size:z.enum(["small","medium","large","wallpaper"]).optional(),color:z.enum(["bw","color","red","orange","yellow","green","teal","blue","purple","pink","brown","black","gray","white"]).optional(),type:z.enum(["photo","clipart","linedrawing","animatedgif","transparent"]).optional(),layout:z.enum(["square","wide","tall"]).optional(),people:z.enum(["face","portrait"]).optional(),date:z.enum(["24h","week","month","year"]).optional(),license:z.enum(["creativeCommons","publicDomain","share","shareCommercially","modify","modifyCommercially"]).optional()},async({query,max_results,...f})=>({content:[{type:"text",text:JSON.stringify(await searchBing(query,max_results||10,f),null,2)}]}));

    s.tool("pixabay_search","Search Pixabay for CC0 images and videos.",{query:z.string().min(1).max(500),media_type:z.enum(["image","video"]).default("image"),max_results:z.number().int().min(1).max(50).default(10),image_type:z.enum(["all","photo","illustration","vector"]).optional(),video_type:z.enum(["all","film","animation"]).optional(),orientation:z.enum(["all","horizontal","vertical"]).optional(),category:z.enum(["backgrounds","fashion","nature","science","education","feelings","health","people","religion","places","animals","industry","computer","food","sports","transportation","travel","buildings","business","music"]).optional(),colors:z.enum(["grayscale","transparent","red","orange","yellow","green","turquoise","blue","lilac","pink","white","gray","black","brown"]).optional(),order:z.enum(["popular","latest"]).optional(),lang:z.enum(["it","en","de","fr","es","pt","nl","ja","ko","zh"]).optional(),editors_choice:z.boolean().optional(),min_width:z.number().int().min(0).optional(),min_height:z.number().int().min(0).optional()},async({query,max_results,...o})=>({content:[{type:"text",text:JSON.stringify(await searchPixabay(query,max_results||10,o),null,2)}]}));

    s.tool("pexels_search","Search Pexels for free photos and videos.",{query:z.string().min(1).max(500),media_type:z.enum(["photo","video"]).default("photo"),max_results:z.number().int().min(1).max(80).default(10),orientation:z.enum(["landscape","portrait","square"]).optional(),size:z.enum(["large","medium","small"]).optional(),color:z.string().optional()},async({query,max_results,...o})=>({content:[{type:"text",text:JSON.stringify(await searchPexels(query,max_results||10,o),null,2)}]}));

    s.tool("unsplash_search","Search Unsplash for HD photos.",{query:z.string().min(1).max(500),max_results:z.number().int().min(1).max(30).default(10),orientation:z.enum(["landscape","portrait","squarish"]).optional(),color:z.enum(["black_and_white","black","white","yellow","orange","red","purple","magenta","green","teal","blue"]).optional(),order_by:z.enum(["relevant","latest"]).optional(),content_filter:z.enum(["low","high"]).optional()},async({query,max_results,...o})=>({content:[{type:"text",text:JSON.stringify(await searchUnsplash(query,max_results||10,o),null,2)}]}));

    s.tool("wikimedia_search","Search Wikimedia Commons for free educational media.",{query:z.string().min(1).max(500),max_results:z.number().int().min(1).max(50).default(10)},async({query,max_results})=>({content:[{type:"text",text:JSON.stringify(await searchWikimedia(query,max_results||10),null,2)}]}));

    s.tool("europeana_search","Search Europeana for European cultural heritage.",{query:z.string().min(1).max(500),max_results:z.number().int().min(1).max(50).default(10)},async({query,max_results})=>({content:[{type:"text",text:JSON.stringify(await searchEuropeana(query,max_results||10),null,2)}]}));

    s.tool("openclipart_search","Search OpenClipart for public domain SVG clipart.",{query:z.string().min(1).max(500),max_results:z.number().int().min(1).max(50).default(10)},async({query,max_results})=>({content:[{type:"text",text:JSON.stringify(await searchOpenClipart(query,max_results||10),null,2)}]}));

    s.tool("notion_search","Search your Notion workspace for pages and databases.",{query:z.string(),filter_type:z.enum(["page","database","all"]).default("all")},async({query,filter_type})=>{const r=await notionSearch(query,filter_type==='all'?undefined:filter_type); if(!r.length) return{content:[{type:"text",text:"No results for: "+query}]}; return{content:[{type:"text",text:`Found ${r.length} result(s):\n\n`+r.map(x=>`• [${x.type}] ${x.title}\n  ID: ${x.id}\n  URL: ${x.url}`).join('\n\n')}]};});

    s.tool("notion_save_page","Create a page in Notion with markdown content.",{title:z.string(),content:z.string(),parent_page_id:z.string(),icon_emoji:z.string().optional()},async({title,content,parent_page_id,icon_emoji})=>{const r=await notionSavePage(title,content,parent_page_id,icon_emoji); return{content:[{type:"text",text:`✅ Page created!\nTitle: ${r.title}\nURL: ${r.url}\nID: ${r.id}`}]};});

    s.tool("notion_create_database","Create a Notion database with typed columns.",{title:z.string(),parent_page_id:z.string(),properties:z.array(z.object({name:z.string(),type:z.enum(["text","rich_text","number","select","multi_select","date","checkbox","url","email"]),options:z.array(z.string()).optional()}))},async({title,parent_page_id,properties})=>{const r=await notionCreateDb(title,parent_page_id,properties); return{content:[{type:"text",text:`✅ Database created!\nTitle: ${r.title}\nURL: ${r.url}\nID: ${r.id}`}]};});

    s.tool("publish_html_page","Publish an HTML page to a public URL (valid 24h). Optionally save the link to a Notion page. Use this to share web pages with images that Notion would otherwise filter.",{
        html: z.string().describe("Complete HTML content to publish"),
        title: z.string().optional().describe("Page title (for Notion bookmark)"),
        save_to_notion: z.boolean().default(false).describe("Also save a link to this page in Notion"),
        parent_page_id: z.string().optional().describe("Notion parent page ID (required if save_to_notion is true)")
    },async({html,title,save_to_notion,parent_page_id})=>{
        const pub = await publishHtml(html);
        let notionInfo = '';
        if (save_to_notion && parent_page_id) {
            const pageTitle = title || 'Published Page';
            const content = `# ${pageTitle}\n\n🔗 **Published page:** ${pub.url}\n\n> This link expires in ${pub.expires}. Open it to view the full page with images.`;
            const r = await notionSavePage(pageTitle, content, parent_page_id, '🌐');
            notionInfo = `\nNotion page: ${r.url}`;
        }
        return{content:[{type:"text",text:`✅ Page published!\nURL: ${pub.url}\nExpires: ${pub.expires}${notionInfo}`}]};
    });

    return s;
}

// ── HTTP HANDLER (serverless: new server+transport per request) ──

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method === 'GET') { res.status(200).json({name:"Micimici MCP",version:"2.0.0",tools:11}); return; }
    if (req.method === 'DELETE') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({error:"Method not allowed"}); return; }

    try {
        const server = createServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch(err) {
        console.error('MCP Error:', err);
        if (!res.headersSent) res.status(500).json({jsonrpc:"2.0",error:{code:-32603,message:err.message||'Internal error'}});
    }
}
