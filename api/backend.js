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
    const response = await fetch('https://api.cobalt.tools/api/json', {
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

    const data = await response.json();

    if (data.status === 'stream' || data.status === 'redirect') {
      return res.status(200).json({
        success: true,
        downloadUrl: data.url,
        title: 'Media Siap Diunduh'
      });
    } else if (data.status === 'picker') {
      return res.status(200).json({
        success: true,
        downloadUrl: data.picker[0].url,
        title: 'Media Galeri'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: data.text || 'Gagal memproses link.'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan jaringan/server.'
    });
  }
}
