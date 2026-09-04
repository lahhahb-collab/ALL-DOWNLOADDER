// File: api/backend.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: 'Masukkan URL terlebih dahulu!' });
  }

  const cleanUrl = url.trim();

  try {
    // ------------------------------------------------------------------
    // 1. YOUTUBE & YOUTUBE SHORTS
    // ------------------------------------------------------------------
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      const instances = [
        'https://cobalt-api.kwi.li/',
        'https://api.cobalt.tools/'
      ];

      for (const instance of instances) {
        try {
          const ytRes = await fetch(instance, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: cleanUrl,
              videoQuality: '720',
              downloadMode: 'auto'
            })
          });

          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData.url) {
              return res.status(200).json({
                success: true,
                title: 'YouTube Shorts / Video',
                noWmUrl: ytData.url,
                wmUrl: ytData.url
              });
            }
          }
        } catch (e) {
          console.error("YouTube Error Instance", e);
        }
      }

      // Fallback khusus jika API publik Cobalt diblokir:
      // Gunakan layanan loader publik Y2Mate API
      try {
        const videoIdMatch = cleanUrl.match(/(?:shorts\/|v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1];
          const y2Res = await fetch(`https://y2mate.nu/api/v1/convert?v=${videoId}&f=mp4`);
          if (y2Res.ok) {
            const y2Data = await y2Res.json();
            if (y2Data && y2Data.url) {
              return res.status(200).json({
                success: true,
                title: 'YouTube Shorts',
                noWmUrl: y2Data.url,
                wmUrl: y2Data.url
              });
            }
          }
        }
      } catch (e) {
        console.error("Y2Mate Fallback Error", e);
      }
    }

    // ------------------------------------------------------------------
    // 2. TIKTOK & DOUYIN
    // ------------------------------------------------------------------
    if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('douyin.com')) {
      try {
        const tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`);
        const tikData = await tikRes.json();

        if (tikData.code === 0 && tikData.data) {
          return res.status(200).json({
            success: true,
            title: tikData.data.title || 'TikTok Video',
            cover: tikData.data.cover,
            noWmUrl: tikData.data.play,
            wmUrl: tikData.data.wmplay,
            musicUrl: tikData.data.music
          });
        }
      } catch (e) {
        console.error("TikTok Error", e);
      }
    }

    // ------------------------------------------------------------------
    // 3. INSTAGRAM
    // ------------------------------------------------------------------
    if (cleanUrl.includes('instagram.com')) {
      try {
        const igRes = await fetch(`https://api.vreden.web.id/api/instagram?url=${encodeURIComponent(cleanUrl)}`);
        if (igRes.ok) {
          const igData = await igRes.json();
          if (igData.result && igData.result.length > 0) {
            return res.status(200).json({
              success: true,
              title: 'Instagram Media',
              noWmUrl: igData.result[0].url || igData.result[0],
              wmUrl: igData.result[0].url || igData.result[0]
            });
          }
        }
      } catch (e) {
        console.error("IG Error", e);
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Gagal mengambil media. Silakan coba link lain atau pastikan link bersifat publik.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem backend.'
    });
  }
}
