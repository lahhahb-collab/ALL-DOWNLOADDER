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
    // 1. ENGINE KHUSUS TIKTOK / DOUYIN
    if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('douyin.com')) {
      try {
        const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`);
        const result = await response.json();

        if (result.code === 0 && result.data) {
          return res.status(200).json({
            success: true,
            title: result.data.title || 'TikTok Video',
            cover: result.data.cover,
            noWmUrl: result.data.play,
            wmUrl: result.data.wmplay,
            musicUrl: result.data.music
          });
        }
      } catch (err) {}
    }

    // 2. ENGINE KHUSUS YOUTUBE & SHORTS (Triple Engine Multi-Fallback)
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      // Server Backup 1: Cobalt Engine Mirror
      try {
        const cobRes = await fetch('https://cobalt-api.koyeb.app/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ url: cleanUrl })
        });
        if (cobRes.ok) {
          const cobData = await cobRes.json();
          if (cobData && cobData.url) {
            return res.status(200).json({
              success: true,
              title: 'YouTube Media',
              noWmUrl: cobData.url,
              wmUrl: cobData.url,
              musicUrl: cobData.url
            });
          }
        }
      } catch (err) {}

      // Server Backup 2: Invidious / Workers Proxy
      try {
        const ytRes = await fetch(`https://api.vyt.workers.dev/?url=${encodeURIComponent(cleanUrl)}`);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          const target = ytData.url || ytData.download_url;
          if (target) {
            return res.status(200).json({
              success: true,
              title: ytData.title || 'YouTube Video',
              cover: ytData.thumbnail || '',
              noWmUrl: target,
              wmUrl: target,
              musicUrl: target
            });
          }
        }
      } catch (err) {}
    }

    // 3. UNIVERSAL PARSER (Instagram, Facebook, Twitter, Spotify, Pinterest, Bilibili, Rednote, dll)
    const universalEndpoints = [
      `https://api.downloadgram.org/api/parse?url=${encodeURIComponent(cleanUrl)}`,
      `https://api.siputzx.my.id/api/d/all?url=${encodeURIComponent(cleanUrl)}`
    ];

    for (const endpoint of universalEndpoints) {
      try {
        const uRes = await fetch(endpoint, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (uRes.ok) {
          const uData = await uRes.json();
          const targetUrl = uData.url || (uData.data ? uData.data.url || uData.data.dl : null);

          if (targetUrl) {
            return res.status(200).json({
              success: true,
              title: uData.title || (uData.data ? uData.data.title : 'Media File'),
              cover: uData.thumb || (uData.data ? uData.data.thumbnail : ''),
              noWmUrl: targetUrl,
              wmUrl: targetUrl,
              musicUrl: targetUrl
            });
          }
        }
      } catch (err) {}
    }

    return res.status(400).json({
      success: false,
      message: 'Gagal memproses link. Coba link video publik yang lain.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error saat memproses link.'
    });
  }
}
