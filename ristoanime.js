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
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
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

function extractDetails(html) {
  const result = {};

  const storyMatch = html.match(/<div class="StoryArea">[\s\S]*?<p>([\s\S]*?)<\/p>/);
  result.description = storyMatch ? decodeHTMLEntities(storyMatch[1].trim()) : '';

  const releaseYearMatch = html.match(/<span>\s*تاريخ الاصدار\s*:\s*<\/span>\s*<a[^>]*>(\d{4})<\/a>/);
  result.releaseYear = releaseYearMatch ? releaseYearMatch[1].trim() : '';

  const genres = [];
  const genreBlockMatch = html.match(/<span>\s*النوع\s*:\s*<\/span>([\s\S]*?)<\/li>/);
  if (genreBlockMatch) {
    const genreRegex = /<a[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = genreRegex.exec(genreBlockMatch[1])) !== null) {
      genres.push(decodeHTMLEntities(m[1].trim()));
    }
  }
  result.genres = genres;

  const categories = [];
  const catBlockMatch = html.match(/<span>\s*التصنيف\s*:\s*<\/span>([\s\S]*?)<\/li>/);
  if (catBlockMatch) {
    const catRegex = /<a[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = catRegex.exec(catBlockMatch[1])) !== null) {
      categories.push(decodeHTMLEntities(m[1].trim()));
    }
  }
  result.categories = categories;

  result.seasons = extractSeasons(html);

  const activeSeasonMatch = html.match(/<li class="active">\s*<a[^>]+data-season="(\d+)"/);
  const activeSeasonId = activeSeasonMatch ? activeSeasonMatch[1].trim() : null;
  result.episodes = activeSeasonId ? extractEpisodesBySeason(html, activeSeasonId) : [];

  return result;
}

function extractSeasons(html) {
  const seasons = [];
  const regex = /<li[^>]*>\s*<a[^>]+data-season="(\d+)"[^>]*>\s*([^<]+)\s*<\/a>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const id = match[1].trim();
    const title = decodeHTMLEntities(match[2].trim());
    seasons.push({ id, title });
  }
  return seasons;
}

function extractEpisodesBySeason(html, seasonId) {
  const regex = new RegExp(`<div[^>]*class="SeasonEpisodes"[^>]*data-season="${seasonId}"[\\s\\S]*?<\\/ul>`, 'i');
  const seasonBlockMatch = html.match(regex);
  if (!seasonBlockMatch) return [];

  const seasonBlock = seasonBlockMatch[0];
  const episodes = [];
  const episodeRegex = /<a href="([^"]+)">\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
  let match;
  while ((match = episodeRegex.exec(seasonBlock)) !== null) {
    const href = match[1].trim() + "/watch/";
    const number = match[2].trim();
    episodes.push({ href, number });
  }
  return episodes;
}

function extractEpisodesBySeason(html, seasonId) {
  const regex = new RegExp(`<div[^>]*class="SeasonEpisodes"[^>]*data-season="${seasonId}"[\\s\\S]*?<\\/ul>`, 'i');
  const seasonBlockMatch = html.match(regex);
  if (!seasonBlockMatch) return [];

  const seasonBlock = seasonBlockMatch[0];
  const episodes = [];
  const episodeRegex = /<a href="([^"]+)">\s*الحلقة\s*<em>(\d+)<\/em>\s*<\/a>/g;
  let match;
  while ((match = episodeRegex.exec(seasonBlock)) !== null) {
    const href = match[1].trim() + "/watch/";
    const number = match[2].trim();
    episodes.push({ href, number });
  }
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
