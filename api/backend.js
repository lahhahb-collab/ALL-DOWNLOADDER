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
    // 1. ENGINE UTAMA: canine.tools (Mendukung YouTube, TikTok, IG, FB, Twitter, Spotify, dll)
    const canineResponse = await fetch('https://canine.tools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: cleanUrl,
        filenamePattern: 'basic'
      })
    });

    if (canineResponse.ok) {
      const data = await canineResponse.json();

      // Kasus 1: Mengembalikan URL Langsung / Redirect (Video Single)
      if (data.status === 'stream' || data.status === 'redirect' || data.url) {
        return res.status(200).json({
          success: true,
          title: data.filename || 'Downloaded Media',
          noWmUrl: data.url,
          wmUrl: data.url,
          musicUrl: data.url
        });
      }

      // Kasus 2: Mengembalikan Pilihan Item (Picker/Slide/Galeri)
      if (data.status === 'picker' && data.picker && data.picker.length > 0) {
        return res.status(200).json({
          success: true,
          title: 'Media Gallery',
          noWmUrl: data.picker[0].url,
          wmUrl: data.picker[0].url,
          musicUrl: data.picker[0].url
        });
      }
    }

    // 2. FALLBACK KHUSUS TIKTOK (Jika canine.tools mengalami kendala)
    if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('douyin.com')) {
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
    }

    return res.status(400).json({
      success: false,
      message: 'Gagal memproses link. Pastikan link bersifat publik.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem backend.'
    });
  }
}
