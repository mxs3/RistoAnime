function searchResults(html) {
    const results = [];

    const itemBlocks = html.match(/<div class="MovieItem">[\s\S]*?<h4>(.*?)<\/h4>[\s\S]*?<\/a>/g);

    if (!itemBlocks) return results;

    itemBlocks.forEach(block => {
        const hrefMatch = block.match(/<a href="([^"]+)"/);
        const titleMatch = block.match(/<h4>(.*?)<\/h4>/);
        const imgMatch = block.match(/background-image:\s*url\(([^)]+)\)/);

        if (hrefMatch && titleMatch && imgMatch) {
            const href = hrefMatch[1].trim();
            const rawTitle = decodeHTMLEntities(titleMatch[1].trim());
            const image = imgMatch[1].trim();

            // استخراج الكلمات الإنجليزية والأرقام المهمة فقط
            const englishTitle = rawTitle.match(/[a-zA-Z0-9:.\-()]+/g)?.join(' ') || rawTitle;

            results.push({ title: englishTitle.trim(), image, href });
        }
    });

    console.log(results);
    return results;
}

function decodeHTMLEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractDetails(html) {
  const details = {};

  // الوصف
  const descMatch = html.match(/<div class="StoryArea">\s*<span>.*?<\/span>\s*<p>(.*?)<\/p>/s);
  details.description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : 'N/A';

  // العنوان الإنجليزي – إذا كان موجودًا
  const englishTitleMatch = html.match(/<span>\s*العنوان الانجليزي\s*:\s*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  details.englishTitle = englishTitleMatch ? decodeHTMLEntities(englishTitleMatch[1].trim()) : 'N/A';

  // تاريخ العرض
  const airedDateMatch = html.match(/<span>\s*تاريخ الاصدار\s*:\s*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  details.airedDate = airedDateMatch ? airedDateMatch[1].trim() : 'N/A';

  // المدة
  const durationMatch = html.match(/<span>\s*مدة العرض\s*:\s*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
  details.duration = durationMatch ? durationMatch[1].trim() : 'N/A';

  // الأنواع
  const genres = [];
  const genreBlock = html.match(/<span>\s*النوع\s*:\s*<\/span>(.*?)<\/li>/s);
  if (genreBlock) {
    const genreMatches = [...genreBlock[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)];
    for (const m of genreMatches) {
      genres.push(decodeHTMLEntities(m[1].trim()));
    }
  }
  details.genres = genres;

  // الجودة
  const qualityMatch = html.match(/<span>\s*الجودة\s*:\s*<\/span>(.*?)<\/li>/s);
  details.quality = qualityMatch
    ? [...qualityMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(m => m[1].trim())
    : [];

  // الصورة المصغرة من caption
  const imageMatch = html.match(/\[caption[^\]]*\]<img[^>]+src="([^"]+)"/);
  details.thumbnail = imageMatch ? imageMatch[1].trim() : '';

  // رابط السلسلة إن وُجد
  const seriesMatch = html.match(/<span itemprop="title">([^<]+)<\/span><\/a><\/span>/);
  details.seriesTitle = seriesMatch ? decodeHTMLEntities(seriesMatch[1].trim()) : '';

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
            href: href,
            number: number
        });
    }

    if (episodes.length > 0 && episodes[0].number !== "1") {
        episodes.reverse();
    }

    console.log(episodes);
    return episodes;
}

// ✅ دالة استخراج رابط المشاهدة (stream)
async function extractStreamUrl(html) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    const multiStreams = { streams: [], subtitles: null };

    const serverMatches = [...html.matchAll(/<li[^>]+data-watch="([^"]+)"/g)];
    if (!serverMatches || serverMatches.length === 0) return JSON.stringify(multiStreams);

    const priority = ['vidmoly', 'uqload', 'mp4upload', 'sibnet', 'sendvid', 'listeamed', 'playerwish'];

    const sortedMatches = serverMatches.sort((a, b) => {
        const aIndex = priority.findIndex(s => a[1].includes(s));
        const bIndex = priority.findIndex(s => b[1].includes(s));
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    for (const match of sortedMatches) {
        const embedUrl = match[1].trim();
        let streams = [];

        if (embedUrl.includes('vidmoly')) streams = await extractVidmoly(embedUrl);
        else if (embedUrl.includes('mp4upload')) streams = await extractMp4upload(embedUrl);
        else if (embedUrl.includes('uqload')) streams = await extractUqload(embedUrl);
        else if (embedUrl.includes('sibnet')) streams = await extractSibnet(embedUrl);
        else if (embedUrl.includes('sendvid')) streams = await extractSendvid(embedUrl);
        else if (embedUrl.includes('listeamed')) streams = await extractListeamed(embedUrl);
        else if (embedUrl.includes('playerwish')) streams = await extractPlayerwish(embedUrl);

        const baseName = embedUrl.includes('vidmoly') ? 'Vidmoly'
                         : embedUrl.includes('mp4upload') ? 'Mp4Upload'
                         : embedUrl.includes('uqload') ? 'Uqload'
                         : embedUrl.includes('sibnet') ? 'Sibnet'
                         : embedUrl.includes('sendvid') ? 'Sendvid'
                         : embedUrl.includes('listeamed') ? 'Listeamed'
                         : embedUrl.includes('playerwish') ? 'Playerwish'
                         : 'Server';

        for (const s of streams) {
            multiStreams.streams.push({
                title: `${baseName} (${s.quality ?? 'Auto'})`,
                streamUrl: s.url,
                headers: s.headers ?? {
                    Referer: embedUrl,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                },
                subtitles: null
            });
        }
    }

    return JSON.stringify(multiStreams);
}

// Helpers

async function soraFetch(url, options) {
    return await fetch(url, options);
}

async function extractVidmoly(embedUrl) {
    const res = await soraFetch(embedUrl, { headers: { Referer: embedUrl } });
    const html = await res.text();
    const match = html.match(/sources:\s*\[\s*\{file:\s*['"]([^'"]+)['"]/);
    if (!match) return [];
    return [{ url: match[1], quality: 'Auto' }];
}

async function extractMp4upload(embedUrl) {
    const res = await soraFetch(embedUrl, { headers: { Referer: embedUrl } });
    const html = await res.text();
    const match = html.match(/player\.src\(\{\s*type:\s*['"]video\/mp4['"],\s*src:\s*['"]([^'"]+)['"]/);
    if (!match) return [];
    return [{ url: match[1], quality: 'Auto' }];
}

async function extractUqload(embedUrl) {
    const res = await soraFetch(embedUrl, { headers: { Referer: embedUrl } });
    const html = await res.text();
    const m = html.match(/"file"\s*:\s*"([^"]+)"/);
    if (!m) return [];
    return [{ url: m[1], quality: 'Auto' }];
}

async function extractSibnet(embedUrl) {
    const res = await soraFetch(embedUrl, { headers: { Referer: embedUrl } });
    const html = await res.text();
    const m = html.match(/src:\s*"([^"]+\.mp4)"/);
    if (!m) return [];
    return [{ url: m[1], quality: 'Auto' }];
}

async function extractSendvid(embedUrl) {
    const res = await soraFetch(embedUrl, { headers: { Referer: embedUrl } });
    const html = await res.text();
    const m = html.match(/"src":"([^"]+\.mp4)"/);
    if (!m) return [];
    return [{ url: m[1].replace(/\\/g, ''), quality: 'Auto' }];
}

async function extractListeamed(embedUrl) {
    const res = await soraFetch(embedUrl, { headers: { Referer: embedUrl } });
    const html = await res.text();
    const m = html.match(/source\s+src="([^"]+\.mp4)"/);
    if (!m) return [];
    return [{ url: m[1], quality: 'Auto' }];
}

async function extractPlayerwish(embedUrl) {
    const res = await soraFetch(embedUrl, { headers: { Referer: embedUrl } });
    const html = await res.text();
    const m = html.match(/"file":"([^"]+\.mp4)"/);
    if (!m) return [];
    return [{ url: m[1].replace(/\\/g, ''), quality: 'Auto' }];
}

function _0xCheck() {
    return typeof soraFetch !== 'undefined';
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
