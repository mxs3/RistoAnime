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

function extractEpisodes(html) {
  const seasons = [];

  // استخراج عناوين المواسم مع data-season
  const seasonTitleRegex = /<li[^>]*>\s*<a[^>]*data-season="(\d+)"[^>]*>([^<]+)<\/a>/g;
  const seasonsMatches = [...html.matchAll(seasonTitleRegex)];

  for (const seasonMatch of seasonsMatches) {
    const seasonId = seasonMatch[1];
    const seasonTitle = seasonMatch[2].trim();

    // استخراج حلقات الموسم بحسب data-season الموجود في EpisodesList
    // نبحث داخل القسم الذي يحتوي حلقات الموسم هذا
    // في العينة المقدمة الحلقات كلها في <div class="EpisodesList"> بدون تمييز data-season
    // لكن غالبا في صفحة كاملة يتم تغيير محتوى EpisodesList حسب الموسم المختار (Ajax)
    // لذلك سنفترض أن الحلقات التي في HTML حالياً تخص الموسم النشط فقط.

    // إذا كان HTML يحتوي حلقات لكل موسم داخل <div class="EpisodesList" data-season="..."> 
    // يمكننا تعديل هذا، لكن حسب العينة الحلقات موجودة بدون data-season داخل EpisodesList واحدة فقط.

    // لذلك، نبحث عن الحلقات داخل HTML وحاولنا فلترة حسب الموسم في الرابط (إذا ممكن)

    // استخراج الحلقات من <div class="EpisodesList"> ... </div>
    const episodesListRegex = /<div class="EpisodesList">([\s\S]*?)<\/div>/;
    const episodesListMatch = html.match(episodesListRegex);
    if (!episodesListMatch) continue;

    const episodesHtml = episodesListMatch[1];

    // استخراج حلقات مع فلترة حسب رابط الموسم (إذا الرابط يحتوي الموسم)
    const episodeRegex = /<a[^>]+href="([^"]+)"[^>]*>\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
    const episodes = [];
    let match;

    while ((match = episodeRegex.exec(episodesHtml)) !== null) {
      const href = match[1];
      const episodeNum = match[2].trim();

      // فلترة حسب الموسم: الرابط غالبًا يحتوي اسم الموسم (مثلا "الموسم-2" أو "season-2")
      // نستخرج رقم الموسم من الرابط
      const seasonInHrefMatch = href.match(/season[-_]?(?<seasonNum>\d+)/i);
      const seasonNumInHref = seasonInHrefMatch ? seasonInHrefMatch.groups.seasonNum : null;

      if (seasonNumInHref === null) {
        // إذا لم نستطع تحديد الموسم من الرابط، افترض ان الحلقة تخص الموسم الأول فقط
        if (seasonId === seasonsMatches[0][1]) {
          episodes.push({ number: episodeNum, href });
        }
      } else {
        if (seasonNumInHref === seasonId) {
          episodes.push({ number: episodeNum, href });
        }
      }
    }

    if (episodes.length > 0) {
      episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
      seasons.push({ title: seasonTitle, episodes });
    }
  }

  return seasons;
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
