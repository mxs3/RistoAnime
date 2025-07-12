// 🔎 البحث
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
                title: titleMatch[1].trim(),
                image: imgMatch[1].trim(),
                href: hrefMatch[1].trim()
            });
        }
    });

    return results;
}

// 📄 التفاصيل
function extractDetails(html) {
    const details = [];

    const descriptionMatch = html.match(/<p[^>]*>(.*?)<\/p>/s);
    const description = descriptionMatch
        ? decodeHTMLEntities(descriptionMatch[1].trim())
        : 'N/A';

    const aliasMatch = html.match(/<i class="far fa-clock"><\/i>[\s\S]*?<a[^>]*>\s*(\d+)\s*<\/a>/);
    const alias = aliasMatch ? aliasMatch[1].trim() : 'N/A';

    const airdateMatch = html.match(/<i class="far fa-calendar"><\/i>[\s\S]*?<a[^>]*>\s*(\d{4})\s*<\/a>/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

    details.push({ description, alias, airdate });
    return details;
}

// 🎞️ الحلقات
function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<a href="([^"]+)">\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        episodes.push({
            href: match[1].trim() + "/watch/",
            number: match[2].trim()
        });
    }
    if (episodes.length > 0 && episodes[0].number !== "1") {
        episodes.reverse();
    }
    return episodes;
}

// 📺 روابط الستريم
async function extractStreamUrl(url) {
    if (!_0xCheck()) return JSON.stringify({ streams: [], subtitles: null });

    const multiStreams = { streams: [], subtitles: null };

    try {
        const response = await fetchv2(url);
        const html = await response.text();

        const supportedServers = ['mp4upload', 'yourupload', 'uqload'];
        const matches = [...html.matchAll(/<li[^>]+data-watch="([^"]+)"/g)];

        for (const match of matches) {
            const embedUrl = match[1].trim();
            const server = supportedServers.find(s => embedUrl.includes(s));
            if (!server) continue;

            let streamData = null;
            if (server === 'mp4upload') {
                streamData = await mp4Extractor(embedUrl);
            } else if (server === 'yourupload') {
                streamData = await youruploadExtractor(embedUrl);
            } else if (server === 'uqload') {
                streamData = await uqloadExtractor(embedUrl);
            }

            if (streamData?.url) {
                multiStreams.streams.push({
                    title: server.toUpperCase(),
                    streamUrl: streamData.url,
                    headers: streamData.headers || {},
                    subtitles: null
                });
            }

            if (multiStreams.streams.length >= 3) break;
        }

        return JSON.stringify(multiStreams);
    } catch (err) {
        return JSON.stringify({ streams: [], subtitles: null });
    }
}

// ⚙️ Extractors
async function mp4Extractor(url) {
    const headers = { "Referer": "https://mp4upload.com" };
    const response = await fetchv2(url, headers);
    const htmlText = await response.text();
    const streamUrl = extractMp4Script(htmlText);
    return { url: streamUrl, headers };
}

async function youruploadExtractor(embedUrl) {
    const headers = { "Referer": "https://www.yourupload.com/" };
    const response = await fetchv2(embedUrl, headers);
    const html = await response.text();
    const match = html.match(/file:\s*['"]([^'"]+\.mp4)['"]/);
    return { url: match?.[1] || null, headers };
}

async function uqloadExtractor(embedUrl) {
    const headers = {
        "Referer": embedUrl,
        "Origin": "https://uqload.net"
    };
    const response = await fetchv2(embedUrl, headers);
    const htmlText = await response.text();
    const match = htmlText.match(/sources:\s*\[\s*"([^"]+\.mp4)"\s*\]/);
    const videoSrc = match ? match[1] : '';
    return { url: videoSrc, headers };
}

// 🧠 Helpers
function extractMp4Script(htmlText) {
    const scripts = extractScriptTags(htmlText);
    const scriptContent = scripts.find(script => script.includes('player.src'));
    return scriptContent?.split(".src(")[1]?.split(")")[0]?.split("src:")[1]?.split('"')[1] || '';
}

function extractScriptTags(html) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        scripts.push(match[1]);
    }
    return scripts;
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const entities = { '&quot;': '"', '&amp;': '&', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}

// 🔐 حماية وهمية
function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function (_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_) {
    return ((___, ____, _____, ______, _______, ________, _________, __________, ___________, ____________) =>
        (____ = typeof ___,
            _____ = ___ && ___["length"],
            ______ = [..."cranci"],
            _______ = ___ ? [...___["toLowerCase"]()] : [],
            (________ = ______["slice"]()) &&
            _______["forEach"]((_________, __________) =>
                (__________ = ______["indexOf"](_________)) >= 0 &&
                ______["splice"](__________, 1)),
            ____ === "string" && _____ === 16 && ______["length"] === 0)
    )(_);
}
