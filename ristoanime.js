function searchResults(html) {
    const results = [];

    const itemBlocks = html.match(/<div class="MovieItem">[\s\S]*?<h4>(.*?)<\/h4>[\s\S]*?<\/a>/g);
    if (!itemBlocks) return results;

    itemBlocks.forEach(block => {
        const hrefMatch = block.match(/<a href="([^"]+)"/);
        const titleMatch = block.match(/<h4>(.*?)<\/h4>/);
        const imgMatch = block.match(/background-image:\s*url\(([^)]+)\)/);

        if (hrefMatch && titleMatch && imgMatch) {
            let href = hrefMatch[1].trim();
            const title = titleMatch[1].trim();
            const image = imgMatch[1].trim();

            href = href.replace(/-season-\d+\/?$/, '/');

            results.push({ title, image, href });
        }
    });

    return results;
}

async function extractDetails(html) {
    const details = [];

    // الوصف
    const descriptionMatch = html.match(/<p[^>]*>(.*?)<\/p>/s);
    const description = descriptionMatch 
        ? decodeHTMLEntities(descriptionMatch[1].trim()) 
        : 'N/A';

    // مدة العرض (alias)
    const aliasMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-clock"><\/i>\s*<\/div>\s*<span>\s*مدة العرض\s*:\s*<\/span>\s*<a[^>]*>\s*(\d+)\s*<\/a>/);
    const alias = aliasMatch ? aliasMatch[1].trim() : 'N/A';

    // تاريخ الإصدار
    const airdateMatch = html.match(/<li>\s*<div class="icon">\s*<i class="far fa-calendar"><\/i>\s*<\/div>\s*<span>\s*تاريخ الاصدار\s*:\s*<\/span>\s*<a[^>]*?>\s*(\d{4})\s*<\/a>/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

    // استخراج المواسم من أزرار المواسم
    const seasons = [];
    const seasonRegex = /<a[^>]+data-season="(\d+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = seasonRegex.exec(html)) !== null) {
        seasons.push({
            id: match[1].trim(),
            title: decodeHTMLEntities(match[2].trim())
        });
    }

    // استخراج الحلقات لكل موسم
    const episodesBySeason = [];
    for (const season of seasons) {
        const formData = new URLSearchParams();
        formData.append("action", "season_data");
        formData.append("season_id", season.id);

        try {
            const res = await fetch("https://ristoanime.net/wp-admin/admin-ajax.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString()
            });

            const seasonHtml = await res.text();
            const episodes = extractEpisodes(seasonHtml);
            episodesBySeason.push({
                seasonTitle: season.title,
                episodes: episodes
            });
        } catch (err) {
            console.error(`Error loading season ${season.id}`, err);
        }
    }

    details.push({
        description: description,
        alias: alias,
        airdate: airdate,
        seasons: episodesBySeason
    });

    console.log(details);
    return details;
}

        const eps = extractEpisodes(seasonHtml);
        episodes.push({
            seasonId: season.id,
            seasonTitle: season.title,
            episodes: eps
        });
    }

    return {
        description,
        releaseYear,
        genres,
        categories,
        seasons,
        episodes
    };
}

function extractEpisodes(html, seasonId = null) {
    let block = html;
    if (seasonId) {
        const regex = new RegExp(`<div[^>]*class="SeasonEpisodes"[^>]*data-season="${seasonId}"[\\s\\S]*?<\\/ul>`, 'i');
        const match = html.match(regex);
        if (match) block = match[0];
        else return [];
    }

    const episodes = [];
    const episodeRegex = /<a href="([^"]+)">\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
    let match;

    while ((match = episodeRegex.exec(block)) !== null) {
        const href = match[1].trim() + "/watch/";
        const number = match[2].trim();

        episodes.push({
            href: href,
            number: number
        });
    }

    if (episodes.length > 0 && episodes[0].number !== "1") {
        episodes.reverse();
    }

    return episodes;
}

async function extractStreamUrl(html) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    const multiStreams = { streams: [], subtitles: null };

    const serverMatch = html.match(/<li[^>]+data-watch="([^"]+)"/);
    let embedUrl = serverMatch ? serverMatch[1].trim() : '';

    if (!embedUrl) return JSON.stringify(multiStreams);

    if (embedUrl.includes('video.sibnet.ru')) {
        try {
            const response = await soraFetch(embedUrl, {
                headers: {
                    'Referer': embedUrl,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)'
                }
            });
            const sibnetHtml = await response.text();

            const m3u8Match = sibnetHtml.match(/"url"\s*:\s*"([^"]+\.m3u8)"/i);
            if (m3u8Match) {
                const m3u8Url = m3u8Match[1].replace(/\\\//g, '/');
                multiStreams.streams.push({
                    title: "Sibnet - Auto Quality",
                    streamUrl: m3u8Url,
                    headers: {
                        "Referer": embedUrl,
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                    },
                    subtitles: null
                });

                return JSON.stringify(multiStreams);
            }

            const mp4Match = sibnetHtml.match(/"url"\s*:\s*"([^"]+\.mp4)"/i);
            if (mp4Match) {
                const mp4Url = mp4Match[1].replace(/\\\//g, '/');
                multiStreams.streams.push({
                    title: "Sibnet - MP4",
                    streamUrl: mp4Url,
                    headers: {
                        "Referer": embedUrl,
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                    },
                    subtitles: null
                });
                return JSON.stringify(multiStreams);
            }
        } catch (e) {
            console.error('Error fetching Sibnet video:', e);
        }

        return JSON.stringify(multiStreams);
    }

    try {
        const response = await soraFetch(embedUrl, {
            headers: {
                'Referer': embedUrl,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)'
            }
        });
        const embedHtml = await response.text();

        const sourcesMatch = embedHtml.match(/sources:\s*(\[[^\]]+\])/i);
        if (sourcesMatch) {
            let sources = [];
            try {
                const jsonStr = sourcesMatch[1]
                    .replace(/file:/g, '"file":')
                    .replace(/label:/g, '"label":')
                    .replace(/type:/g, '"type":')
                    .replace(/'/g, '"');
                sources = JSON.parse(jsonStr);
            } catch (e) {
                console.warn("Failed to parse sources JSON:", e);
            }

            if (sources.length > 0) {
                sources.forEach(src => {
                    if (src.file) {
                        multiStreams.streams.push({
                            title: src.label || "Unknown Quality",
                            streamUrl: src.file,
                            headers: {
                                "Referer": embedUrl,
                                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                            },
                            subtitles: null
                        });
                    }
                });

                return JSON.stringify(multiStreams);
            }
        }

        const streamMatch = embedHtml.match(/player\.src\(\{\s*type:\s*['"]video\/mp4['"],\s*src:\s*['"]([^'"]+)['"]\s*\}\)/i)
            || embedHtml.match(/sources:\s*\[\s*\{file:\s*['"]([^'"]+)['"]/i)
            || embedHtml.match(/source\s*src=['"]([^'"]+)['"]/i);

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
    } catch (e) {
        try {
            return await fetch(url, options);
        } catch (error) {
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