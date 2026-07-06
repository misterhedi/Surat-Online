export interface FieldConfig {
  name: string;
  type: 'text' | 'number' | 'textarea' | 'date' | 'select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface JenisSurat {
  id: string;
  nama_surat: string;
  kode_surat: string;
  template_content: string; // HTML/Markdown template with placeholders
  fields_config: FieldConfig[];
  created_at: string;
  updated_at: string;
}

export interface PengajuanSurat {
  id: string;
  jenis_surat_id: string;
  nik: string;
  nama_lengkap: string;
  alamat: string;
  no_whatsapp: string;
  data_surat: Record<string, string>;
  status: 'pending' | 'proses' | 'selesai' | 'ditolak';
  file_generated_path?: string;
  admin_notes?: string;
  signed_at?: string;
  signed_by?: string;
  qr_code_data?: string; // QR code text for verification
  barcode_data?: string; // Barcode value
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalPengajuan: number;
  totalPending: number;
  totalProses: number;
  totalSelesai: number;
  totalDitolak: number;
  pengajuanHariIni: number;
  perJenisSurat: Record<string, number>;
  monthlyTrends: { month: string; count: number }[];
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  operator?: string;
}
