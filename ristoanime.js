function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}

function removeArabic(text) {
    return text.replace(/[\u0600-\u06FF]/g, '').replace(/\s+/g, ' ').trim();
}

function searchResults(html) {
    const results = [];
    const itemBlocks = html.match(/<div class="MovieItem">[\s\S]*?<h4>(.*?)<\/h4>[\s\S]*?<\/a>/g);
    if (!itemBlocks) return results;

    itemBlocks.forEach(block => {
        const hrefMatch = block.match(/<a href="([^"]+)"/);
        const titleMatch = block.match(/<h4>(.*?)<\/h4>/);
        const imgMatch = block.match(/background-image:\s*url\(([^)]+)\)/);

        if (hrefMatch && titleMatch && imgMatch) {
            results.push({
                title: removeArabic(titleMatch[1].trim()),
                image: imgMatch[1].trim(),
                href: hrefMatch[1].trim()
            });
        }
    });

    return results;
}

function extractDetails(html) {
    const details = {};

    const descriptionMatch = html.match(/<p[^>]*>(.*?)<\/p>/s);
    details.description = descriptionMatch 
        ? decodeHTMLEntities(descriptionMatch[1].trim()) 
        : 'N/A';

    const aliasMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-clock"><\/i>\s*<\/div>\s*<span>\s*مدة العرض\s*:\s*<\/span>\s*<a[^>]*>\s*(\d+)\s*<\/a>/);
    details.alias = aliasMatch ? aliasMatch[1].trim() : 'N/A';

    const airdateMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-calendar"><\/i>\s*<\/div>\s*<span>\s*تاريخ الاصدار\s*:\s*<\/span>\s*<a[^>]*?>\s*(\d{4})\s*<\/a>/);
    details.airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

    details.episodes = extractEpisodes(html);

    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<a href="([^"]+)">\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
    let match;

    while ((match = episodeRegex.exec(html)) !== null) {
        const href = match[1].trim() + "/watch/";
        const number = match[2].trim();
        episodes.push({
            title: `Episode ${number}`,
            href: href,
            number: number
        });
    }

    // ترتيب الحلقات
    episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return episodes;
}

async function extractStreamUrl(html) {
    if (!_0xCheck()) return JSON.stringify({ streams: [], subtitles: null });

    const multiStreams = { streams: [], subtitles: null };

    const matches = [...html.matchAll(/<iframe[^>]+src=["'](?:https?:)?\/\/sendvid\.com\/embed\/([^"']+)["'][^>]*>/gi)];
    if (!matches.length) return JSON.stringify(multiStreams);

    const lastId = matches[matches.length - 1][1];
    const embedUrl = `https://sendvid.com/embed/${lastId}`;

    multiStreams.streams.push({
        title: "SENDVID",
        streamUrl: embedUrl,
        headers: {
            "Referer": "https://sendvid.com/",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        subtitles: null
    });

    return JSON.stringify(multiStreams);
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function(_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_) {
    return ((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___['length'],______=[...'cranci'],_______=___?[...___['toLowerCase']()] : [],(________='slice')&&_______['forEach']((_________,__________)=>(___________=_____.indexOf(_________)) >= 0 && _____.splice(___________,1)),____==='string' && _____===16 && _______.length===0))(_)
}
