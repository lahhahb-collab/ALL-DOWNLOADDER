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
    // ==========================================
    // 1. ENGINE KHUSUS YOUTUBE & YOUTUBE SHORTS
    // ==========================================
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      
      // OPTION A: Menggunakan API Cobalt (Sangat Cepat & Stabil)
      try {
        const cobaltRes = await fetch('https://cobalt-api.kwi.li/', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: cleanUrl,
            videoQuality: '720'
          })
        });

        if (cobaltRes.ok) {
          const cobaltData = await cobaltRes.json();
          if (cobaltData.url) {
            return res.status(200).json({
              success: true,
              title: 'YouTube Video / Shorts',
              noWmUrl: cobaltData.url,
              wmUrl: cobaltData.url,
              musicUrl: cobaltData.url
            });
          }
        }
      } catch (err) {
        console.log('Cobalt API fallback trigger...');
      }

      // OPTION B: Public Y2Mate / Invidious API Fallback
      try {
        const videoIdMatch = cleanUrl.match(/(?:shorts\/|v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1];
          const invidRes = await fetch(`https://inv.tux.pizza/api/v1/videos/${videoId}`);
          
          if (invidRes.ok) {
            const invidData = await invidRes.json();
            const format = invidData.formatStreams.find(f => f.container === 'mp4') || invidData.formatStreams[0];
            
            if (format) {
              return res.status(200).json({
                success: true,
                title: invidData.title || 'YouTube Shorts',
                cover: invidData.videoThumbnails?.[0]?.url,
                noWmUrl: format.url,
                wmUrl: format.url,
                musicUrl: format.url
              });
            }
          }
        }
      } catch (err) {
        console.log('Invidious API fallback trigger...');
      }
    }

    // ==========================================
    // 2. ENGINE UTAMA: canine.tools (Untuk Platform Lain)
    // ==========================================
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

      if (data.status === 'stream' || data.status === 'redirect' || data.url) {
        return res.status(200).json({
          success: true,
          title: data.filename || 'Downloaded Media',
          noWmUrl: data.url,
          wmUrl: data.url,
          musicUrl: data.url
        });
      }

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

    // ==========================================
    // 3. FALLBACK KHUSUS TIKTOK & DOUYIN
    // ==========================================
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
