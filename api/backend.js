// File: api/backend.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: 'Masukkan URL terlebih dahulu!' });
  }

  try {
    const cleanUrl = url.trim();

    // 1. TikTok & Douyin Engine
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

    // 2. YouTube & YouTube Shorts Engine
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      // Menggunakan Invidious / YTDL Universal API
      const ytResponse = await fetch(`https://api.vyt.workers.dev/?url=${encodeURIComponent(cleanUrl)}`);
      if (ytResponse.ok) {
        const ytData = await ytResponse.json();
        if (ytData && (ytData.url || ytData.download_url)) {
          return res.status(200).json({
            success: true,
            title: ytData.title || 'YouTube Video',
            cover: ytData.thumbnail || '',
            noWmUrl: ytData.url || ytData.download_url
          });
        }
      }

      // Secondary Fallback untuk YouTube
      const fallbackYt = await fetch(`https://cobalt-api.koyeb.app/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });
      if (fallbackYt.ok) {
        const fbData = await fallbackYt.json();
        if (fbData.url) {
          return res.status(200).json({
            success: true,
            title: 'YouTube Media',
            noWmUrl: fbData.url
          });
        }
      }
    }

    // 3. Instagram, Facebook, Twitter/X, Pinterest, Threads Engine
    const universalResponse = await fetch(`https://api.downloadgram.org/api/parse?url=${encodeURIComponent(cleanUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (universalResponse.ok) {
      const uData = await universalResponse.json();
      if (uData && uData.url) {
        return res.status(200).json({
          success: true,
          title: uData.title || 'Media File',
          cover: uData.thumb || '',
          noWmUrl: uData.url
        });
      }
    }

    // 4. All-in-one Universal Primary Backup Engine
    const primaryEngine = await fetch(`https://api.asphyxia.my.id/api/download?url=${encodeURIComponent(cleanUrl)}`);
    if (primaryEngine.ok) {
      const pData = await primaryEngine.json();
      if (pData.status && pData.result) {
        const resObj = pData.result;
        return res.status(200).json({
          success: true,
          title: resObj.title || 'Downloaded Media',
          cover: resObj.thumbnail || resObj.cover || '',
          noWmUrl: resObj.url || resObj.video || resObj.audio || (resObj.urls ? resObj.urls[0] : null)
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Gagal memproses media dari URL tersebut. Pastikan link publik.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memproses media.'
    });
  }
}
