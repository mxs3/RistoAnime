async extractDetails(url) {
    const res = await soraFetch(url);
    const html = await res.text();

    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const imgMatch = html.match(/<div class="poster"[^>]*style="[^"]*url\(([^)]+)\)/);
    const descMatch = html.match(/<div class="Description">[\s\S]*?<p>(.*?)<\/p>/);
    const genresMatch = html.match(/<span class="genre">([^<]+)<\/span>/);
    const dateMatch = html.match(/تاريخ العرض[^<]*<\/strong>\s*([^<]+)</);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const image = imgMatch ? imgMatch[1].trim() : '';
    const description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : '';
    const genres = genresMatch ? genresMatch[1].split(',').map(g => g.trim()) : [];
    const date = dateMatch ? dateMatch[1].trim() : '';

    const seasons = [];
    const seasonMatches = [...html.matchAll(/data-id="(\d+)"[^>]*class="SeasonItem"/g)];

    for (const match of seasonMatches) {
      const seasonId = match[1];

      const ajaxRes = await soraFetch("https://ristoanime.net/wp-admin/admin-ajax.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: `action=load_episodes&season=${seasonId}`
      });

      const seasonHtml = await ajaxRes.text();
      const episodes = RistoAnime.extractEpisodes(seasonHtml);

      seasons.push({
        season: `Season ${seasons.length + 1}`,
        episodes: episodes
      });
    }

    return {
      title,
      image,
      description,
      genres,
      date,
      seasons
    };
  },

  extractEpisodes(html) {
    const episodes = [];
    const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>\s*الحلقة\s*<em>(\d+)<\/em>/g)];

    for (const match of matches) {
      const href = match[1].trim() + "/watch/";
      const number = match[2].trim();
      episodes.push({ number, href });
    }

    if (episodes.length > 0 && episodes[0].number !== "1") {
      episodes.reverse(); // ترتيب تصاعدي للحلقات
    }

    return episodes;
  },

  async extractStreamUrl(html) {
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
};

// ✅ دوال مساعدة
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

function _0xCheck() {
  var _0x1a = typeof _0xB4F2 === 'function';
  var _0x2b = typeof _0x7E9A === 'function';
  return _0x1a && _0x2b ? (function (_0x3c) {
    return _0x7E9A(_0x3c);
  })(_0xB4F2()) : false;
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