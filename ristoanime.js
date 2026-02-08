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
  const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const details = {
    description: 'N/A',
    airedDate: 'N/A',
    genres: ['N/A']
  };

  try {
    // 🔥 الوصف من أي صفحة موسم
    let desc =
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<p[^>]*>([^<]{50,})<\/p>/i);

    if (desc) details.description = stripTags(desc[1]);

    // 🔥 الأنواع من أي tags أو روابط تصنيف
    const genreMatches = [...html.matchAll(/<a[^>]+href="[^"]*(genre|tag)[^"]*"[^>]*>([^<]+)<\/a>/gi)];
    if (genreMatches.length) {
      details.genres = genreMatches.map(m => stripTags(m[2]));
    }

    // 🔥 تاريخ العرض
    const year = html.match(/\b(19|20)\d{2}\b/);
    if (year) details.airedDate = year[0];

  } catch (e) {
    console.log('extractDetails error:', e);
  }

  return details;
}

function extractEpisodes(html) {
  const episodes = [];

  const episodeRegex = /<a\s+href="([^"]+)"[^>]*>\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/gi;
  let match;

  while ((match = episodeRegex.exec(html)) !== null) {
    episodes.push({
      href: match[1].trim() + "/watch/",
      number: match[2].trim()
    });
  }

  if (episodes.length) {
    if (episodes[0].number !== "1") episodes.reverse();
    return episodes;
  }

  // =============================
  // 🔥 استخراج روابط المواسم نفسها
  // =============================
  const seasons = [...new Set(
    [...html.matchAll(/season=\d+&post_id=\d+/gi)].map(m => m[0])
  )];

  for (let i = 0; i < seasons.length; i++) {
    episodes.push({
      href: seasons[i],
      number: `Season ${i + 1}`
    });
  }

  return episodes;
}

// ✅ دالة استخراج رابط المشاهدة (stream)
async function extractStreamUrl(html) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    const multiStreams = { streams: [], subtitles: null };

    const serverMatches = [...html.matchAll(/<li[^>]+data-watch="([^"]+)"/g)];
    if (!serverMatches || serverMatches.length === 0) return JSON.stringify(multiStreams);

    const priority = ['vidmoly', 'uqload', 'mp4upload', 'sendvid'];

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
        else if (embedUrl.includes('sendvid')) streams = await extractSendvid(embedUrl);

        const baseName = embedUrl.includes('vidmoly') ? 'Vidmoly (Auto)'
                         : embedUrl.includes('mp4upload') ? 'Mp4upload (1080)'
                         : embedUrl.includes('uqload') ? 'Uqload (480)'
                         : embedUrl.includes('sendvid') ? 'Sendvid (720)'
                         : 'Server';

        for (const s of streams) {
            multiStreams.streams.push({
                title: baseName,
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
    const res = await soraFetch(embedUrl, {
        headers: {
            Referer: embedUrl,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
        }
    });
    const html = await res.text();

    const match = html.match(/sources:\s*\[\s*"([^"]+\.mp4)"/i);
    if (!match) return [];

    return [{
        url: match[1],
        quality: 'Auto',
        headers: {
            Referer: embedUrl,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
        }
    }];
}

async function extractSibnet(embedUrl) {
    const res = await soraFetch(embedUrl, {
        headers: {
            Referer: embedUrl,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
        }
    });
    const html = await res.text();

    const match = html.match(/player\.src\(\{\s*type:\s*["']video\/mp4["'],\s*src:\s*["']([^"']+)["']/i);
    if (match) {
        return [{
            url: match[1],
            quality: 'Auto',
            headers: {
                Referer: embedUrl,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
            }
        }];
    }

    return [];
}

async function extractSendvid(embedUrl) {
    const res = await soraFetch(embedUrl, {
        headers: {
            Referer: embedUrl,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
        }
    });
    const html = await res.text();

    // نحاول نلقط من <meta property="og:video">
    const metaMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+\.mp4[^"']*)["']/i);
    if (metaMatch) {
        return [{
            url: metaMatch[1],
            quality: 'Auto',
            headers: {
                Referer: embedUrl,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
            }
        }];
    }

    // fallback: نحاول نلقط من <source src=...>
    const sourceMatch = html.match(/<source\s+src=["']([^"']+\.mp4[^"']*)["']/i);
    if (sourceMatch) {
        return [{
            url: sourceMatch[1],
            quality: 'Auto',
            headers: {
                Referer: embedUrl,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
            }
        }];
    }

    return [];
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
