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
    // 1. TIKTOK & DOUYIN ENGINE
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

    // 2. YOUTUBE & YOUTUBE SHORTS ENGINE (YTDL Public Scraper)
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      // Primary Scraper YouTube Shorts / Video
      try {
        const ytRes = await fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(cleanUrl)}`);
        const ytData = await ytRes.json();
        
        if (ytData && ytData.status && ytData.data) {
          return res.status(200).json({
            success: true,
            title: ytData.data.title || 'YouTube Video',
            cover: ytData.data.thumbnail || '',
            noWmUrl: ytData.data.dl || ytData.data.download,
            wmUrl: ytData.data.dl || ytData.data.download,
            musicUrl: ytData.data.dl || ytData.data.download
          });
        }
      } catch (err) {}

      // Backup Scraper YouTube
      try {
        const altYt = await fetch(`https://api.vyt.workers.dev/?url=${encodeURIComponent(cleanUrl)}`);
        const altData = await altYt.json();
        if (altData && (altData.url || altData.download_url)) {
          return res.status(200).json({
            success: true,
            title: altData.title || 'YouTube Video',
            cover: altData.thumbnail || '',
            noWmUrl: altData.url || altData.download_url,
            wmUrl: altData.url || altData.download_url,
            musicUrl: altData.url || altData.download_url
          });
        }
      } catch (err) {}
    }

    // 3. INSTAGRAM & FACEBOOK ENGINE
    if (cleanUrl.includes('instagram.com') || cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
      try {
        const igRes = await fetch(`https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(cleanUrl)}`);
        const igData = await igRes.json();

        if (igData && igData.status && igData.data) {
          const downloadUrl = Array.isArray(igData.data) ? igData.data[0].url : igData.data.url;
          return res.status(200).json({
            success: true,
            title: 'Social Media Video',
            noWmUrl: downloadUrl,
            wmUrl: downloadUrl,
            musicUrl: downloadUrl
          });
        }
      } catch (err) {}
    }

    // 4. UNIVERSAL FALLBACK UNTUK PLATFORM LAIN (Twitter/X, Spotify, Pinterest, Bilibili, Rednote, dll)
    const universalApis = [
      `https://api.downloadgram.org/api/parse?url=${encodeURIComponent(cleanUrl)}`,
      `https://api.siputzx.my.id/api/d/all?url=${encodeURIComponent(cleanUrl)}`
    ];

    for (const apiUrl of universalApis) {
      try {
        const uRes = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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
      message: 'Gagal memproses link ini. Coba pastikan link publik.'
    });

  } catch (error) {
    return res.status(200).json({
      success: false,
      message: 'Gagal memproses media. Silakan coba lagi.'
    });
  }
}
