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
    // ------------------------------------------------------------------
    // 1. TIKTOK & DOUYIN
    // ------------------------------------------------------------------
    if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('douyin.com')) {
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
      } catch (e) {
        console.error("TikTok Error", e);
      }
    }

    // ------------------------------------------------------------------
    // 2. YOUTUBE & YOUTUBE SHORTS (Menggunakan API Fast Downloader)
    // ------------------------------------------------------------------
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      // Metode A: Menggunakan AllTube / SaveTube API
      try {
        const ytRes = await fetch(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(cleanUrl)}`);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (ytData.result && ytData.result.download) {
            return res.status(200).json({
              success: true,
              title: ytData.result.title || 'YouTube Video',
              cover: ytData.result.metadata?.thumbnail || '',
              noWmUrl: ytData.result.download.url || ytData.result.download,
              wmUrl: ytData.result.download.url || ytData.result.download
            });
          }
        }
      } catch (e) {
        console.error("YT API A Error", e);
      }

      // Metode B: Menggunakan Cobalt API Alternate Node
      try {
        const cobaltRes = await fetch('https://co.wuk.sh/api/json', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: cleanUrl,
            vCodec: 'h264'
          })
        });

        if (cobaltRes.ok) {
          const cobaltData = await cobaltRes.json();
          if (cobaltData.url) {
            return res.status(200).json({
              success: true,
              title: 'YouTube Shorts',
              noWmUrl: cobaltData.url,
              wmUrl: cobaltData.url
            });
          }
        }
      } catch (e) {
        console.error("YT API B Error", e);
      }
    }

    // ------------------------------------------------------------------
    // 3. INSTAGRAM
    // ------------------------------------------------------------------
    if (cleanUrl.includes('instagram.com')) {
      try {
        const igRes = await fetch(`https://api.vreden.my.id/api/instagram?url=${encodeURIComponent(cleanUrl)}`);
        if (igRes.ok) {
          const igData = await igRes.json();
          if (igData.result && igData.result.length > 0) {
            return res.status(200).json({
              success: true,
              title: 'Instagram Post/Reels',
              noWmUrl: igData.result[0].url || igData.result[0],
              wmUrl: igData.result[0].url || igData.result[0]
            });
          }
        }
      } catch (e) {
        console.error("IG Error", e);
      }
    }

    // ------------------------------------------------------------------
    // 4. GENERAL ENGINE (Canine Tools)
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
      }
    } catch (e) {
      console.error("Canine Error", e);
    }

    return res.status(400).json({
      success: false,
      message: 'Gagal mengambil video. Silakan coba lagi nanti.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem backend.'
    });
  }
}
