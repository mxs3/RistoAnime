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
            const title = titleMatch[1].trim();
            const image = imgMatch[1].trim();

            results.push({ title, image, href });
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

        // استخراج رابط HLS
        let hlsMatch = embedHtml.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
        if (hlsMatch) {
            const hlsUrl = hlsMatch[1].trim();

            // محاولة جلب محتوى m3u8 وتحليل الجودات
            const m3u8Res = await soraFetch(hlsUrl, {
                headers: {
                    'Referer': embedUrl,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)'
                }
            });
            const m3u8Text = await m3u8Res.text();

            const variantRegex = /#EXT-X-STREAM-INF:[^\n]*RESOLUTION=\d+x(\d+)[^\n]*\n([^\n]+)/g;
            let match;
            const foundQualities = [];

            while ((match = variantRegex.exec(m3u8Text)) !== null) {
                const quality = match[1] + "p";
                const streamUrl = new URL(match[2].trim(), hlsUrl).href;

                foundQualities.push({
                    title: quality,
                    streamUrl: streamUrl,
                    headers: {
                        "Referer": embedUrl,
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                    },
                    subtitles: null
                });
            }

            // لو فيه جودات متعددة أضفها، وإلا أضف الملف الأصلي فقط
            if (foundQualities.length > 0) {
                multiStreams.streams = foundQualities;
            } else {
                multiStreams.streams.push({
                    title: "Auto",
                    streamUrl: hlsUrl,
                    headers: {
                        "Referer": embedUrl,
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                    },
                    subtitles: null
                });
            }
        } else {
            // fallback إلى MP4 إن لم يوجد HLS
            let mp4Match = embedHtml.match(/player\.src\(\{\s*type:\s*['"]video\/mp4['"],\s*src:\s*['"]([^'"]+)['"]\s*\}\)/i)
                        || embedHtml.match(/sources:\s*\[\s*\{file:\s*['"]([^'"]+)['"]/i);

            if (mp4Match) {
                const videoUrl = mp4Match[1].trim();
                multiStreams.streams.push({
                    title: "MP4 Stream",
                    streamUrl: videoUrl,
                    headers: {
                        "Referer": embedUrl,
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
                    },
                    subtitles: null
                });
            }
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
