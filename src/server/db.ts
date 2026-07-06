import fs from 'fs';
import path from 'path';
import { JenisSurat, PengajuanSurat, ActivityLog } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DBData {
  jenis_surat: JenisSurat[];
  pengajuan_surat: PengajuanSurat[];
  activity_logs: ActivityLog[];
}

const DEFAULT_JENIS_SURAT: JenisSurat[] = [
  {
    id: 'sku-001',
    nama_surat: 'Surat Keterangan Usaha (SKU)',
    kode_surat: 'SKU',
    template_content: `<div class="p-8 bg-white text-black font-sans leading-relaxed" style="min-height: 800px; max-width: 650px; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.05); border: 1px solid #ddd;">
  <!-- KOP SURAT (LETTERHEAD) -->
  <div class="text-center border-b-4 border-double border-black pb-4 mb-6">
    <div class="text-xs uppercase tracking-wider font-bold">Pemerintah Kabupaten Serang</div>
    <div class="text-xs uppercase tracking-wider font-bold">Kecamatan Kramatwatu</div>
    <div class="text-xl uppercase tracking-widest font-black text-gray-900 mt-1">Pemerintah Desa Harapan Jaya</div>
    <div class="text-xs italic text-gray-600 mt-1">Alamat: Jl. Raya Harapan No. 45, Desa Harapan Jaya, Kode Pos 42161</div>
  </div>

  <!-- SURAT TITLE -->
  <div class="text-center mb-6">
    <h3 class="text-base uppercase tracking-wider font-bold underline">SURAT KETERANGAN USAHA</h3>
    <p class="text-xs text-gray-800 mt-1">Nomor: 510/{{nomor_surat}}/DESA-HJ/2026</p>
  </div>

  <!-- ISI SURAT (BODY) -->
  <div class="text-xs text-justify space-y-4">
    <p>Yang bertanda tangan di bawah ini Kepala Desa Harapan Jaya, Kecamatan Kramatwatu, Kabupaten Serang, dengan ini menerangkan bahwa:</p>
    
    <table class="w-full my-3 border-collapse">
      <tbody>
        <tr>
          <td class="w-32 py-1 font-semibold">Nama Lengkap</td>
          <td class="w-4 py-1">:</td>
          <td class="py-1 uppercase font-bold">{{nama_pemohon}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">NIK (No. KTP)</td>
          <td class="py-1">:</td>
          <td class="py-1 font-mono">{{nik}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">Alamat Domisili</td>
          <td class="py-1">:</td>
          <td class="py-1 leading-snug">{{alamat}}</td>
        </tr>
      </tbody>
    </table>

    <p>Berdasarkan keterangan yang bersangkutan dan pencatatan kami, nama di atas adalah benar memiliki bidang usaha mandiri sebagai berikut:</p>

    <table class="w-full my-3 border-collapse">
      <tbody>
        <tr>
          <td class="w-32 py-1 font-semibold">Jenis Usaha</td>
          <td class="w-4 py-1">:</td>
          <td class="py-1 uppercase font-semibold">{{jenis_usaha}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">Alamat Tempat Usaha</td>
          <td class="py-1">:</td>
          <td class="py-1">{{alamat_usaha}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">Sejak Berdiri (Tgl)</td>
          <td class="py-1">:</td>
          <td class="py-1">{{tanggal_mulai}}</td>
        </tr>
      </tbody>
    </table>

    <p>Surat keterangan ini diberikan kepada yang bersangkutan guna keperluan: <strong class="underline">{{keperluan}}</strong>.</p>
    
    <p>Demikian Surat Keterangan Usaha ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
  </div>

  <!-- PENUTUP / TANDA TANGAN (SIGNATURE BLOCK) -->
  <div class="mt-12 flex justify-between items-start">
    <div class="text-center w-36">
      <!-- QR Verifikasi Samping Kiri (jika ada) -->
      <div class="mt-4 flex flex-col items-center justify-center">
        {{%qrcode}}
        <span class="text-[8px] text-gray-500 font-mono mt-1">Scan Verifikasi Resmi</span>
      </div>
    </div>
    
    <div class="text-center w-56 text-xs">
      <p>Harapan Jaya, {{tanggal_sekarang}}</p>
      <p class="font-bold mt-1">Kepala Desa Harapan Jaya</p>
      
      <!-- Placeholder Tanda Tangan (TTE) -->
      <div class="my-3 flex justify-center items-center h-20">
        {{%ttd}}
      </div>
      
      <p class="font-bold underline uppercase">H. SULAEMAN, M.Si</p>
      <p class="text-[10px] text-gray-600 font-mono">NIP. 19741205 200212 1 002</p>
    </div>
  </div>
</div>`,
    fields_config: [
      { name: 'nik', type: 'text', label: 'NIK Pemohon', required: true, placeholder: 'Contoh: 3604123456780001' },
      { name: 'nama_pemohon', type: 'text', label: 'Nama Lengkap Pemohon', required: true, placeholder: 'Sesuai KTP' },
      { name: 'alamat', type: 'textarea', label: 'Alamat Domisili', required: true, placeholder: 'RT/RW, Kampung, Desa' },
      { name: 'jenis_usaha', type: 'select', label: 'Jenis Usaha Mandiri', required: true, options: ['Pertanian & Peternakan', 'Perdagangan / UMKM', 'Jasa & Konsultansi', 'Kerajinan Tangan', 'Perbengkelan / Manufaktur'] },
      { name: 'alamat_usaha', type: 'textarea', label: 'Alamat Lokasi Usaha', required: true, placeholder: 'Lokasi usaha berada' },
      { name: 'tanggal_mulai', type: 'date', label: 'Mulai Usaha Sejak Tanggal', required: true },
      { name: 'keperluan', type: 'text', label: 'Keperluan Pembuatan Surat', required: true, placeholder: 'Contoh: Pengajuan KUR Bank, Izin Usaha, dll' }
    ],
    created_at: new Date('2026-01-10T08:00:00Z').toISOString(),
    updated_at: new Date('2026-01-10T08:00:00Z').toISOString()
  },
  {
    id: 'skd-002',
    nama_surat: 'Surat Keterangan Domisili (SKD)',
    kode_surat: 'SKD',
    template_content: `<div class="p-8 bg-white text-black font-sans leading-relaxed" style="min-height: 800px; max-width: 650px; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.05); border: 1px solid #ddd;">
  <div class="text-center border-b-4 border-double border-black pb-4 mb-6">
    <div class="text-xs uppercase tracking-wider font-bold">Pemerintah Kabupaten Serang</div>
    <div class="text-xs uppercase tracking-wider font-bold">Kecamatan Kramatwatu</div>
    <div class="text-xl uppercase tracking-widest font-black text-gray-900 mt-1">Pemerintah Desa Harapan Jaya</div>
    <div class="text-xs italic text-gray-600 mt-1">Alamat: Jl. Raya Harapan No. 45, Desa Harapan Jaya, Kode Pos 42161</div>
  </div>

  <div class="text-center mb-6">
    <h3 class="text-base uppercase tracking-wider font-bold underline">SURAT KETERANGAN DOMISILI</h3>
    <p class="text-xs text-gray-800 mt-1">Nomor: 470/{{nomor_surat}}/DESA-HJ/2026</p>
  </div>

  <div class="text-xs text-justify space-y-4">
    <p>Yang bertanda tangan di bawah ini Kepala Desa Harapan Jaya, Kecamatan Kramatwatu, Kabupaten Serang, dengan ini menerangkan bahwa:</p>
    
    <table class="w-full my-3 border-collapse">
      <tbody>
        <tr>
          <td class="w-32 py-1 font-semibold">Nama Lengkap</td>
          <td class="w-4 py-1">:</td>
          <td class="py-1 uppercase font-bold">{{nama_pemohon}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">NIK (No. KTP)</td>
          <td class="py-1">:</td>
          <td class="py-1 font-mono">{{nik}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">Alamat Tempat Tinggal</td>
          <td class="py-1">:</td>
          <td class="py-1">{{alamat}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">Tinggal Sejak Tanggal</td>
          <td class="py-1">:</td>
          <td class="py-1">{{sejak_tanggal}}</td>
        </tr>
      </tbody>
    </table>

    <p>Nama tersebut di atas adalah benar warga kami yang berdomisili dan menetap secara sah di wilayah administratif Desa Harapan Jaya sejak tanggal tertera di atas.</p>
    
    <p>Surat keterangan domisili ini diterbitkan secara khusus untuk keperluan: <strong class="underline">{{keperluan}}</strong>.</p>
    
    <p>Demikian Surat Keterangan Domisili ini kami buat dengan sejujurnya dan penuh tanggung jawab untuk digunakan seperlunya.</p>
  </div>

  <div class="mt-12 flex justify-between items-start">
    <div class="text-center w-36">
      <div class="mt-4 flex flex-col items-center justify-center">
        {{%qrcode}}
        <span class="text-[8px] text-gray-500 font-mono mt-1">Scan Verifikasi Resmi</span>
      </div>
    </div>
    
    <div class="text-center w-56 text-xs">
      <p>Harapan Jaya, {{tanggal_sekarang}}</p>
      <p class="font-bold mt-1">Kepala Desa Harapan Jaya</p>
      
      <div class="my-3 flex justify-center items-center h-20">
        {{%ttd}}
      </div>
      
      <p class="font-bold underline uppercase">H. SULAEMAN, M.Si</p>
      <p class="text-[10px] text-gray-600 font-mono">NIP. 19741205 200212 1 002</p>
    </div>
  </div>
</div>`,
    fields_config: [
      { name: 'nik', type: 'text', label: 'NIK Pemohon', required: true, placeholder: '3604xxxxxxxxxxxx' },
      { name: 'nama_pemohon', type: 'text', label: 'Nama Lengkap Pemohon', required: true, placeholder: 'Sesuai KTP' },
      { name: 'alamat', type: 'textarea', label: 'Alamat Domisili Sekarang', required: true, placeholder: 'Dusun/Kampung, RT/RW, Desa Harapan Jaya' },
      { name: 'sejak_tanggal', type: 'date', label: 'Tinggal Sejak Tanggal', required: true },
      { name: 'keperluan', type: 'text', label: 'Keperluan Domisili', required: true, placeholder: 'Contoh: Melamar Pekerjaan, Pembukaan Rekening Bank, dll' }
    ],
    created_at: new Date('2026-02-15T08:00:00Z').toISOString(),
    updated_at: new Date('2026-02-15T08:00:00Z').toISOString()
  },
  {
    id: 'skck-003',
    nama_surat: 'Surat Pengantar SKCK (SP-SKCK)',
    kode_surat: 'SP-SKCK',
    template_content: `<div class="p-8 bg-white text-black font-sans leading-relaxed" style="min-height: 800px; max-width: 650px; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.05); border: 1px solid #ddd;">
  <div class="text-center border-b-4 border-double border-black pb-4 mb-6">
    <div class="text-xs uppercase tracking-wider font-bold">Pemerintah Kabupaten Serang</div>
    <div class="text-xs uppercase tracking-wider font-bold">Kecamatan Kramatwatu</div>
    <div class="text-xl uppercase tracking-widest font-black text-gray-900 mt-1">Pemerintah Desa Harapan Jaya</div>
    <div class="text-xs italic text-gray-600 mt-1">Alamat: Jl. Raya Harapan No. 45, Desa Harapan Jaya, Kode Pos 42161</div>
  </div>

  <div class="text-center mb-6">
    <h3 class="text-base uppercase tracking-wider font-bold underline">SURAT PENGANTAR SKCK</h3>
    <p class="text-xs text-gray-800 mt-1">Nomor: 331/{{nomor_surat}}/DESA-HJ/2026</p>
  </div>

  <div class="text-xs text-justify space-y-4">
    <p>Yang bertanda tangan di bawah ini Kepala Desa Harapan Jaya, Kecamatan Kramatwatu, Kabupaten Serang, menerangkan bahwa:</p>
    
    <table class="w-full my-3 border-collapse">
      <tbody>
        <tr>
          <td class="w-32 py-1 font-semibold">Nama Lengkap</td>
          <td class="w-4 py-1">:</td>
          <td class="py-1 uppercase font-bold">{{nama_pemohon}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">NIK (No. KTP)</td>
          <td class="py-1">:</td>
          <td class="py-1 font-mono">{{nik}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">Pekerjaan</td>
          <td class="py-1">:</td>
          <td class="py-1">{{pekerjaan}}</td>
        </tr>
        <tr>
          <td class="py-1 font-semibold">Alamat Domisili</td>
          <td class="py-1">:</td>
          <td class="py-1">{{alamat}}</td>
        </tr>
      </tbody>
    </table>

    <p>Berdasarkan catatan kelakuan warga di tingkat rukun tetangga/rukun warga (RT/RW), sepanjang pengamatan kami nama tersebut di atas berkelakuan baik, belum pernah terlibat tindak pidana/kriminalitas, serta patuh pada tata tertib sosial desa.</p>
    
    <p>Surat pengantar ini diberikan secara khusus untuk melengkapi syarat pembuatan <strong>Surat Keterangan Catatan Kepolisian (SKCK)</strong> di Kepolisian Sektor (Polsek) setempat guna keperluan: <strong class="underline">{{keperluan}}</strong>.</p>
    
    <p>Catatan Tambahan: <em>{{keterangan_lain}}</em></p>

    <p>Demikian Surat Pengantar ini dibuat dengan sebenarnya untuk digunakan sesuai peruntukannya.</p>
  </div>

  <div class="mt-12 flex justify-between items-start">
    <div class="text-center w-36">
      <div class="mt-4 flex flex-col items-center justify-center">
        {{%qrcode}}
        <span class="text-[8px] text-gray-500 font-mono mt-1">Scan Verifikasi Resmi</span>
      </div>
    </div>
    
    <div class="text-center w-56 text-xs">
      <p>Harapan Jaya, {{tanggal_sekarang}}</p>
      <p class="font-bold mt-1">Kepala Desa Harapan Jaya</p>
      
      <div class="my-3 flex justify-center items-center h-20">
        {{%ttd}}
      </div>
      
      <p class="font-bold underline uppercase">H. SULAEMAN, M.Si</p>
      <p class="text-[10px] text-gray-600 font-mono">NIP. 19741205 200212 1 002</p>
    </div>
  </div>
</div>`,
    fields_config: [
      { name: 'nik', type: 'text', label: 'NIK Pemohon', required: true, placeholder: '3604xxxxxxxxxxxx' },
      { name: 'nama_pemohon', type: 'text', label: 'Nama Lengkap', required: true },
      { name: 'pekerjaan', type: 'text', label: 'Pekerjaan Sekarang', required: true, placeholder: 'Contoh: Wiraswasta, Mahasiswa, Belum Bekerja' },
      { name: 'alamat', type: 'textarea', label: 'Alamat Domisili Lengkap', required: true },
      { name: 'keperluan', type: 'text', label: 'Keperluan Pembuatan SKCK', required: true, placeholder: 'Contoh: Melamar Pekerjaan di BUMN, Pendaftaran CPNS, Sekolah' },
      { name: 'keterangan_lain', type: 'textarea', label: 'Keterangan Lain (Opsional)', required: false, placeholder: 'Catatan tambahan dari desa' }
    ],
    created_at: new Date('2026-03-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-03-01T08:00:00Z').toISOString()
  }
];

const DEFAULT_PENGAJUAN: PengajuanSurat[] = [
  {
    id: 'req-001',
    jenis_surat_id: 'sku-001',
    nik: '3604120102920003',
    nama_lengkap: 'Budi Santoso',
    alamat: 'Kampung Rawa Indah RT 02/RW 03, Desa Harapan Jaya, Serang',
    no_whatsapp: '081234567890',
    data_surat: {
      nik: '3604120102920003',
      nama_pemohon: 'Budi Santoso',
      alamat: 'Kampung Rawa Indah RT 02/RW 03, Desa Harapan Jaya, Serang',
      jenis_usaha: 'Perdagangan / UMKM',
      alamat_usaha: 'Pasar Harapan Baru Kios No. 12, Harapan Jaya',
      tanggal_mulai: '2024-05-12',
      keperluan: 'Mengajukan pinjaman modal usaha KUR Bank Mandiri'
    },
    status: 'selesai',
    admin_notes: 'Berkas usaha telah diperiksa secara fisik oleh RT setempat. Memenuhi syarat.',
    signed_at: '2026-07-04T09:30:00Z',
    signed_by: 'Kepala Desa Harapan Jaya (H. SULAEMAN, M.Si)',
    qr_code_data: 'https://ais-dev-sjti4mp3ducoseuf5v3i4u-966082489262.asia-southeast1.run.app/verify/req-001',
    barcode_data: 'HJ-SKU-10292',
    created_at: '2026-07-03T14:20:00Z',
    updated_at: '2026-07-04T09:30:00Z'
  },
  {
    id: 'req-002',
    jenis_surat_id: 'skd-002',
    nik: '3273151508980005',
    nama_lengkap: 'Siti Rahmawati',
    alamat: 'Perumahan Harapan Regency Blok C12 No. 5, Harapan Jaya',
    no_whatsapp: '085712345678',
    data_surat: {
      nik: '3273151508980005',
      nama_pemohon: 'Siti Rahmawati',
      alamat: 'Perumahan Harapan Regency Blok C12 No. 5, Harapan Jaya',
      sejak_tanggal: '2025-01-10',
      keperluan: 'Syarat kepindahan tugas & kelengkapan administrasi domisili baru'
    },
    status: 'proses',
    admin_notes: 'KTP pemohon asal Bandung, surat kepindahan dari daerah asal sudah dilampirkan.',
    created_at: '2026-07-05T08:15:00Z',
    updated_at: '2026-07-05T10:00:00Z'
  },
  {
    id: 'req-003',
    jenis_surat_id: 'skck-003',
    nik: '3604124409010002',
    nama_lengkap: 'Dimas Wijaya',
    alamat: 'Kampung Suka Maju RT 04/RW 01, Desa Harapan Jaya',
    no_whatsapp: '089987654321',
    data_surat: {
      nik: '3604124409010002',
      nama_pemohon: 'Dimas Wijaya',
      alamat: 'Kampung Suka Maju RT 04/RW 01, Desa Harapan Jaya',
      pekerjaan: 'Belum Bekerja',
      keperluan: 'Melamar pekerjaan sebagai Operator Pabrik di Kawasan Modern Cikande',
      keterangan_lain: 'Melampirkan surat rekomendasi kelakuan baik dari RT 04.'
    },
    status: 'pending',
    created_at: '2026-07-05T15:45:00Z',
    updated_at: '2026-07-05T15:45:00Z'
  }
];

const DEFAULT_LOGS: ActivityLog[] = [
  { id: 'log-001', action: 'DB_INITIALIZE', description: 'Database surat online desa berhasil diinisialisasi', timestamp: new Date('2026-07-05T16:00:00Z').toISOString() },
  { id: 'log-002', action: 'PROCESS_LETTER', description: 'Admin memproses pengajuan SKU a.n Budi Santoso', timestamp: new Date('2026-07-03T15:00:00Z').toISOString(), operator: 'malingpingpos@gmail.com' },
  { id: 'log-003', action: 'COMPLETE_LETTER', description: 'Surat SKU berhasil diterbitkan & ditandatangani untuk Budi Santoso', timestamp: new Date('2026-07-04T09:30:00Z').toISOString(), operator: 'malingpingpos@gmail.com' },
  { id: 'log-004', action: 'SUBMIT_LETTER', description: 'Warga Siti Rahmawati mengajukan Surat Keterangan Domisili (SKD)', timestamp: new Date('2026-07-05T08:15:00Z').toISOString() },
  { id: 'log-005', action: 'SUBMIT_LETTER', description: 'Warga Dimas Wijaya mengajukan Surat Pengantar SKCK', timestamp: new Date('2026-07-05T15:45:00Z').toISOString() }
];

export class VillageDatabase {
  private data: DBData = {
    jenis_surat: [],
    pengajuan_surat: [],
    activity_logs: []
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Fallbacks
        if (!this.data.jenis_surat) this.data.jenis_surat = [];
        if (!this.data.pengajuan_surat) this.data.pengajuan_surat = [];
        if (!this.data.activity_logs) this.data.activity_logs = [];
      } else {
        this.data = {
          jenis_surat: DEFAULT_JENIS_SURAT,
          pengajuan_surat: DEFAULT_PENGAJUAN,
          activity_logs: DEFAULT_LOGS
        };
        this.save();
      }
    } catch (error) {
      console.error('Error initializing village database:', error);
      // Fallback in-memory
      this.data = {
        jenis_surat: DEFAULT_JENIS_SURAT,
        pengajuan_surat: DEFAULT_PENGAJUAN,
        activity_logs: DEFAULT_LOGS
      };
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  // --- CRUD Jenis Surat ---
  getJenisSuratList(): JenisSurat[] {
    return this.data.jenis_surat;
  }

  getJenisSuratById(id: string): JenisSurat | undefined {
    return this.data.jenis_surat.find(item => item.id === id);
  }

  createJenisSurat(input: Omit<JenisSurat, 'id' | 'created_at' | 'updated_at'>): JenisSurat {
    const id = 'js-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newRecord: JenisSurat = {
      ...input,
      id,
      created_at: now,
      updated_at: now
    };
    this.data.jenis_surat.push(newRecord);
    this.addLog('CREATE_TEMPLATE', `Membuat jenis surat baru: ${newRecord.nama_surat} (${newRecord.kode_surat})`);
    this.save();
    return newRecord;
  }

  updateJenisSurat(id: string, input: Partial<Omit<JenisSurat, 'id' | 'created_at' | 'updated_at'>>): JenisSurat {
    const index = this.data.jenis_surat.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Jenis surat tidak ditemukan');
    }
    const record = this.data.jenis_surat[index];
    const updatedRecord: JenisSurat = {
      ...record,
      ...input,
      updated_at: new Date().toISOString()
    };
    this.data.jenis_surat[index] = updatedRecord;
    this.addLog('UPDATE_TEMPLATE', `Mengubah konfigurasi jenis surat: ${updatedRecord.nama_surat}`);
    this.save();
    return updatedRecord;
  }

  deleteJenisSurat(id: string) {
    const index = this.data.jenis_surat.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Jenis surat tidak ditemukan');
    }
    const name = this.data.jenis_surat[index].nama_surat;
    this.data.jenis_surat.splice(index, 1);
    this.addLog('DELETE_TEMPLATE', `Menghapus jenis surat: ${name}`);
    this.save();
  }

  // --- CRUD Pengajuan Surat ---
  getPengajuanList(): PengajuanSurat[] {
    return this.data.pengajuan_surat;
  }

  getPengajuanById(id: string): PengajuanSurat | undefined {
    return this.data.pengajuan_surat.find(item => item.id === id);
  }

  createPengajuan(input: Omit<PengajuanSurat, 'id' | 'status' | 'created_at' | 'updated_at'>): PengajuanSurat {
    const id = 'req-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newRecord: PengajuanSurat = {
      ...input,
      id,
      status: 'pending',
      created_at: now,
      updated_at: now
    };
    this.data.pengajuan_surat.push(newRecord);
    this.addLog('SUBMIT_LETTER', `Warga ${newRecord.nama_lengkap} (NIK: ${newRecord.nik}) mengajukan permohonan surat`);
    this.save();
    return newRecord;
  }

  updatePengajuanStatus(id: string, status: PengajuanSurat['status'], notes?: string, operator?: string): PengajuanSurat {
    const index = this.data.pengajuan_surat.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Pengajuan tidak ditemukan');
    }
    const record = this.data.pengajuan_surat[index];
    const now = new Date().toISOString();
    
    let signed_at = record.signed_at;
    let signed_by = record.signed_by;
    let qr_code_data = record.qr_code_data;
    let barcode_data = record.barcode_data;

    if (status === 'selesai') {
      signed_at = now;
      signed_by = 'Kepala Desa Harapan Jaya (H. SULAEMAN, M.Si)';
      // Live verification URL inside our applet context
      qr_code_data = `${process.env.APP_URL || 'https://ai.studio/build'}/verify/${id}`;
      barcode_data = `HJ-${record.jenis_surat_id.toUpperCase().substring(0,3)}-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const updatedRecord: PengajuanSurat = {
      ...record,
      status,
      admin_notes: notes !== undefined ? notes : record.admin_notes,
      signed_at,
      signed_by,
      qr_code_data,
      barcode_data,
      updated_at: now
    };
    this.data.pengajuan_surat[index] = updatedRecord;

    let logAction = 'PROCESS_LETTER';
    if (status === 'selesai') logAction = 'COMPLETE_LETTER';
    if (status === 'ditolak') logAction = 'REJECT_LETTER';

    this.addLog(logAction, `Status pengajuan ${id} (${record.nama_lengkap}) diubah menjadi ${status.toUpperCase()}`, operator);
    this.save();
    return updatedRecord;
  }

  deletePengajuan(id: string, operator?: string) {
    const index = this.data.pengajuan_surat.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Pengajuan tidak ditemukan');
    }
    const name = this.data.pengajuan_surat[index].nama_lengkap;
    this.data.pengajuan_surat.splice(index, 1);
    this.addLog('DELETE_LETTER', `Menghapus pengajuan surat ${id} a.n ${name}`, operator);
    this.save();
  }

  // --- Logs ---
  getLogs(): ActivityLog[] {
    return this.data.activity_logs.slice().reverse(); // Show latest first
  }

  addLog(action: string, description: string, operator?: string) {
    const newLog: ActivityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      action,
      description,
      timestamp: new Date().toISOString(),
      operator
    };
    this.data.activity_logs.push(newLog);
    // Keep logs size bounded (e.g. max 500)
    if (this.data.activity_logs.length > 500) {
      this.data.activity_logs.shift();
    }
    this.save();
  }
}

export const db = new VillageDatabase();
