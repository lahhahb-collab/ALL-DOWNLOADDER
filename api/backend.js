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
    // 1. YOUTUBE & YOUTUBE SHORTS (Solusi Tembus Blokir Vercel)
    // ------------------------------------------------------------------
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      
      // OPSI 1: API Y2Mate / Ytdl-Core Proxy
      try {
        const y2Res = await fetch('https://yt-download-api.vercel.app/api/yt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl })
        });
        
        if (y2Res.ok) {
          const y2Data = await y2Res.json();
          if (y2Data && y2Data.url) {
            return res.status(200).json({
              success: true,
              title: y2Data.title || 'YouTube Video / Shorts',
              cover: y2Data.thumbnail || '',
              noWmUrl: y2Data.url,
              wmUrl: y2Data.url
            });
          }
        }
      } catch (e) {
        console.error("YT Opsi 1 Fail", e);
      }

      // OPSI 2: Rapid/Public Downloader Proxy
      try {
        const fallbackRes = await fetch(`https://api.vreden.web.id/api/ytmp4?url=${encodeURIComponent(cleanUrl)}`);
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          const downloadUrl = fbData?.result?.download?.url || fbData?.result?.url || fbData?.result?.download;
          if (downloadUrl) {
            return res.status(200).json({
              success: true,
              title: fbData.result?.title || 'YouTube Shorts',
              cover: fbData.result?.metadata?.thumbnail || '',
              noWmUrl: downloadUrl,
              wmUrl: downloadUrl
            });
          }
        }
      } catch (e) {
        console.error("YT Opsi 2 Fail", e);
      }

      // OPSI 3: Cobalt Stream Endpoint
      try {
        const cobRes = await fetch('https://api.cobalt.tools/', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            url: cleanUrl,
            videoQuality: '720',
            downloadMode: 'auto'
          })
        });

        if (cobRes.ok) {
          const cobData = await cobRes.json();
          if (cobData.url) {
            return res.status(200).json({
              success: true,
              title: 'YouTube Shorts',
              noWmUrl: cobData.url,
              wmUrl: cobData.url
            });
          }
        }
      } catch (e) {
        console.error("YT Opsi 3 Fail", e);
      }
    }

    // ------------------------------------------------------------------
    // 2. TIKTOK & DOUYIN
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
    // 3. INSTAGRAM
    // ------------------------------------------------------------------
    if (cleanUrl.includes('instagram.com')) {
      try {
        const igRes = await fetch(`https://api.vreden.web.id/api/instagram?url=${encodeURIComponent(cleanUrl)}`);
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
      message: 'Gagal mengambil media. Pastikan link publik dan coba beberapa saat lagi.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem backend.'
    });
  }
}
