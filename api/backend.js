// File: api/backend.js

export default async function handler(req, res) {
  // Hanya terima method POST
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
    // 1. TIKTOK & DOUYIN (Menggunakan TikWM API)
    // ------------------------------------------------------------------
    if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('vt.tiktok.com') || cleanUrl.includes('douyin.com')) {
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
      } catch (err) {
        console.error('TikTok API Error:', err);
      }
    }

    // ------------------------------------------------------------------
    // 2. YOUTUBE & YOUTUBE SHORTS (Menggunakan Cobalt Public Instances)
    // ------------------------------------------------------------------
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      const cobaltInstances = [
        'https://cobalt-api.kwi.li/',
        'https://api.cobalt.tools/'
      ];

      for (const instance of cobaltInstances) {
        try {
          const ytRes = await fetch(instance, {
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

          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData.url) {
              return res.status(200).json({
                success: true,
                title: 'YouTube Video / Shorts',
                noWmUrl: ytData.url,
                wmUrl: ytData.url,
                musicUrl: ytData.url
              });
            }
          }
        } catch (err) {
          console.error('YouTube API Error:', err);
        }
      }
    }

    // ------------------------------------------------------------------
    // 3. INSTAGRAM (Menggunakan SnapInsta / PubAPI Fallback)
    // ------------------------------------------------------------------
    if (cleanUrl.includes('instagram.com')) {
      try {
        const igRes = await fetch(`https://api.vreden.my.id/api/instagram?url=${encodeURIComponent(cleanUrl)}`);
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
      } catch (err) {
        console.error('Instagram API Error:', err);
      }
    }

    // ------------------------------------------------------------------
    // 4. FALLBACK GENERAL (Canine Tools)
    // ------------------------------------------------------------------
    try {
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
    } catch (err) {
      console.error('General Fallback Error:', err);
    }

    // Jika semua scraper gagal
    return res.status(400).json({
      success: false,
      message: 'Gagal memproses link. Server downloader sedang sibuk atau link bersifat privat.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem backend.'
    });
  }
}
