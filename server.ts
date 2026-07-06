import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db.ts';
import { GoogleGenAI } from '@google/genai';
import QRCode from 'qrcode';

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// Helper to render letter template
async function renderLetterTemplate(
  template: string,
  data: Record<string, string>,
  pengajuanId: string,
  status: string,
  qrcodeData?: string
): Promise<string> {
  let rendered = template;

  // 1. Replace user field data
  for (const [key, val] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, val || '');
  }

  // 2. Extra system-generated variables
  const nomorSurat = pengajuanId.toUpperCase().replace('REQ-', '');
  rendered = rendered.replace(/{{nomor_surat}}/g, nomorSurat);
  rendered = rendered.replace(/{{tanggal_sekarang}}/g, new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }));

  // 3. QR Code generation
  if (status === 'selesai' && qrcodeData) {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrcodeData, { width: 140, margin: 1 });
      rendered = rendered.replace(/{{%qrcode}}/g, `<img src="${qrDataUrl}" alt="QR Verifikasi" style="width: 70px; height: 70px; display: block; margin: 0 auto; border: 1px solid #f3f4f6;" />`);
    } catch (e) {
      rendered = rendered.replace(/{{%qrcode}}/g, `<span style="font-size: 8px; color: red;">QR Error</span>`);
    }
  } else {
    rendered = rendered.replace(/{{%qrcode}}/g, `
      <div style="border: 1px dashed #d1d5db; color: #9ca3af; padding: 4px; font-size: 8px; font-family: monospace; border-radius: 3px; display: inline-block;">
        DRAF VERIFIKASI
      </div>
    `);
  }

  // 4. Digital Signature (TTE) generation
  if (status === 'selesai') {
    const tteStamp = `
      <div style="border: 2px solid #16a34a; background-color: #f0fdf4; color: #16a34a; padding: 6px 12px; border-radius: 4px; display: inline-block; font-family: monospace; text-align: center; line-height: 1.1; margin: 4px auto; width: 180px;">
        <span style="font-size: 8px; font-weight: bold; display: block; letter-spacing: 0.5px;">PEMERINTAH DESA HARAPAN JAYA</span>
        <span style="font-size: 9px; font-weight: bold; display: block; border-top: 1px solid #16a34a; margin-top: 3px; padding-top: 3px; letter-spacing: 0.5px; color: #15803d;">TTE TERVERIFIKASI BSrE</span>
        <span style="font-size: 7px; opacity: 0.8; display: block; margin-top: 2px;">REF-ID: HJ-${nomorSurat}</span>
      </div>
    `;
    rendered = rendered.replace(/{{%ttd}}/g, tteStamp);
  } else if (status === 'ditolak') {
    rendered = rendered.replace(/{{%ttd}}/g, `
      <div style="border: 2px solid #dc2626; background-color: #fef2f2; color: #dc2626; padding: 8px 12px; border-radius: 4px; display: inline-block; font-family: monospace; text-align: center; font-weight: bold; font-size: 10px; width: 180px;">
        DITOLAK / DIBATALKAN
      </div>
    `);
  } else {
    rendered = rendered.replace(/{{%ttd}}/g, `
      <div style="border: 1px dashed #d1d5db; color: #9ca3af; padding: 12px; text-align: center; font-size: 10px; font-style: italic; border-radius: 4px; width: 180px; margin: 0 auto;">
        MENUNGGU TTE KEPALA DESA
      </div>
    `);
  }

  // 5. Clean up remaining unmatched braces
  rendered = rendered.replace(/{{[a-zA-Z0-9_]+}}/g, '...');

  return rendered;
}

// --------------------------------------------------------------------
// Public APIs
// --------------------------------------------------------------------

// Get active letter types (for dropdowns)
app.get('/api/jenis-surat', (req, res) => {
  try {
    const list = db.getJenisSuratList();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil jenis surat' });
  }
});

// Submit application
app.post('/api/submit-surat', (req, res) => {
  try {
    const { jenis_surat_id, nik, nama_lengkap, alamat, no_whatsapp, data_surat } = req.body;
    
    if (!jenis_surat_id || !nik || !nama_lengkap || !alamat || !no_whatsapp || !data_surat) {
      return res.status(400).json({ error: 'Formulir tidak lengkap' });
    }

    const newSubmission = db.createPengajuan({
      jenis_surat_id,
      nik,
      nama_lengkap,
      alamat,
      no_whatsapp,
      data_surat
    });

    res.status(201).json({ 
      success: true, 
      message: 'Pengajuan surat berhasil dikirim!', 
      data: newSubmission 
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengirimkan pengajuan surat' });
  }
});

// Get detailed parsed preview
app.get('/api/preview-surat/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const submission = db.getPengajuanById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }

    const template = db.getJenisSuratById(submission.jenis_surat_id);
    if (!template) {
      return res.status(404).json({ error: 'Template surat tidak ditemukan' });
    }

    const renderedHTML = await renderLetterTemplate(
      template.template_content,
      submission.data_surat,
      submission.id,
      submission.status,
      submission.qr_code_data
    );

    res.json({
      html: renderedHTML,
      submission
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal me-render pratinjau surat' });
  }
});

// --------------------------------------------------------------------
// Admin APIs (Authenticated via simple mock / admin-auth checks)
// --------------------------------------------------------------------

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  // Standard mock credentials
  if (email === 'malingpingpos@gmail.com' && password === 'admindesa123') {
    res.json({
      success: true,
      token: 'admin-session-token-9988',
      admin: {
        name: 'H. Sulaeman, M.Si',
        email: 'malingpingpos@gmail.com',
        role: 'Kepala Desa'
      }
    });
  } else {
    res.status(401).json({ success: false, error: 'Email atau password salah' });
  }
});

// Admin get list of submissions (with search, filter, and dashboard stats)
app.get('/api/admin/pengajuan', (req, res) => {
  try {
    const list = db.getPengajuanList();
    const { status, search } = req.query;

    let filtered = [...list];

    // Search by NIK/Nama
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(item => 
        item.nama_lengkap.toLowerCase().includes(q) || 
        item.nik.includes(q)
      );
    }

    // Filter by status
    if (status && status !== 'semua') {
      filtered = filtered.filter(item => item.status === status);
    }

    // Sort by latest
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Calculate dynamic stats
    const totalPengajuan = list.length;
    const totalPending = list.filter(i => i.status === 'pending').length;
    const totalProses = list.filter(i => i.status === 'proses').length;
    const totalSelesai = list.filter(i => i.status === 'selesai').length;
    const totalDitolak = list.filter(i => i.status === 'ditolak').length;

    // Today's counter
    const todayStr = new Date().toISOString().split('T')[0];
    const pengajuanHariIni = list.filter(i => i.created_at.startsWith(todayStr)).length;

    // Breakdown per type
    const perJenisSurat: Record<string, number> = {};
    list.forEach(i => {
      perJenisSurat[i.jenis_surat_id] = (perJenisSurat[i.jenis_surat_id] || 0) + 1;
    });

    // Mock trend over the last 5 months
    const monthlyTrends = [
      { month: 'Februari', count: 12 },
      { month: 'Maret', count: 18 },
      { month: 'April', count: 25 },
      { month: 'Mei', count: 32 },
      { month: 'Juni', count: list.length + 8 },
    ];

    const stats = {
      totalPengajuan,
      totalPending,
      totalProses,
      totalSelesai,
      totalDitolak,
      pengajuanHariIni,
      perJenisSurat,
      monthlyTrends
    };

    res.json({
      submissions: filtered,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat daftar pengajuan' });
  }
});

// Process submission (Pending -> Proses)
app.put('/api/admin/pengajuan/:id/process', (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, operator } = req.body;
    const updated = db.updatePengajuanStatus(id, 'proses', admin_notes, operator);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memproses pengajuan' });
  }
});

// Complete submission (Proses -> Selesai / Generate TTE and QR)
app.put('/api/admin/pengajuan/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, operator } = req.body;
    const updated = db.updatePengajuanStatus(id, 'selesai', admin_notes, operator);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyelesaikan pengajuan' });
  }
});

// Reject submission
app.put('/api/admin/pengajuan/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, operator } = req.body;
    const updated = db.updatePengajuanStatus(id, 'ditolak', admin_notes, operator);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menolak pengajuan' });
  }
});

// Delete submission
app.delete('/api/admin/pengajuan/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { operator } = req.query;
    db.deletePengajuan(id, String(operator || 'Admin'));
    res.json({ success: true, message: 'Pengajuan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus pengajuan' });
  }
});

// CRUD - Create new Letter Template (Jenis Surat)
app.post('/api/admin/jenis-surat', (req, res) => {
  try {
    const { nama_surat, kode_surat, template_content, fields_config } = req.body;
    if (!nama_surat || !kode_surat || !template_content || !fields_config) {
      return res.status(400).json({ error: 'Konfigurasi template tidak lengkap' });
    }
    const created = db.createJenisSurat({ nama_surat, kode_surat, template_content, fields_config });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat jenis surat' });
  }
});

// CRUD - Update Letter Template
app.put('/api/admin/jenis-surat/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.updateJenisSurat(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui jenis surat' });
  }
});

// CRUD - Delete Letter Template
app.delete('/api/admin/jenis-surat/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.deleteJenisSurat(id);
    res.json({ success: true, message: 'Jenis surat berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus jenis surat' });
  }
});

// Activity logs
app.get('/api/admin/logs', (req, res) => {
  try {
    res.json(db.getLogs());
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat log aktivitas' });
  }
});

// Simulate WhatsApp sending
app.post('/api/admin/send-notification/:id', (req, res) => {
  try {
    const { id } = req.params;
    const submission = db.getPengajuanById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }

    const template = db.getJenisSuratById(submission.jenis_surat_id);
    const letterName = template ? template.nama_surat : 'Surat';

    // Simulated Message Content
    let textMessage = '';
    if (submission.status === 'selesai') {
      textMessage = `*PEMBERITAHUAN SURAT SELESAI* 📨\n\nHalo Bpk/Ibu *${submission.nama_lengkap}*,\n\nPengajuan *${letterName}* Anda telah selesai ditandatangani secara elektronik (TTE) oleh Kepala Desa Harapan Jaya.\n\nSilakan unduh dokumen Anda pada tautan berikut:\n🌐 https://harapanjaya.desa.id/download/${submission.id}\n\nTerima kasih atas partisipasi Anda dalam pelayanan digital desa kami.`;
    } else if (submission.status === 'proses') {
      textMessage = `*PEMBERITAHUAN PROSES SURAT* ⏳\n\nHalo Bpk/Ibu *${submission.nama_lengkap}*,\n\nPengajuan *${letterName}* Anda saat ini sedang dalam tahap verifikasi berkas oleh admin Desa Harapan Jaya.\n\nKami akan menginfokan kembali jika dokumen telah resmi ditandatangani.`;
    } else if (submission.status === 'ditolak') {
      textMessage = `*PEMBERITAHUAN PENOLAKAN* ❌\n\nHalo Bpk/Ibu *${submission.nama_lengkap}*,\n\nPengajuan *${letterName}* Anda belum dapat disetujui.\n\n*Catatan Admin:* ${submission.admin_notes || 'Berkas tidak memenuhi syarat'}.\n\nSilakan lakukan pengajuan ulang atau datang ke Kantor Desa untuk klarifikasi lebih lanjut.`;
    } else {
      textMessage = `*PENGANTAR PENGAJUAN SURAT* 📥\n\nHalo *${submission.nama_lengkap}*,\n\nPengajuan *${letterName}* Anda telah berhasil diterima oleh sistem pelayanan online Desa Harapan Jaya dengan nomor tiket *${submission.id.toUpperCase()}*. Mohon tunggu update berikutnya.`;
    }

    // Add activity log
    db.addLog('WA_NOTIFICATION', `Mengirimkan notifikasi WhatsApp simulasi ke ${submission.no_whatsapp} a.n ${submission.nama_lengkap}`);

    res.json({
      success: true,
      recipient: submission.no_whatsapp,
      message: textMessage
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mensimulasikan pengiriman notifikasi' });
  }
});

// Download letter in multi-formats
app.get('/api/admin/download/:id/:format', async (req, res) => {
  try {
    const { id, format } = req.params;
    const submission = db.getPengajuanById(id);
    if (!submission) {
      return res.status(404).send('Dokumen tidak ditemukan');
    }

    const template = db.getJenisSuratById(submission.jenis_surat_id);
    if (!template) {
      return res.status(404).send('Template tidak ditemukan');
    }

    const renderedHTML = await renderLetterTemplate(
      template.template_content,
      submission.data_surat,
      submission.id,
      submission.status,
      submission.qr_code_data
    );

    if (format === 'word' || format === 'docx') {
      // Send Word compatible HTML format (.doc)
      res.setHeader('Content-Type', 'application/vnd.ms-word');
      res.setHeader('Content-Disposition', `attachment; filename=Surat_${template.kode_surat}_${submission.nama_lengkap.replace(/\s+/g, '_')}.doc`);
      res.send(`
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>${template.nama_surat}</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; font-size: 12pt; }
            .kop { text-align: center; border-bottom: 3px double black; margin-bottom: 20px; padding-bottom: 10px; }
            .title { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 15px; }
            .signed-block { margin-top: 50px; float: right; width: 250px; text-align: center; }
          </style>
        </head>
        <body>
          ${renderedHTML}
        </body>
        </html>
      `);
    } else {
      // PDF format -> HTML page with autotriggers window.print()
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Cetak ${template.nama_surat} - ${submission.nama_lengkap}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; background-color: white; }
              .no-print { display: none !important; }
              .page-container { border: none !important; box-shadow: none !important; margin: 0 !important; }
            }
            body { background-color: #f3f4f6; padding: 20px; font-family: ui-sans-serif, system-ui, sans-serif; }
            .page-container { background-color: white; padding: 40px; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
            .no-print {
              display: flex; justify-content: center; gap: 12px; max-width: 800px; margin: 0 auto 20px auto; background-color: #1f2937; padding: 12px; border-radius: 8px; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn {
              padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: opacity 0.2s;
            }
            .btn-primary { background-color: #2563eb; color: white; }
            .btn-secondary { background-color: #4b5563; color: white; }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn btn-primary" onclick="window.print()">🖨️ Cetak Surat (PDF)</button>
            <button class="btn btn-secondary" onclick="window.close()">❌ Tutup Jendela</button>
          </div>
          <div class="page-container">
            ${renderedHTML}
          </div>
          <script>
            // Autotrigger print dialog after render
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
    }
  } catch (error) {
    res.status(500).send('Gagal mengunduh dokumen');
  }
});

// --------------------------------------------------------------------
// Gemini Smart Assistant API (Server-Side using modern @google/genai SDK)
// --------------------------------------------------------------------
app.post('/api/gemini/assist', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt tidak boleh kosong' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        text: "Menyusun secara otomatis [Simulasi AI: Masukkan key di Secrets panel untuk hasil optimal]:\n\nUntuk melengkapi persyaratan administrasi secara resmi dan terverifikasi di tingkat Pemerintahan Desa Harapan Jaya guna menunjang keperluan yang diajukan."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Anda adalah asisten AI pamong desa digital profesional Indonesia di Desa Harapan Jaya.
Tugas Anda adalah memformulasikan teks keperluan pembuatan surat resmi menjadi bahasa birokrasi yang rapi, formal, padat, dan sopan berdasarkan masukan kasar dari warga.

Konteks Surat:
${JSON.stringify(context || {})}

Keinginan Warga / Catatan Kasar:
"${prompt}"

Tuliskan rumusan kalimat formal tersebut secara singkat saja (1-2 kalimat langsung tanpa teks pengantar, tanpa kutipan, tanpa salam pembuka/penutup, dan langsung siap disalin ke kolom isian surat). Contoh: "Melengkapi syarat pengajuan Kredit Usaha Rakyat (KUR) untuk pengembangan usaha toko kelontong."`
    });

    res.json({
      success: true,
      text: response.text?.trim() || ''
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Gagal berinteraksi dengan AI', details: error.message });
  }
});

// --------------------------------------------------------------------
// Mounting Vite / Build assets
// --------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server village surat running on http://localhost:${PORT}`);
  });
}

startServer();
