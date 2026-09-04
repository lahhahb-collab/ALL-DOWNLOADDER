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
          noWmUrl: result.data.play,
          wmUrl: result.data.wmplay,
          musicUrl: result.data.music
        });
      }
    }

    // 2. UNIVERSAL ENGINE UNTUK SEMUA PLATFORM LAIN (YouTube, IG, FB, Twitter, Spotify, Pinterest, Bilibili, dll)
    const cobRes = await fetch(`https://co.wuk.sh/api/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: cleanUrl,
        vQuality: '720',
        isAudioOnly: false
      })
    });

    if (cobRes.ok) {
      const cobData = await cobRes.json();
      const mainMediaUrl = cobData.url || (cobData.picker ? cobData.picker[0].url : null);

      if (mainMediaUrl) {
        return res.status(200).json({
          success: true,
          title: cobData.filename || 'Universal Media Downloader',
          noWmUrl: mainMediaUrl,
          wmUrl: mainMediaUrl,
          musicUrl: mainMediaUrl
        });
      }
    }

    // 3. SECONDARY FALLBACK UNTUK UNIVERSAL ENGINE
    const fallbackRes = await fetch(`https://api.downloadgram.org/api/parse?url=${encodeURIComponent(cleanUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (fbData.url) {
        return res.status(200).json({
          success: true,
          title: fbData.title || 'Downloaded Media',
          cover: fbData.thumb || '',
          noWmUrl: fbData.url,
          wmUrl: fbData.url,
          musicUrl: fbData.url
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Gagal memproses link. Pastikan link publik dan dapat diakses.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error saat memproses link.'
    });
  }
}
