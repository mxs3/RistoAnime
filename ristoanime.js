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

async function extractDetails(url) {
  const response = await soraFetch(url);
  const html = await response.text();

  // استخراج الوصف
  const descMatch = html.match(/<p[^>]*>(.*?)<\/p>/s);
  const description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : 'N/A';

  // استخراج الصورة
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="size-medium[^"]*"/);
  const poster = imgMatch ? imgMatch[1] : null;

  // استخراج تاريخ الإصدار (السنة فقط)
  const yearMatch = html.match(/<li[^>]*>\s*<div class="icon">\s*<i class="far fa-calendar"><\/i>\s*<\/div>\s*<span>تاريخ الاصدار\s*:\s*<\/span>\s*<a[^>]*>\s*(\d{4})\s*<\/a>/);
  const year = yearMatch ? yearMatch[1].trim() : null;

  // استخراج قائمة المواسم
  const seasons = [];
  const seasonRegex = /<a class="no-ajax" data-season="(\d+)"[^>]*>([^<]+)<\/a>/g;
  let seasonMatch;
  while ((seasonMatch = seasonRegex.exec(html)) !== null) {
    const seasonId = seasonMatch[1];
    const seasonName = decodeHTMLEntities(seasonMatch[2].trim());

    // فيتش للحلقات الخاصة بالموسم
    const seasonResponse = await soraFetch("https://ristoanime.net/wp-admin/admin-ajax.php", {
      method: "POST",
      body: `action=season_data&season=${seasonId}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const seasonHtml = await seasonResponse.text();

    // استخراج الحلقات من الموسم
    const episodes = [];
    const episodeRegex = /<a[^>]+href="([^"]+)"[^>]*>\s*الحلقة\s*<em>(\d+)<\/em>/g;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(seasonHtml)) !== null) {
      const epUrl = episodeMatch[1].trim() + "/watch/";
      const epNumber = episodeMatch[2].trim();

      episodes.push({
        number: epNumber,
        href: epUrl
      });
    }

    // ترتيب الحلقات حسب الرقم
    episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));

    seasons.push({
      title: seasonName,
      episodes: episodes
    });
  }

  return {
    description,
    poster,
    year,
    seasons
  };
}

// فك ترميز الكيانات HTML مثل &amp;
function decodeHTMLEntities(text) {
  const entities = {
    '&quot;': '"',
    '&amp;': '&',
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>'
  };
  return text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
             .replace(/&(quot|amp|apos|lt|gt);/g, (match) => entities[match]);
}

async function extractEpisodes(mainHtml) {
    const seasonsList = [];
    const seasonRegex = /<a[^>]+data-season="(\d+)"[^>]*>(.*?)<\/a>/g;

    let match;
    while ((match = seasonRegex.exec(mainHtml)) !== null) {
        const seasonId = match[1];
        const seasonTitle = match[2].replace(/<[^>]+>/g, "").trim();

        const response = await soraFetch("https://ristoanime.net/wp-admin/admin-ajax.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `action=season_data&season=${seasonId}`
        });

        const seasonHtml = await response.text();

        const episodes = [];
        const episodeRegex = /<a href="([^"]+)">\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
        let epMatch;

        while ((epMatch = episodeRegex.exec(seasonHtml)) !== null) {
            const href = epMatch[1].trim() + "/watch/";
            const number = epMatch[2].trim();

            episodes.push({ href, number });
        }

        if (episodes.length > 0 && episodes[0].number !== "1") {
            episodes.reverse();
        }

        seasonsList.push({
            title: seasonTitle,
            episodes
        });
    }

    console.log(seasonsList);
    return seasonsList;
}

async function extractStreamUrl(html) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    const multiStreams = { streams: [], subtitles: null };

    // خذ أول سيرفر من صفحة الحلقة
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

        // match mp4, m3u8, أو أي نوع معروف
        const streamMatch = embedHtml.match(/player\.src\(\{\s*type:\s*['"]video\/(?:mp4|x-mpegURL)['"],\s*src:\s*['"]([^'"]+)['"]\s*\}\)/i)
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
