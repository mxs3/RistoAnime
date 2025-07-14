function searchResults(html) {
    const results = [];

    const itemBlocks = html.match(/<div class="MovieItem">[\s\S]*?<\/a>\s*<\/div>/g);
    if (!itemBlocks) return results;

    itemBlocks.forEach(block => {
        const hrefMatch = block.match(/<a href="([^"]+)"/);
        const titleMatch = block.match(/<h4[^>]*>(.*?)<\/h4>/);
        const imgMatch = block.match(/background-image:\s*url\(([^)]+)\)/);

        const episodeMatch = block.match(/<span>الحلقة<\/span><em>\d+<\/em>/);
        if (episodeMatch) return; // تجاهل الحلقات الفردية

        if (hrefMatch && titleMatch && imgMatch) {
            const href = hrefMatch[1].trim();
            let title = titleMatch[1].replace(/<\/?[^>]+>/g, '').trim();
            const image = imgMatch[1].trim();

            // إزالة الأحرف العربية فقط، والإبقاء على الإنجليزية والأرقام
            title = title.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, '').trim();

            results.push({
                title: decodeHTMLEntities(title),
                url: href,
                image: image,
                type: 'series'
            });
        }
    });

    return results;
}

function decodeHTMLEntities(text) {
    return text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function extractDetails(html) {
    const decode = decodeHTMLEntities;
    const details = {};

    // استخراج الوصف
    const descMatch = html.match(/<div class="EntryContent">[\s\S]*?<p[^>]*>(.*?)<\/p>/);
    details.description = descMatch ? decode(descMatch[1].trim()) : 'No description';

    // استخراج الصورة الرئيسية
    const imgMatch = html.match(/<img class="[^"]*wp-image[^"]*"[^>]+src="([^"]+)"/);
    details.image = imgMatch ? imgMatch[1].trim() : null;

    // استخراج تاريخ العرض
    const dateMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-calendar"><\/i>[\s\S]*?<a[^>]*>(\d{4})<\/a>/);
    details.airdate = dateMatch ? dateMatch[1].trim() : 'N/A';

    // استخراج التصنيفات
    const genreMatches = [...html.matchAll(/<li data-get="related" data-term="\d+">[\s\S]*?<span>([^<]+)<\/span>/g)];
    details.genres = genreMatches.map(g => g[1].trim()).filter(g => !["مقترح لك", "مسلسلات انمي", "1080p"].includes(g));

    // استخراج المواسم
    const seasonsBlock = html.match(/<div class="SeasonsList">[\s\S]*?<\/ul>/);
    const seasons = [];

    if (seasonsBlock) {
        const seasonItems = [...seasonsBlock[0].matchAll(/data-season="(\d+)".*?>(.*?)<\/a>/g)];

        for (const [_, id, title] of seasonItems) {
            const episodesBlock = getSeasonEpisodes(html, id);
            const episodes = [...episodesBlock.matchAll(/<a[^>]+href="([^"]+)".*?>\s*الحلقة\s*<em>(\d+)<\/em>/g)]
                .map(m => ({
                    number: m[2],
                    href: m[1] + '/watch/'
                }));

            if (episodes.length > 0 && episodes[0].number !== "1") {
                episodes.reverse();
            }

            seasons.push({
                title: title.trim(),
                episodes: episodes
            });
        }
    }

    details.seasons = seasons;

    console.log(details);
    return details;
}

// مساعدة لفصل الحلقات حسب الموسم
function getSeasonEpisodes(html, seasonId) {
    const regex = new RegExp(`<div class="EpisodesList"[\\s\\S]*?data-season="${seasonId}"[\\s\\S]*?<\\/div>`);
    const match = html.match(regex);
    return match ? match[0] : '';
}

// فك ترميز HTML
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
        }

        const eps = extractEpisodes(seasonHtml);
        details.episodes.push({
            seasonId: season.id,
            seasonTitle: season.title,
            episodes: eps
        });
    }

    return details;
}

async function extractStreamUrl(html) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    const multiStreams = { streams: [], subtitles: null };

    const serverMatch = html.match(/<li[^>]+data-watch="([^"]+)"/);
    const embedUrl = serverMatch ? serverMatch[1].trim() : '';

    if (!embedUrl) return JSON.stringify(multiStreams);

    try {
        const response = await soraFetch(embedUrl, {
            headers: {
                'Referer': embedUrl,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)'
            }
        });
        const embedHtml = await response.text();

        // يدعم mp4upload و vidmoly وغيره حسب شكل الكود
        let streamMatch = embedHtml.match(/player\.src\(\{\s*type:\s*['"]video\/mp4['"],\s*src:\s*['"]([^'"]+)['"]\s*\}\)/i)
                          || embedHtml.match(/sources:\s*\[\s*\{file:\s*['"]([^'"]+)['"]/i);

        if (streamMatch) {
            const videoUrl = streamMatch[1].trim();

            multiStreams.streams.push({
                title: "Main Server",
                streamUrl: videoUrl,
                headers: {
                    "Referer": embedUrl,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                },
                subtitles: null
            });
        }
    } catch (err) {
        console.error("extractStreamUrl error:", err);
    }

    return JSON.stringify(multiStreams);
}

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

function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}
