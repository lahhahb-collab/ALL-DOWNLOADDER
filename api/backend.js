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
    // 1. ENGINE KHUSUS TIKTOK & DOUYIN
    if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('douyin.com')) {
      const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`);
      const result = await response.json();

      if (result.code === 0 && result.data) {
        return res.status(200).json({
          success: true,
          title: result.data.title || 'TikTok Video',
          cover: result.data.cover,
          videoUrl: result.data.play,
          wmUrl: result.data.wmplay,
          musicUrl: result.data.music
        });
      }
    }

    // 2. ENGINE YOUTUBE & SHORTS (Jio/YTDL Engine Stable API)
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      try {
        const ytRes = await fetch(`https://api.vyt.workers.dev/?url=${encodeURIComponent(cleanUrl)}`);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (ytData && (ytData.url || ytData.download_url)) {
            return res.status(200).json({
              success: true,
              title: ytData.title || 'YouTube Video',
              cover: ytData.thumbnail || '',
              videoUrl: ytData.url || ytData.download_url
            });
          }
        }
      } catch (e) {}
    }

    // 3. ENGINE UNIVERSAL DARI SAVETUBE / COBALT AGGREGATOR
    const universalEndpoints = [
      `https://api.downloadgram.org/api/parse?url=${encodeURIComponent(cleanUrl)}`,
      `https://api.asphyxia.my.id/api/download?url=${encodeURIComponent(cleanUrl)}`
    ];

    for (const endpoint of universalEndpoints) {
      try {
        const uRes = await fetch(endpoint, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (uRes.ok) {
          const uData = await uRes.json();
          const targetUrl = uData.url || (uData.result ? uData.result.url || uData.result.video : null);
          
          if (targetUrl) {
            return res.status(200).json({
              success: true,
              title: uData.title || (uData.result ? uData.result.title : 'Media File'),
              cover: uData.thumb || (uData.result ? uData.result.thumbnail : ''),
              videoUrl: targetUrl
            });
          }
        }
      } catch (e) {}
    }

    return res.status(400).json({
      success: false,
      message: 'Platform ini tidak merespons atau link bersifat privat.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error saat memproses link.'
    });
  }
}
