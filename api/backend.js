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
    // 1. ENGINE TIKTOK & DOUYIN
    if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('douyin.com')) {
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
    }

    // 2. ENGINE YOUTUBE & SHORTS (Menggunakan Scraper Direct Y2Mate Server)
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      try {
        // Ambil Video ID
        let videoId = '';
        if (cleanUrl.includes('shorts/')) {
          videoId = cleanUrl.split('shorts/')[1].split('?')[0].split('/')[0];
        } else if (cleanUrl.includes('v=')) {
          videoId = cleanUrl.split('v=')[1].split('&')[0];
        } else if (cleanUrl.includes('youtu.be/')) {
          videoId = cleanUrl.split('youtu.be/')[1].split('?')[0];
        }

        if (videoId) {
          // Request Ingest ke Server Proxy Y2Mate
          const y2Res = await fetch('https://www.y2mate.com/matemy/analyzeV2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `k_query=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&k_page=home&hl=en&q_auto=0`
          });
          
          const y2Data = await y2Res.json();
          if (y2Data && y2Data.links && y2Data.links.mp4) {
            const mp4Keys = Object.keys(y2Data.links.mp4);
            const firstKey = mp4Keys[0];
            const kVal = y2Data.links.mp4[firstKey].k;

            // Convert Key ke Direct Link Video
            const convertRes = await fetch('https://www.y2mate.com/matemy/convertV2', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `vid=${videoId}&k=${encodeURIComponent(kVal)}`
            });

            const convertData = await convertRes.json();
            if (convertData && convertData.dlink) {
              return res.status(200).json({
                success: true,
                title: y2Data.title || 'YouTube Video',
                cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                noWmUrl: convertData.dlink,
                wmUrl: convertData.dlink,
                musicUrl: convertData.dlink
              });
            }
          }
        }
      } catch (err) {}
    }

    // 3. ENGINE UNIVERSAL SEMUA PLATFORM LAIN (Instagram, Facebook, Twitter, Bilibili, Pinterest, dll)
    try {
      const uRes = await fetch(`https://api.downloadgram.org/api/parse?url=${encodeURIComponent(cleanUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData && uData.url) {
          return res.status(200).json({
            success: true,
            title: uData.title || 'Media File',
            cover: uData.thumb || '',
            noWmUrl: uData.url,
            wmUrl: uData.url,
            musicUrl: uData.url
          });
        }
      }
    } catch (err) {}

    return res.status(400).json({
      success: false,
      message: 'Gagal memproses link ini. Coba pastikan link publik.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error saat memproses link.'
    });
  }
}
