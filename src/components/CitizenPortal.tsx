import React, { useState, useEffect } from 'react';
import { DocumentPreview } from './DocumentPreview';
import { JenisSurat, PengajuanSurat } from '../types';
import { FileText, Search, Sparkles, Send, CheckCircle2, ShieldAlert, UploadCloud, Info } from 'lucide-react';

export const CitizenPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ajukan' | 'lacak'>('ajukan');
  const [jenisSuratList, setJenisSuratList] = useState<JenisSurat[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<JenisSurat | null>(null);
  
  // Form values
  const [nik, setNik] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [dynamicFieldsData, setDynamicFieldsData] = useState<Record<string, string>>({});
  const [supportDoc, setSupportDoc] = useState<File | null>(null);
  
  // Tracking states
  const [trackNikOrId, setTrackNikOrId] = useState('');
  const [trackResults, setTrackResults] = useState<PengajuanSurat[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // General states
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ id: string; ticket: string; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [aiGeneratingField, setAiGeneratingField] = useState<string | null>(null);

  // Fetch active letter templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/jenis-surat');
      const data = await res.json();
      setJenisSuratList(data);
      if (data.length > 0) {
        setSelectedLetter(data[0]);
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Update dynamic fields when template changes
  useEffect(() => {
    if (selectedLetter) {
      const initial: Record<string, string> = {};
      selectedLetter.fields_config.forEach(field => {
        initial[field.name] = field.type === 'select' && field.options ? field.options[0] : '';
      });
      // Pre-fill default standard fields if citizen already entered them
      if (nik) initial['nik'] = nik;
      if (namaLengkap) initial['nama_pemohon'] = namaLengkap;
      if (alamat) initial['alamat'] = alamat;
      
      setDynamicFieldsData(initial);
    }
  }, [selectedLetter]);

  // Synchronize main fields with dynamic counterparts
  const handleBaseFieldChange = (field: 'nik' | 'nama' | 'alamat', val: string) => {
    if (field === 'nik') {
      setNik(val);
      setDynamicFieldsData(prev => ({ ...prev, nik: val }));
    } else if (field === 'nama') {
      setNamaLengkap(val);
      setDynamicFieldsData(prev => ({ ...prev, nama_pemohon: val }));
    } else if (field === 'alamat') {
      setAlamat(val);
      setDynamicFieldsData(prev => ({ ...prev, alamat: val }));
    }
  };

  // Trigger Gemini assistance to translate rough citizen notes into elegant government birocracy
  const handleAiAssist = async (fieldName: string, roughInput: string) => {
    if (!roughInput.trim()) {
      alert('Ketik dahulu keterangan kasar di kolom input sebelum menggunakan asisten AI');
      return;
    }

    setAiGeneratingField(fieldName);
    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: roughInput,
          context: {
            nama_pemohon: namaLengkap,
            jenis_surat: selectedLetter?.nama_surat
          }
        })
      });
      const data = await res.json();
      if (data.success && data.text) {
        setDynamicFieldsData(prev => ({ ...prev, [fieldName]: data.text }));
      }
    } catch (e) {
      console.error('Gemini API Error:', e);
    } finally {
      setAiGeneratingField(null);
    }
  };

  // Submit application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!selectedLetter) return;
    if (!nik || !namaLengkap || !alamat || !noWhatsapp) {
      setErrorMessage('Harap isi semua kolom identitas dasar Anda');
      return;
    }

    // Verify all required dynamic fields are filled
    let missingField = '';
    selectedLetter.fields_config.forEach(field => {
      if (field.required && !dynamicFieldsData[field.name]) {
        missingField = field.label;
      }
    });

    if (missingField) {
      setErrorMessage(`Kolom khusus "${missingField}" wajib diisi`);
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/submit-surat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis_surat_id: selectedLetter.id,
          nik,
          nama_lengkap: namaLengkap,
          alamat,
          no_whatsapp: noWhatsapp,
          data_surat: dynamicFieldsData
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMessage({
          id: result.data.id,
          ticket: result.data.id.toUpperCase(),
          message: `Pengajuan surat ${selectedLetter.nama_surat} Anda berhasil dikirimkan ke database pelayanan desa!`
        });
        
        // Reset form
        setNik('');
        setNamaLengkap('');
        setAlamat('');
        setNoWhatsapp('');
        setDynamicFieldsData({});
        setSupportDoc(null);
      } else {
        setErrorMessage(result.error || 'Terjadi kesalahan saat mengirim pengajuan');
      }
    } catch (e) {
      setErrorMessage('Koneksi terputus. Gagal menghubungi server desa.');
    } finally {
      setFormLoading(false);
    }
  };

  // Track status of an application
  const handleTrackStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackNikOrId.trim()) return;

    setTrackingLoading(true);
    setHasSearched(true);
    try {
      // Pull admin submissions and filter locally on citizen view for safety
      const res = await fetch(`/api/admin/pengajuan?search=${encodeURIComponent(trackNikOrId)}`);
      const data = await res.json();
      setTrackResults(data.submissions || []);
    } catch (e) {
      console.error('Error tracking status:', e);
    } finally {
      setTrackingLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'selesai':
        return <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-bold border border-green-200">Selesai (TTE Terbit)</span>;
      case 'proses':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold border border-blue-200 animate-pulse">Sedang Diverifikasi</span>;
      case 'ditolak':
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold border border-red-200">Ditolak</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold border border-amber-200">Menunggu Antrean</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-[#1C1A17]">
      {/* Tab Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#FAF9F5] p-1 rounded-md inline-flex border border-[#E5E1DA]">
          <button
            onClick={() => { setActiveTab('ajukan'); setSuccessMessage(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === 'ajukan' ? 'bg-[#1C1A17] text-white shadow-sm' : 'text-[#8C8170] hover:text-[#1C1A17]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Pengajuan Mandiri Baru
          </button>
          <button
            onClick={() => { setActiveTab('lacak'); setSuccessMessage(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === 'lacak' ? 'bg-[#1C1A17] text-white shadow-sm' : 'text-[#8C8170] hover:text-[#1C1A17]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Lacak Status & Unduh
          </button>
        </div>
      </div>

      {activeTab === 'ajukan' ? (
        successMessage ? (
          /* Success Screen */
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg border border-[#E5E1DA] shadow-sm text-center">
            <div className="w-14 h-14 bg-[#EAF2ED] border border-[#CDE1D5] rounded-md flex items-center justify-center mx-auto mb-6 text-[#3F5E4D]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif font-black text-[#1C1A17] mb-2">Permohonan Berhasil Dikirim!</h2>
            <p className="text-[#8C8170] mb-6 text-xs max-w-md mx-auto">
              Berkas Anda telah terdaftar di database administrasi Desa Harapan Jaya. Mohon simpan Kode Tiket di bawah untuk pelacakan berkas.
            </p>

            <div className="bg-[#FAF9F5] p-4 rounded-md border border-[#E5E1DA] max-w-sm mx-auto mb-8 font-mono">
              <span className="text-[10px] text-[#8C8170] block mb-1 uppercase tracking-wider">KODE TIKET PELACAKAN</span>
              <span className="text-lg font-black text-[#1C1A17] tracking-widest">{successMessage.ticket}</span>
            </div>

            {/* WA Notification Mock */}
            <div className="bg-[#FAF9F5] p-5 rounded-md border border-[#EAE6DF] text-left max-w-md mx-auto mb-8">
              <div className="flex items-center gap-2 text-[#8C8170] font-mono font-bold text-[10px] uppercase tracking-wider mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F5E4D] animate-ping"></span>
                <span>[SIMULASI] Notifikasi WhatsApp Sent!</span>
              </div>
              <p className="text-xs text-[#5C5549] leading-relaxed font-mono">
                💬 <strong>Ke:</strong> {noWhatsapp}<br />
                📨 <strong>Pesan:</strong> Pengajuan surat Anda berhasil didaftarkan dengan ID tiket <strong>{successMessage.id}</strong>. Anda akan menerima notifikasi otomatis jika Kepala Desa telah menerbitkan tanda tangan elektronik (TTE).
              </p>
            </div>

            <button
              onClick={() => setSuccessMessage(null)}
              className="bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono text-xs uppercase tracking-wider font-bold py-3 px-6 rounded-md transition shadow-sm cursor-pointer"
            >
              Buat Pengajuan Lain
            </button>
          </div>
        ) : (
          /* Submission Form + Preview side-by-side */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-[#E5E1DA] shadow-[0_2px_12px_rgba(28,26,23,0.02)]">
              <div className="border-b border-[#E5E1DA] pb-4 mb-6">
                <h2 className="text-lg font-serif font-bold text-[#1C1A17] flex items-center gap-2">
                  <FileText className="text-[#1C1A17] w-5 h-5" />
                  Formulir Layanan Mandiri Desa
                </h2>
                <p className="text-xs text-[#8C8170] mt-0.5">Pilih jenis pelayanan dan lengkapi data identitas Anda di bawah ini.</p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-[#FCF5F5] text-[#9E2A2B] text-xs rounded border border-[#F5E1E2] flex gap-2 items-start">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Select Letter Template */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-2 font-mono">Jenis Pelayanan Surat</label>
                  <select
                    className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-3 text-xs font-semibold text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                    value={selectedLetter?.id || ''}
                    onChange={(e) => {
                      const found = jenisSuratList.find(j => j.id === e.target.value);
                      if (found) setSelectedLetter(found);
                    }}
                  >
                    {jenisSuratList.map(j => (
                      <option key={j.id} value={j.id}>{j.nama_surat} ({j.kode_surat})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Identity Section */}
                <div className="space-y-4 pt-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#8C8170] block uppercase border-b border-[#E5E1DA] pb-1 font-mono">Identitas Kependudukan (KTP)</span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-1.5">Nomor Induk Kependudukan (NIK)</label>
                    <input
                      type="text"
                      className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition font-mono"
                      placeholder="Masukkan 16 digit NIK"
                      value={nik}
                      maxLength={16}
                      onChange={(e) => handleBaseFieldChange('nik', e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-1.5">Nama Lengkap Sesuai KTP</label>
                    <input
                      type="text"
                      className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                      placeholder="Nama lengkap pemohon"
                      value={namaLengkap}
                      onChange={(e) => handleBaseFieldChange('nama', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-1.5">Alamat Domisili Lengkap</label>
                    <textarea
                      rows={2}
                      className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                      placeholder="Contoh: Kp. Rawa Indah RT 02/03, Desa Harapan Jaya"
                      value={alamat}
                      onChange={(e) => handleBaseFieldChange('alamat', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-1.5">Nomor WhatsApp Aktif</label>
                    <input
                      type="tel"
                      className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition font-mono"
                      placeholder="Contoh: 081234567890 (Untuk notifikasi dokumen)"
                      value={noWhatsapp}
                      onChange={(e) => setNoWhatsapp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>

                {/* 3. Letter Specific Dynamic Fields */}
                {selectedLetter && selectedLetter.fields_config.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <span className="text-[10px] font-bold tracking-widest text-[#8C8170] block uppercase border-b border-[#E5E1DA] pb-1 font-mono">Persyaratan Khusus {selectedLetter.kode_surat}</span>
                    
                    {selectedLetter.fields_config.map(field => {
                      // Skip base fields since we already bound them above
                      if (['nik', 'nama_pemohon', 'alamat'].includes(field.name)) return null;

                      return (
                        <div key={field.name} className="relative">
                          <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-1.5">
                            {field.label} {field.required && <span className="text-[#9E2A2B]">*</span>}
                          </label>

                          {field.type === 'select' ? (
                            <select
                              className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                              value={dynamicFieldsData[field.name] || ''}
                              onChange={(e) => setDynamicFieldsData({ ...dynamicFieldsData, [field.name]: e.target.value })}
                            >
                              {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <div className="relative">
                              <textarea
                                rows={2}
                                className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] pr-20 focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                                placeholder={field.placeholder || `Ketikkan ${field.label}`}
                                value={dynamicFieldsData[field.name] || ''}
                                onChange={(e) => setDynamicFieldsData({ ...dynamicFieldsData, [field.name]: e.target.value })}
                                required={field.required}
                              />
                              {field.name === 'keperluan' && (
                                <button
                                  type="button"
                                  onClick={() => handleAiAssist(field.name, dynamicFieldsData[field.name] || '')}
                                  disabled={aiGeneratingField === field.name}
                                  className="absolute bottom-3 right-3 text-[#1C1A17] hover:text-white bg-[#FAF9F5] hover:bg-[#1C1A17] border border-[#E5E1DA] px-2 py-1 rounded text-[9px] font-mono tracking-wider uppercase transition cursor-pointer"
                                  title="Formulasikan keperluan dengan bahasa hukum yang rapi menggunakan Gemini AI"
                                >
                                  <Sparkles className="w-3 h-3 text-[#AF9F86] animate-pulse" />
                                  {aiGeneratingField === field.name ? 'Proses...' : 'Rapi AI'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type={field.type}
                                className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] pr-20 focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                                placeholder={field.placeholder || `Ketikkan ${field.label}`}
                                value={dynamicFieldsData[field.name] || ''}
                                onChange={(e) => setDynamicFieldsData({ ...dynamicFieldsData, [field.name]: e.target.value })}
                                required={field.required}
                              />
                              {field.name === 'keperluan' && (
                                <button
                                  type="button"
                                  onClick={() => handleAiAssist(field.name, dynamicFieldsData[field.name] || '')}
                                  disabled={aiGeneratingField === field.name}
                                  className="absolute right-3 top-[8px] text-[#1C1A17] hover:text-white bg-[#FAF9F5] hover:bg-[#1C1A17] border border-[#E5E1DA] px-2 py-1 rounded text-[9px] font-mono tracking-wider uppercase transition cursor-pointer"
                                  title="Rekomendasikan narasi formal"
                                >
                                  <Sparkles className="w-3 h-3 text-[#AF9F86] animate-pulse" />
                                  {aiGeneratingField === field.name ? 'Proses...' : 'Rapi AI'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Support Document Upload (Mock UI) */}
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-2 font-mono">Unggah Dokumen Pendukung (Opsional)</label>
                  <div className="border border-dashed border-[#8C8170]/40 rounded-md p-5 text-center hover:border-[#1C1A17] cursor-pointer transition relative bg-[#FAF9F5]">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                           setSupportDoc(e.target.files[0]);
                        }
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-[#8C8170] mx-auto mb-2" />
                    {supportDoc ? (
                      <div>
                        <span className="text-xs font-bold text-[#1C1A17] block truncate">{supportDoc.name}</span>
                        <span className="text-[10px] text-[#3F5E4D] font-mono font-bold block mt-0.5">SIAP DILAMPIRKAN ({(supportDoc.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-[#1C1A17] block">Tarik & lepas berkas, atau klik untuk memilih</span>
                        <span className="text-[9px] text-[#8C8170] font-mono block mt-1">Format PDF, JPG, PNG (Max 5MB)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono text-xs uppercase tracking-wider font-bold py-3.5 rounded-md shadow-sm transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {formLoading ? 'Memproses Berkas...' : 'Kirim Pengajuan Resmi'}
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-7 bg-[#FAF9F5] p-4 rounded-lg border border-[#E5E1DA] sticky top-24">
              <div className="flex items-center justify-between mb-4 px-2">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8C8170] font-mono">Pratinjau Real-Time</h3>
                  <p className="text-[10px] text-[#8C8170] mt-0.5">Dokumen diperbarui otomatis saat Anda mengisi kolom formulir.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E5E1DA] px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-wider text-[#1C1A17]">
                  <Info className="w-3.5 h-3.5 shrink-0 text-[#8C8170]" />
                  <span>Draf Layout Resmi</span>
                </div>
              </div>

              <DocumentPreview
                submission={{
                  status: 'pending',
                  data_surat: dynamicFieldsData
                }}
                template={selectedLetter || undefined}
              />
            </div>
          </div>
        )
      ) : (
        /* Status Tracker Tab */
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg border border-[#E5E1DA] shadow-sm mb-6">
            <h2 className="text-lg font-serif font-bold text-[#1C1A17] mb-1 flex items-center gap-2">
              <Search className="text-[#1C1A17] w-5 h-5" />
              Lacak Status Pelayanan Surat Desa
            </h2>
            <p className="text-xs text-[#8C8170] mb-6">Ketikkan NIK atau Kode Tiket (misal: req-xxxx) untuk memeriksa status pengajuan surat Anda.</p>

            <form onSubmit={handleTrackStatus} className="flex gap-3">
              <input
                type="text"
                placeholder="Masukkan NIK 16 digit atau Kode Tiket Pengajuan..."
                className="flex-1 bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-3 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition font-mono"
                value={trackNikOrId}
                onChange={(e) => setTrackNikOrId(e.target.value)}
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono text-xs uppercase tracking-wider font-bold px-6 py-3 rounded-md transition flex items-center gap-2 disabled:bg-[#FAF9F5] cursor-pointer"
              >
                {trackingLoading ? 'Mencari...' : 'Periksa'}
              </button>
            </form>
          </div>

          {hasSearched && (
            <div className="space-y-6">
              {trackResults.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-[#E5E1DA] shadow-sm">
                  <ShieldAlert className="w-12 h-12 text-[#8C8170] mx-auto mb-4" />
                  <p className="text-sm font-bold text-[#1C1A17]">Data Pengajuan Tidak Ditemukan</p>
                  <p className="text-xs text-[#8C8170] mt-1 font-mono">Pastikan NIK atau Kode Tiket Pelacakan yang dimasukkan sudah benar.</p>
                </div>
              ) : (
                trackResults.map(req => {
                  const letterType = jenisSuratList.find(j => j.id === req.jenis_surat_id);
                  return (
                    <div key={req.id} className="bg-white p-6 rounded-lg border border-[#E5E1DA] shadow-sm transition hover:shadow-md">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#E5E1DA] pb-4">
                        <div>
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="font-mono text-xs text-[#8C8170] uppercase tracking-widest">{req.id}</span>
                            {getStatusBadge(req.status)}
                          </div>
                          <h3 className="text-base font-serif font-bold text-[#1C1A17]">{letterType?.nama_surat || 'Pelayanan Surat'}</h3>
                          <p className="text-[11px] text-[#8C8170] font-mono mt-0.5">Diajukan pada: {new Date(req.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        
                        {req.status === 'selesai' && (
                          <div className="flex gap-2.5 no-print">
                            <a
                              href={`/api/admin/download/${req.id}/word`}
                              download
                              className="bg-[#FAF9F5] text-[#1C1A17] hover:bg-[#FAF9F5]/70 border border-[#E5E1DA] rounded-md text-xs font-mono font-bold px-4 py-2 transition flex items-center gap-1"
                            >
                              📥 Word (DOCX)
                            </a>
                            <a
                              href={`/api/admin/download/${req.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-[#1C1A17] text-white hover:bg-[#2D2A25] rounded-md text-xs font-mono font-bold px-4 py-2 transition shadow-sm flex items-center gap-1"
                            >
                              🖨️ Cetak / PDF
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Summary details */}
                        <div className="bg-[#FAF9F5] p-4 rounded-md border border-[#EAE6DF] space-y-3 text-xs text-[#1C1A17]">
                          <span className="text-[10px] font-bold tracking-wider text-[#8C8170] block uppercase font-mono">DETAIL PENGAJUAN</span>
                          <div className="flex justify-between border-b border-[#E5E1DA]/50 pb-1.5">
                            <span className="font-semibold text-[#8C8170]">Nama Pemohon</span>
                            <span className="font-bold text-[#1C1A17] uppercase">{req.nama_lengkap}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#E5E1DA]/50 pb-1.5">
                            <span className="font-semibold text-[#8C8170]">NIK</span>
                            <span className="font-mono text-[#1C1A17]">{req.nik}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#E5E1DA]/50 pb-1.5">
                            <span className="font-semibold text-[#8C8170]">No. WhatsApp</span>
                            <span className="text-[#1C1A17] font-mono">{req.no_whatsapp}</span>
                          </div>
                          {req.admin_notes && (
                            <div className="mt-2 p-3 bg-[#FAF9F5] rounded border border-[#E5DBCF] text-[#5C5549] text-xs">
                              <span className="font-bold block text-[10px] text-[#8C8170] uppercase font-mono mb-1">Catatan Administrator Desa:</span>
                              {req.admin_notes}
                            </div>
                          )}
                        </div>

                        {/* Mini preview */}
                        <div>
                          <span className="text-[10px] font-bold tracking-wider text-[#8C8170] block mb-2 uppercase font-mono">PRATINJAU FORMAT RESMI</span>
                          <div className="h-64 overflow-auto border border-[#E5E1DA] rounded-md bg-[#FAF9F5] p-4 scale-95 origin-top transition-transform hover:scale-100">
                            <DocumentPreview submission={req} template={letterType} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default CitizenPortal;
