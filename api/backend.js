// File: api/backend.js

export default async function handler(req, res) {
  // Hanya menerima HTTP Method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: 'Masukkan URL terlebih dahulu!' });
  }

  try {
    // Memproses TikTok via Public Engine Engine (seperti TikTokIO)
    if (url.includes('tiktok.com') || url.includes('douyin.com')) {
      const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
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
      } else {
        return res.status(400).json({
          success: false,
          message: result.msg || 'Gagal mengambil video TikTok. Pastikan akun tidak privat.'
        });
      }
    }

    // Untuk Platform Lain (Instagram, YouTube, Twitter, dll)
    const fallbackResponse = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        vCodec: 'h264',
        vQuality: 'max',
        isAudioOnly: false
      })
    });

    const fallbackData = await fallbackResponse.json();

    if (fallbackData.status === 'stream' || fallbackData.status === 'redirect') {
      return res.status(200).json({
        success: true,
        title: 'Media Siap Diunduh',
        noWmUrl: fallbackData.url
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Platform ini belum didukung atau link tidak valid.'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error saat memproses link.'
    });
  }
}
