// api/backend.js
// Vercel Serverless Function — proxy antara frontend XCY DOWNLOADER dan Cobalt API.
//
// KENAPA BUTUH PROXY INI (bukan fetch langsung dari browser ke Cobalt)?
// 1. CORS — instance Cobalt tidak selalu mengizinkan origin dari domain kamu.
// 2. Menyembunyikan endpoint/instance asli dari inspect element pengguna.
// 3. Menerjemahkan format response asli Cobalt (status/url/picker) menjadi
//    format yang dipakai frontend kamu (noWmUrl/wmUrl/musicUrl/cover/title).
//
// KETERBATASAN PENTING — BACA INI:
// Instance publik Cobalt (termasuk api.cobalt.tools) sekarang hampir semua
// mengaktifkan Cloudflare Turnstile untuk proteksi dari bot/abuse.
// Turnstile adalah captcha yang HARUS diselesaikan di browser pengguna,
// dan tokennya cuma berlaku sekali pakai + terikat ke request tertentu.
// Server-to-server request (dari Vercel function ini) TIDAK BISA menyelesaikan
// captcha tersebut, sehingga permintaan bisa saja ditolak dengan error
// semacam "error.api.rate_exceeded" atau kode terkait Turnstile lainnya.
//
// Kalau kamu mengalami ini, tiga opsi realistis:
//   a) Self-host instance Cobalt sendiri dan matikan Turnstile untuk trafik
//      dari server kamu sendiri (paling reliable, tapi butuh setup server).
//   b) Hubungi owner sebuah instance publik dan minta API key khusus
//      (lihat instances.cobalt.best untuk daftar instance & kontaknya).
//   c) Terima bahwa sebagian platform/URL akan gagal diproses, dan tampilkan
//      pesan error yang jelas ke pengguna (sudah di-handle di bawah).
//
// YouTube SENGAJA TIDAK didukung endpoint ini — sesuai keputusan kamu untuk
// skip YouTube dan fokus ke platform lain yang didukung Cobalt.

const COBALT_INSTANCE = process.env.COBALT_INSTANCE_URL || 'https://api.cobalt.tools/';

// Platform yang secara sengaja diblokir dari endpoint ini.
const BLOCKED_HOSTS = [
  'youtube.com',
  'youtu.be',
  'music.youtube.com',
];

function isBlockedUrl(rawUrl) {
  try {
    const { hostname } = new URL(rawUrl);
    return BLOCKED_HOSTS.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`));
  } catch {
    // URL tidak valid akan ditangkap validasi terpisah, bukan di sini.
    return false;
  }
}

// Menerjemahkan response asli Cobalt (status: tunnel/redirect/picker/error)
// menjadi bentuk field yang frontend kamu harapkan.
function mapCobaltResponse(cobaltData, requestedUrl) {
  const base = {
    success: false,
    title: '',
    cover: null,
    noWmUrl: null,
    wmUrl: null,
    musicUrl: null,
    message: '',
  };

  if (!cobaltData || typeof cobaltData !== 'object') {
    return { ...base, message: 'Response dari server tidak valid.' };
  }

  switch (cobaltData.status) {
    case 'tunnel':
    case 'redirect': {
      // Cobalt versi terbaru mengembalikan field "url" langsung di root,
      // bukan lagi nested di "tunnel". Kita cek keduanya untuk jaga-jaga.
      const directUrl = cobaltData.url || (Array.isArray(cobaltData.tunnel) ? cobaltData.tunnel[0] : null);
      if (!directUrl) {
        return { ...base, message: 'Cobalt tidak mengembalikan link unduhan.' };
      }
      return {
        ...base,
        success: true,
        title: cobaltData.filename || 'Media',
        // Cobalt tidak selalu memberi tahu ada watermark atau tidak,
        // jadi kita taruh di noWmUrl sebagai default (kasus paling umum:
        // TikTok/Douyin biasanya sudah otomatis no-watermark dari Cobalt).
        noWmUrl: directUrl,
      };
    }

    case 'picker': {
      // Picker dipakai kalau ada beberapa opsi (misal carousel Instagram,
      // atau video+audio terpisah). Kita ambil item pertama sebagai utama,
      // dan taruh audio (jika ada) di musicUrl.
      const items = Array.isArray(cobaltData.picker) ? cobaltData.picker : [];
      const firstVideo = items.find((item) => item.type === 'video') || items[0];

      if (!firstVideo && !cobaltData.audio) {
        return { ...base, message: 'Tidak ada media yang bisa diunduh dari link ini.' };
      }

      return {
        ...base,
        success: true,
        title: 'Media',
        cover: firstVideo?.thumb || null,
        noWmUrl: firstVideo?.url || null,
        musicUrl: cobaltData.audio || null,
      };
    }

    case 'error': {
      const code = cobaltData.error?.code || 'unknown';
      return { ...base, message: translateCobaltError(code) };
    }

    default:
      return { ...base, message: `Status tidak dikenal dari Cobalt: ${cobaltData.status || 'tidak ada'}` };
  }
}

// Menerjemahkan kode error Cobalt jadi pesan Bahasa Indonesia yang jelas.
function translateCobaltError(code) {
  const map = {
    'error.api.link.invalid': 'Link tidak valid atau tidak dikenali.',
    'error.api.service.unsupported': 'Platform ini belum didukung.',
    'error.api.content.video.unavailable': 'Video tidak tersedia (mungkin private atau sudah dihapus).',
    'error.api.fetch.fail': 'Gagal mengambil data dari sumbernya. Coba lagi sebentar lagi.',
    'error.api.rate_exceeded': 'Server sedang sibuk (rate limit). Coba lagi dalam beberapa menit.',
    'error.api.auth.turnstile.missing': 'Server memerlukan verifikasi tambahan yang tidak bisa diproses otomatis dari sini.',
    'error.api.auth.turnstile.invalid': 'Verifikasi keamanan gagal di sisi server.',
  };
  return map[code] || `Gagal memproses: ${code}`;
}

export default async function handler(req, res) {
  // Hanya izinkan method POST.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method tidak diizinkan.' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'URL wajib diisi.' });
  }

  // Validasi format URL dasar.
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ success: false, message: 'Format URL tidak valid.' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ success: false, message: 'URL harus menggunakan http atau https.' });
  }

  // Tolak YouTube secara eksplisit dengan pesan yang jelas,
  // daripada membiarkannya gagal dengan error generik dari Cobalt.
  if (isBlockedUrl(url)) {
    return res.status(200).json({
      success: false,
      message: 'YouTube belum didukung di endpoint ini. Silakan gunakan platform lain (TikTok, Instagram, Twitter, dll).',
    });
  }

  try {
    const cobaltRes = await fetch(COBALT_INSTANCE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Beberapa instance memerlukan API key. Set di environment variable
        // Vercel bernama COBALT_API_KEY kalau kamu punya salah satu.
        ...(process.env.COBALT_API_KEY
          ? { Authorization: `Api-Key ${process.env.COBALT_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        url,
        filenameStyle: 'basic',
        downloadMode: 'auto',
      }),
    });

    // Kalau instance mengembalikan non-JSON (misal halaman HTML block dari
    // Cloudflare/Turnstile), res.json() akan throw — kita tangkap di catch.
    const cobaltData = await cobaltRes.json();

    if (!cobaltRes.ok && cobaltRes.status !== 200) {
      return res.status(200).json({
        success: false,
        message: `Server sumber menolak permintaan (HTTP ${cobaltRes.status}). Kemungkinan diblokir proteksi bot instance ini.`,
      });
    }

    const mapped = mapCobaltResponse(cobaltData, url);
    return res.status(200).json(mapped);
  } catch (err) {
    console.error('Cobalt proxy error:', err);
    return res.status(200).json({
      success: false,
      message: 'Gagal terhubung ke server pemroses. Instance mungkin sedang down atau memblokir permintaan otomatis (Turnstile).',
    });
  }
}
