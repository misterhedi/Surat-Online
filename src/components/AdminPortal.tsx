import React, { useState, useEffect } from 'react';
import { DocumentPreview } from './DocumentPreview';
import { JenisSurat, PengajuanSurat, DashboardStats, ActivityLog, FieldConfig } from '../types';
import { 
  Users, CheckSquare, Clock, AlertTriangle, Play, Check, X, Trash2, 
  Search, Settings, MessageSquare, Download, Printer, Plus, Edit3, 
  XOctagon, FileCheck, Eye, LogOut, Database, RefreshCcw, Sparkles 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';

interface AdminPortalProps {
  onLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  const [submissions, setSubmissions] = useState<PengajuanSurat[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [templates, setTemplates] = useState<JenisSurat[]>([]);
  
  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Views
  const [activeSubTab, setActiveSubTab] = useState<'pendaftar' | 'template' | 'logs'>('pendaftar');
  
  // Selected Submission detail
  const [selectedSubmission, setSelectedSubmission] = useState<PengajuanSurat | null>(null);
  const [parsedPreviewHtml, setParsedPreviewHtml] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [waPreviewMessage, setWaPreviewMessage] = useState<string | null>(null);
  const [notifSending, setNotifSending] = useState(false);
  const [isAiGeneratingNotes, setIsAiGeneratingNotes] = useState(false);

  // Template CRUD States
  const [editingTemplate, setEditingTemplate] = useState<Partial<JenisSurat> | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // Load Admin Data
  const loadAdminData = async () => {
    try {
      const submissionsRes = await fetch(`/api/admin/pengajuan?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`);
      const subData = await submissionsRes.json();
      setSubmissions(subData.submissions || []);
      setStats(subData.stats || null);

      const templatesRes = await fetch('/api/jenis-surat');
      const templatesData = await templatesRes.json();
      setTemplates(templatesData);

      const logsRes = await fetch('/api/admin/logs');
      const logsData = await logsRes.json();
      setLogs(logsData);
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [statusFilter, searchQuery, activeSubTab]);

  // Handle detailed document pre-rendering when selection changes
  useEffect(() => {
    if (selectedSubmission) {
      setAdminNotes(selectedSubmission.admin_notes || '');
      setWaPreviewMessage(null);
      fetch(`/api/preview-surat/${selectedSubmission.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.html) {
            setParsedPreviewHtml(data.html);
          }
        })
        .catch(e => console.error('Error fetching preview html:', e));
    } else {
      setParsedPreviewHtml('');
    }
  }, [selectedSubmission]);

  // Action: Start processing (Pending -> Proses)
  const handleProcessSubmission = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pengajuan/${id}/process`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes, operator: 'malingpingpos@gmail.com' })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubmission(data.data);
        loadAdminData();
        alert('Status pengajuan diperbarui menjadi SEDANG DIPROSES');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Complete and sign with TTE/QR (Proses -> Selesai)
  const handleCompleteSubmission = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pengajuan/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes, operator: 'malingpingpos@gmail.com' })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubmission(data.data);
        loadAdminData();
        alert('Tanda Tangan Elektronik (TTE) resmi diterbitkan! Dokumen SELESAI');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Reject submission
  const handleRejectSubmission = async (id: string) => {
    if (!adminNotes.trim()) {
      alert('Tolong ketikkan alasan penolakan pada kolom "Catatan Admin" terlebih dahulu');
      return;
    }
    try {
      const res = await fetch(`/api/admin/pengajuan/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes, operator: 'malingpingpos@gmail.com' })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubmission(data.data);
        loadAdminData();
        alert('Pengajuan resmi ditolak');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Delete submission
  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengajuan ini secara permanen dari server?')) return;
    try {
      const res = await fetch(`/api/admin/pengajuan/${id}?operator=malingpingpos@gmail.com`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubmission(null);
        loadAdminData();
        alert('Pengajuan berhasil dihapus');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Simulated Send WhatsApp Notification
  const handleSendWaNotification = async (id: string) => {
    setNotifSending(true);
    try {
      const res = await fetch(`/api/admin/send-notification/${id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setWaPreviewMessage(data.message);
        loadAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNotifSending(false);
    }
  };

  // AI Assist: Auto-generate professional admin notes based on citizen request
  const handleAiNotesGeneration = async () => {
    if (!selectedSubmission) return;
    setIsAiGeneratingNotes(true);
    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Tolong buatkan catatan rekomendasi verifikasi admin desa yang ringkas, formal, dan profesional dalam bahasa Indonesia untuk pengajuan surat: "${selectedSubmission.nama_lengkap}". Dokumen ini berada dalam status "${selectedSubmission.status}".`,
          context: selectedSubmission
        })
      });
      const data = await res.json();
      if (data.success && data.text) {
        setAdminNotes(data.text);
      }
    } catch (e) {
      console.error('Error generating AI notes:', e);
    } finally {
      setIsAiGeneratingNotes(false);
    }
  };

  // --- CRUD template management ---
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const url = editingTemplate.id ? `/api/admin/jenis-surat/${editingTemplate.id}` : '/api/admin/jenis-surat';
    const method = editingTemplate.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate)
      });
      if (res.ok) {
        setEditingTemplate(null);
        setIsCreatingTemplate(false);
        loadAdminData();
        alert('Template dokumen berhasil disimpan');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Hapus template ini secara permanen? Semua pengajuan yang mengacu ke template ini mungkin tidak dapat dipratinjau.')) return;
    try {
      const res = await fetch(`/api/admin/jenis-surat/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadAdminData();
        alert('Template berhasil dihapus');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fields Helper for Custom Template Fields Config
  const handleAddFieldConfig = () => {
    if (!editingTemplate) return;
    const currentFields = editingTemplate.fields_config ? [...editingTemplate.fields_config] : [];
    const newField: FieldConfig = {
      name: `field_${Math.random().toString(36).substring(2, 6)}`,
      type: 'text',
      label: 'Nama Isian Baru',
      required: true,
      placeholder: ''
    };
    setEditingTemplate({
      ...editingTemplate,
      fields_config: [...currentFields, newField]
    });
  };

  const handleRemoveFieldConfig = (index: number) => {
    if (!editingTemplate || !editingTemplate.fields_config) return;
    const updated = [...editingTemplate.fields_config];
    updated.splice(index, 1);
    setEditingTemplate({ ...editingTemplate, fields_config: updated });
  };

  const handleFieldConfigValueChange = (index: number, key: keyof FieldConfig, value: any) => {
    if (!editingTemplate || !editingTemplate.fields_config) return;
    const updated = [...editingTemplate.fields_config];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    setEditingTemplate({ ...editingTemplate, fields_config: updated });
  };

  // Compute Recharts dataset for 'Jenis Surat Terpopuler'
  const getJenisSuratStatsData = () => {
    if (!stats || !stats.perJenisSurat) return [];
    return Object.entries(stats.perJenisSurat).map(([id, count]) => {
      const template = templates.find(t => t.id === id);
      const numericCount = typeof count === 'number' ? count : Number(count) || 0;
      return {
        id,
        name: template ? template.nama_surat : id,
        shortName: template ? template.kode_surat : id,
        count: numericCount
      };
    }).sort((a, b) => b.count - a.count);
  };

  const jenisSuratData = getJenisSuratStatsData();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-[#1C1A17]">
      {/* Header and Logged Operator */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E5E1DA] pb-6 mb-8">
        <div>
          <h1 className="text-xl font-serif font-black text-[#1C1A17] tracking-tight flex items-center gap-2">
            <Database className="text-[#1C1A17] w-5 h-5" />
            Sistem Administrasi Desa Harapan Jaya
          </h1>
          <p className="text-xs text-[#8C8170] mt-0.5">Operator aktif: <strong className="text-[#1C1A17] font-mono">malingpingpos@gmail.com</strong> (Kepala Desa / Pamong)</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            className="p-2.5 bg-[#FAF9F5] hover:bg-[#F4F1EA] text-[#1C1A17] rounded-md transition border border-[#E5E1DA] cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FCF5F5] text-[#9E2A2B] hover:bg-[#F5E1E2] border border-[#F5E1E2] rounded-md text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Panel
          </button>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-md border border-[#E5E1DA] shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F5] text-[#8C8170] border border-[#E5DBCF] rounded-md"><Users className="w-4 h-4" /></div>
            <div>
              <span className="text-[9px] font-bold text-[#8C8170] block uppercase font-mono">Total Masuk</span>
              <span className="text-xl font-serif font-black text-[#1C1A17]">{stats.totalPengajuan}</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-md border border-[#E5E1DA] shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F5] text-[#8C8170] border border-[#E5DBCF] rounded-md"><Clock className="w-4 h-4" /></div>
            <div>
              <span className="text-[9px] font-bold text-[#8C8170] block uppercase font-mono">Antrean</span>
              <span className="text-xl font-serif font-black text-[#1C1A17]">{stats.totalPending}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-[#E5E1DA] shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-[#1C1A17] text-white rounded-md"><Play className="w-4 h-4" /></div>
            <div>
              <span className="text-[9px] font-bold text-[#8C8170] block uppercase font-mono">Proses</span>
              <span className="text-xl font-serif font-black text-[#1C1A17]">{stats.totalProses}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-[#E5E1DA] shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-[#EAF2ED] text-[#3F5E4D] border border-[#CDE1D5] rounded-md"><FileCheck className="w-4 h-4" /></div>
            <div>
              <span className="text-[9px] font-bold text-[#8C8170] block uppercase font-mono">Selesai (TTE)</span>
              <span className="text-xl font-serif font-black text-[#1C1A17]">{stats.totalSelesai}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-[#E5E1DA] shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-[#FCF5F5] text-[#9E2A2B] border border-[#F5E1E2] rounded-md"><AlertTriangle className="w-4 h-4" /></div>
            <div>
              <span className="text-[9px] font-bold text-[#8C8170] block uppercase font-mono">Ditolak</span>
              <span className="text-xl font-serif font-black text-[#1C1A17]">{stats.totalDitolak}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-[#E5E1DA] shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF9F5] text-[#8C8170] border border-[#E5DBCF] rounded-md"><CheckSquare className="w-4 h-4" /></div>
            <div>
              <span className="text-[9px] font-bold text-[#8C8170] block uppercase font-mono">Hari Ini</span>
              <span className="text-xl font-serif font-black text-[#1C1A17]">{stats.pengajuanHariIni}</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sub Navigation */}
      <div className="flex border-b border-[#E5E1DA] mb-6 gap-1 no-print">
        <button
          onClick={() => { setActiveSubTab('pendaftar'); setSelectedSubmission(null); }}
          className={`px-4 py-2.5 font-bold font-mono text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'pendaftar' ? 'border-[#1C1A17] text-[#1C1A17]' : 'border-transparent text-[#8C8170] hover:text-[#1C1A17]'
          }`}
        >
          Daftar Pengajuan Warga
        </button>
        <button
          onClick={() => { setActiveSubTab('template'); setSelectedSubmission(null); }}
          className={`px-4 py-2.5 font-bold font-mono text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'template' ? 'border-[#1C1A17] text-[#1C1A17]' : 'border-transparent text-[#8C8170] hover:text-[#1C1A17]'
          }`}
        >
          Template Surat (CRUD)
        </button>
        <button
          onClick={() => { setActiveSubTab('logs'); setSelectedSubmission(null); }}
          className={`px-4 py-2.5 font-bold font-mono text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'logs' ? 'border-[#1C1A17] text-[#1C1A17]' : 'border-transparent text-[#8C8170] hover:text-[#1C1A17]'
          }`}
        >
          Log Aktivitas Pamong
        </button>
      </div>

      {activeSubTab === 'pendaftar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main List Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E1DA] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-[9px] w-3.5 h-3.5 text-[#8C8170]" />
                <input
                  type="text"
                  placeholder="Cari Nama / NIK..."
                  className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
                {['semua', 'pending', 'proses', 'selesai', 'ditolak'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
                      statusFilter === st 
                        ? 'bg-[#1C1A17] text-white shadow-sm' 
                        : 'bg-[#FAF9F5] text-[#8C8170] hover:bg-[#F4F1EA] border border-[#E5E1DA]'
                    }`}
                  >
                    {st === 'semua' ? 'Semua' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions list */}
            <div className="bg-white rounded-lg border border-[#E5E1DA] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F5] text-[#8C8170] border-b border-[#E5E1DA] font-mono font-bold uppercase text-[9px] tracking-wider">
                      <th className="p-4">Kode Tiket / Tgl</th>
                      <th className="p-4">Identitas Pemohon</th>
                      <th className="p-4">Jenis Layanan</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1DA] font-medium">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#8C8170] italic">
                          Tidak ada pengajuan surat yang cocok dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      submissions.map(sub => {
                        const lType = templates.find(t => t.id === sub.jenis_surat_id);
                        return (
                          <tr 
                            key={sub.id} 
                            onClick={() => setSelectedSubmission(sub)}
                            className={`hover:bg-[#FAF9F5]/40 cursor-pointer transition ${
                              selectedSubmission?.id === sub.id ? 'bg-[#FAF9F5]' : ''
                            }`}
                          >
                            <td className="p-4">
                              <span className="font-mono font-bold text-[#1C1A17] uppercase block">{sub.id}</span>
                              <span className="text-[10px] text-[#8C8170] block mt-0.5">
                                {new Date(sub.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="font-serif font-bold text-[#1C1A17] block uppercase">{sub.nama_lengkap}</span>
                              <span className="text-[10px] text-[#8C8170] font-mono block mt-0.5">{sub.nik}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-mono text-xs text-[#1C1A17] block">{lType?.kode_surat || 'SURAT'}</span>
                              <span className="text-[10px] text-[#8C8170] block mt-0.5 truncate max-w-[120px]">{lType?.nama_surat}</span>
                            </td>
                            <td className="p-4 text-center">
                              {sub.status === 'selesai' && <span className="bg-[#EAF2ED] text-[#3F5E4D] border border-[#CDE1D5] text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">Selesai</span>}
                              {sub.status === 'proses' && <span className="bg-[#EDF2F7] text-[#2D3748] border border-[#D1DBE5] text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase animate-pulse">Proses</span>}
                              {sub.status === 'ditolak' && <span className="bg-[#FCF5F5] text-[#9E2A2B] border border-[#F5E1E2] text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">Ditolak</span>}
                              {sub.status === 'pending' && <span className="bg-[#FDFBF7] text-[#8C8170] border border-[#E5DBCF] text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">Pending</span>}
                            </td>
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedSubmission(sub)}
                                  className="p-1.5 bg-[#FAF9F5] hover:bg-[#1C1A17] text-[#1C1A17] hover:text-white rounded border border-[#E5E1DA] transition cursor-pointer"
                                  title="Buka Berkas Kerja"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubmission(sub.id)}
                                  className="p-1.5 bg-[#FCF5F5] hover:bg-[#9E2A2B] text-[#9E2A2B] hover:text-white rounded border border-[#F5E1E2] transition cursor-pointer"
                                  title="Hapus Pengajuan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dynamic Charts & Summary Statistics with Recharts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: Total Pengajuan Trend */}
              <div className="bg-white p-6 rounded-lg border border-[#E5E1DA] shadow-sm flex flex-col">
                <h3 className="text-[10px] font-bold text-[#8C8170] uppercase tracking-widest mb-3 font-mono">Tren Volume Pengajuan</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.monthlyTrends}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1C1A17" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#1C1A17" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F4F1EA" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#8C8170" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dy={8}
                        fontFamily="monospace"
                      />
                      <YAxis 
                        stroke="#8C8170" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        dx={-8}
                        fontFamily="monospace"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1C1A17', 
                          border: 'none', 
                          borderRadius: '4px',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#8C8170' }}
                        itemStyle={{ color: '#FFFFFF' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        name="Pengajuan"
                        stroke="#1C1A17" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-[#8C8170] font-mono italic text-center mt-3">Jumlah pengajuan berkas resmi per bulan (2026)</p>
              </div>

              {/* Chart 2: Jenis Surat Terpopuler */}
              <div className="bg-white p-6 rounded-lg border border-[#E5E1DA] shadow-sm flex flex-col">
                <h3 className="text-[10px] font-bold text-[#8C8170] uppercase tracking-widest mb-3 font-mono">Jenis Surat Terpopuler</h3>
                <div className="h-48 w-full flex items-center justify-center">
                  {jenisSuratData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={jenisSuratData}
                        layout="vertical"
                        margin={{ top: 5, right: 15, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F4F1EA" horizontal={false} vertical={true} />
                        <XAxis 
                          type="number" 
                          stroke="#8C8170" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          fontFamily="monospace"
                        />
                        <YAxis 
                          type="category" 
                          dataKey="shortName" 
                          stroke="#1C1A17" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          width={60}
                          fontFamily="monospace"
                          fontWeight="bold"
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#1C1A17', 
                            border: 'none', 
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}
                          formatter={(value, name, props) => [value, props.payload.name]}
                        />
                        <Bar 
                          dataKey="count" 
                          name="Jumlah" 
                          fill="#8C8170" 
                          radius={[0, 4, 4, 0]}
                          maxBarSize={20}
                        >
                          {jenisSuratData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === 0 ? '#1C1A17' : index === 1 ? '#5C5549' : '#8C8170'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-[#8C8170] text-xs italic font-mono">
                      Belum ada data pengajuan surat bulan ini.
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-[#8C8170] font-mono italic text-center mt-3">Breakdown pengajuan berdasarkan klasifikasi jenis surat resmi</p>
              </div>
            </div>
          </div>

          {/* Side Workdesk: Verification and Letter Actions */}
          <div className="lg:col-span-5">
            {selectedSubmission ? (
              <div className="bg-white p-6 rounded-lg border border-[#E5E1DA] shadow-sm space-y-6 sticky top-24 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start border-b border-[#E5E1DA] pb-4">
                  <div>
                    <span className="text-[9px] font-mono bg-[#FAF9F5] text-[#8C8170] border border-[#E5E1DA] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{selectedSubmission.id}</span>
                    <h2 className="text-base font-serif font-black text-[#1C1A17] mt-1.5 uppercase">{selectedSubmission.nama_lengkap}</h2>
                    <p className="text-xs text-[#8C8170] font-mono mt-0.5">NIK: {selectedSubmission.nik}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedSubmission(null)}
                    className="p-1 hover:bg-[#FAF9F5] rounded text-[#8C8170] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Visual Status Stepper */}
                <div className="bg-white p-4 rounded-md border border-[#E5E1DA] space-y-3.5 shadow-sm">
                  <span className="text-[10px] font-bold tracking-wider text-[#8C8170] block uppercase font-mono">Tahapan Siklus Berkas</span>
                  
                  <div className="relative flex items-center justify-between mt-4 px-1">
                    {/* Line Behind */}
                    <div className="absolute left-6 right-6 top-3.5 -translate-y-1/2 h-0.5 bg-[#E5E1DA] z-0" />
                    
                    {/* Active colored line segment */}
                    {selectedSubmission.status !== 'ditolak' && (
                      <div 
                        className="absolute left-6 top-3.5 -translate-y-1/2 h-0.5 bg-[#3F5E4D] transition-all duration-500 z-0"
                        style={{ 
                          width: selectedSubmission.status === 'pending' ? '0%' : selectedSubmission.status === 'proses' ? '50%' : '100%' 
                        }}
                      />
                    )}

                    {selectedSubmission.status === 'ditolak' && (
                      <div 
                        className="absolute left-6 top-3.5 -translate-y-1/2 h-0.5 bg-[#9E2A2B] transition-all duration-500 z-0"
                        style={{ width: '50%' }}
                      />
                    )}

                    {[
                      { id: 'pending', label: 'Pending', desc: 'Draf Masuk' },
                      { id: 'verified', label: 'Verified', desc: 'Verifikasi' },
                      { id: 'signed', label: 'Signed', desc: 'TTE Terbit' },
                      { id: 'completed', label: 'Completed', desc: 'Selesai' }
                    ].map((step, idx) => {
                      let stepState: 'upcoming' | 'active' | 'completed' | 'rejected' = 'upcoming';
                      const currentStatus = selectedSubmission.status;

                      if (currentStatus === 'ditolak') {
                        if (idx === 0) stepState = 'completed';
                        else if (idx === 1) stepState = 'rejected';
                        else stepState = 'upcoming';
                      } else {
                        // pending status
                        if (currentStatus === 'pending') {
                          if (idx === 0) stepState = 'active';
                        } 
                        // proses status
                        else if (currentStatus === 'proses') {
                          if (idx === 0) stepState = 'completed';
                          else if (idx === 1) stepState = 'active';
                        } 
                        // selesai status
                        else if (currentStatus === 'selesai') {
                          stepState = 'completed';
                        }
                      }

                      return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                          {/* Stepper Bubble */}
                          <div 
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border transition-all duration-300 ${
                              stepState === 'completed' 
                                ? 'bg-[#3F5E4D] border-[#3F5E4D] text-white shadow-sm'
                                : stepState === 'active'
                                ? 'bg-[#1C1A17] border-[#1C1A17] text-white ring-4 ring-[#FAF9F5] shadow-md animate-pulse'
                                : stepState === 'rejected'
                                ? 'bg-[#9E2A2B] border-[#9E2A2B] text-white shadow-sm'
                                : 'bg-white border-[#E5E1DA] text-[#8C8170]'
                            }`}
                          >
                            {stepState === 'completed' ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : stepState === 'rejected' ? (
                              <X className="w-3.5 h-3.5" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          
                          {/* Labels below */}
                          <div className="text-center mt-2 px-1">
                            <span className={`block text-[8px] font-bold uppercase tracking-wider font-mono leading-none ${
                              stepState === 'completed' 
                                ? 'text-[#3F5E4D]' 
                                : stepState === 'active'
                                ? 'text-[#1C1A17]'
                                : stepState === 'rejected'
                                ? 'text-[#9E2A2B]'
                                : 'text-[#8C8170]'
                            }`}>
                              {step.label}
                            </span>
                            <span className="block text-[7px] text-[#8C8170] leading-none mt-1 whitespace-nowrap">
                              {step.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Workflow Controller */}
                <div className="bg-[#FAF9F5] p-4 rounded-md border border-[#E5E1DA] space-y-3.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#8C8170] block uppercase font-mono">Alur Kerja Berkas</span>
                  
                  {selectedSubmission.status === 'pending' && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#5C5549] leading-snug">Berkas baru diterima. Harap lakukan pengecekan data pemohon sebelum memulai verifikasi.</p>
                      <button
                        onClick={() => handleProcessSubmission(selectedSubmission.id)}
                        className="w-full bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono font-bold py-2.5 rounded text-xs tracking-wider uppercase transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Mulai Proses Verifikasi
                      </button>
                    </div>
                  )}

                  {selectedSubmission.status === 'proses' && (
                    <div className="space-y-3">
                      <p className="text-xs text-[#5C5549] leading-snug">Berkas sedang dalam tahap review. Anda dapat menerbitkan TTE (Tanda Tangan Elektronik) resmi atau menolak berkas.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRejectSubmission(selectedSubmission.id)}
                          className="bg-[#FCF5F5] text-[#9E2A2B] hover:bg-[#F5E1E2] border border-[#F5E1E2] font-mono font-bold py-2.5 rounded text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XOctagon className="w-3.5 h-3.5" />
                          Tolak Berkas
                        </button>
                        <button
                          onClick={() => handleCompleteSubmission(selectedSubmission.id)}
                          className="bg-[#3F5E4D] hover:bg-[#344E3F] text-white font-mono font-bold py-2.5 rounded text-xs transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Terbitkan TTE (Selesai)
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedSubmission.status === 'selesai' && (
                    <div className="p-3 bg-[#EAF2ED] border border-[#CDE1D5] text-[#3F5E4D] rounded-md text-xs space-y-2.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Check className="w-4 h-4" />
                        <span>Surat Telah Ditandatangani Elektronik (TTE)</span>
                      </div>
                      <p className="leading-relaxed opacity-90">Dokumen telah resmi ditandatangani digital oleh Kepala Desa. QR Code verifikasi kependudukan telah terbit.</p>
                      
                      <div className="flex gap-2 pt-1">
                        <a
                          href={`/api/admin/download/${selectedSubmission.id}/word`}
                          download
                          className="flex-1 bg-white hover:bg-[#FAF9F5] text-[#1C1A17] border border-[#E5E1DA] font-mono font-bold py-2 rounded text-center text-[10px] transition"
                        >
                          📥 Word (DOCX)
                        </a>
                        <a
                          href={`/api/admin/download/${selectedSubmission.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono font-bold py-2 rounded text-center text-[10px] transition"
                        >
                          🖨️ Cetak / PDF
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedSubmission.status === 'ditolak' && (
                    <div className="p-3 bg-[#FCF5F5] border border-[#F5E1E2] text-[#9E2A2B] rounded-md text-xs">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <XOctagon className="w-4 h-4" />
                        <span>Pengajuan Ditolak</span>
                      </div>
                      <p className="opacity-90">Pemohon akan menerima pemberitahuan penolakan beserta catatan koreksi berkas.</p>
                    </div>
                  )}
                </div>

                {/* Administration Note Block */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-[#8C8170] uppercase font-mono">Catatan Verifikasi Admin</label>
                    {selectedSubmission.status !== 'selesai' && selectedSubmission.status !== 'ditolak' && (
                      <button
                        type="button"
                        onClick={handleAiNotesGeneration}
                        disabled={isAiGeneratingNotes}
                        className="text-[#1C1A17] hover:text-white bg-[#FAF9F5] hover:bg-[#1C1A17] border border-[#E5E1DA] px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-[#AF9F86] animate-pulse" />
                        {isAiGeneratingNotes ? 'Merangkum...' : 'Draft dengan AI'}
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2.5}
                    placeholder="Masukkan catatan pendukung, nomor registrasi fisik, atau alasan jika pengajuan ditolak..."
                    className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2 text-xs focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                {/* Simulated Notification Sender */}
                <div className="bg-[#FAF9F5] p-4 rounded-md border border-[#E5E1DA] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold tracking-wider text-[#8C8170] block uppercase font-mono">Simulasi WhatsApp (Humas)</span>
                    <button
                      onClick={() => handleSendWaNotification(selectedSubmission.id)}
                      disabled={notifSending}
                      className="bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono font-bold px-3 py-1.5 rounded text-[9px] uppercase tracking-wider flex items-center gap-1 transition disabled:bg-slate-300 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      {notifSending ? 'Mengirim...' : 'Kirim WA'}
                    </button>
                  </div>
                  
                  {waPreviewMessage ? (
                    <div className="bg-white p-3 rounded border border-[#E5E1DA] font-mono text-[9px] text-[#5C5549] leading-relaxed max-h-32 overflow-y-auto">
                      {waPreviewMessage}
                    </div>
                  ) : (
                    <p className="text-[9px] text-[#8C8170] font-mono italic">Klik tombol "Kirim WA" di atas untuk mensimulasikan pengiriman pesan otomatis ke nomor HP pemohon ({selectedSubmission.no_whatsapp}).</p>
                  )}
                </div>

                {/* Real-time side document canvas */}
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-[#8C8170] block mb-2 uppercase font-mono">Pratinjau Layout Surat Terkait</span>
                  <div className="h-96 overflow-auto border border-[#E5E1DA] rounded-md bg-[#FAF9F5] p-2 scale-90 origin-top">
                    <DocumentPreview 
                      submission={selectedSubmission} 
                      template={templates.find(t => t.id === selectedSubmission.jenis_surat_id)}
                      previewHtml={parsedPreviewHtml} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#FAF9F5] border border-dashed border-[#8C8170]/40 rounded-lg p-8 text-center text-[#8C8170] sticky top-24 py-32">
                <FileCheck className="w-12 h-12 mx-auto text-[#8C8170]/60 mb-3" />
                <p className="text-sm font-serif font-bold text-[#1C1A17]">Pilih berkas dari tabel sebelah kiri</p>
                <p className="text-xs text-[#8C8170] mt-1.5 leading-relaxed max-w-xs mx-auto">Gunakan berkas kerja untuk memverifikasi data, menerbitkan TTE digital, mengunduh file, atau mengirim notifikasi.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'template' && (
        <div className="space-y-6">
          {/* Templates CRUD Controls */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1C1A17]">Manajemen Template Surat Resmi Desa</h2>
              <p className="text-xs text-[#8C8170] mt-0.5">Konfigurasikan judul surat, kerangka template surat resmi, dan parameter input dinamis.</p>
            </div>
            
            {!editingTemplate && (
              <button
                onClick={() => {
                  setEditingTemplate({
                    nama_surat: 'Surat Keterangan Baru',
                    kode_surat: 'SKB',
                    template_content: `<div class="p-8 bg-white text-black font-sans leading-relaxed" style="min-height: 800px; max-width: 650px; margin: 0 auto; border: 1px solid #ddd;">
  <div class="text-center border-b-4 border-double border-black pb-4 mb-6">
    <div class="text-xs uppercase tracking-wider font-bold">Pemerintah Kabupaten Serang</div>
    <div class="text-xl uppercase tracking-widest font-black text-gray-900 mt-1">Pemerintah Desa Harapan Jaya</div>
  </div>
  <div class="text-center mb-6">
    <h3 class="text-base uppercase tracking-wider font-bold underline">SURAT KETERANGAN BARU</h3>
    <p class="text-xs text-gray-800 mt-1">Nomor: 140/{{nomor_surat}}/DESA-HJ/2026</p>
  </div>
  <div class="text-xs text-justify space-y-4">
    <p>Yang menerangkan bahwa:</p>
    <p>Nama: {{nama_pemohon}}</p>
    <p>NIK: {{nik}}</p>
    <p>Alamat: {{alamat}}</p>
    <p>Keperluan: {{keperluan}}</p>
  </div>
  <div class="mt-12 flex justify-between items-start">
    <div>{{%qrcode}}</div>
    <div class="text-center w-56 text-xs">
      <p>Kades Harapan Jaya</p>
      <div class="my-3">{{%ttd}}</div>
      <p class="font-bold underline">H. SULAEMAN, M.Si</p>
    </div>
  </div>
</div>`,
                    fields_config: [
                      { name: 'nik', type: 'text', label: 'NIK Pemohon', required: true },
                      { name: 'nama_pemohon', type: 'text', label: 'Nama Lengkap', required: true },
                      { name: 'alamat', type: 'textarea', label: 'Alamat Domisili', required: true },
                      { name: 'keperluan', type: 'text', label: 'Keperluan', required: true }
                    ]
                  });
                  setIsCreatingTemplate(true);
                }}
                className="bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono text-xs uppercase tracking-wider font-bold py-2.5 px-4 rounded transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Template Baru
              </button>
            )}
          </div>

          {editingTemplate ? (
            /* Template Form Editor */
            <form onSubmit={handleSaveTemplate} className="bg-white p-6 rounded-lg border border-[#E5E1DA] shadow-sm space-y-6">
              <h3 className="text-xs font-mono font-bold text-[#1C1A17] uppercase tracking-wider pb-3 border-b border-[#E5E1DA]">
                {isCreatingTemplate ? 'Membuat Template Dokumen Baru' : 'Mengedit Konfigurasi Template'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C8170] uppercase font-mono mb-1.5">Nama Surat Resmi</label>
                    <input
                      type="text"
                      className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17]"
                      value={editingTemplate.nama_surat || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, nama_surat: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8C8170] uppercase font-mono mb-1.5">Kode Surat (Misal: SKU, SKD, SP-SKCK)</label>
                    <input
                      type="text"
                      className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17]"
                      value={editingTemplate.kode_surat || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, kode_surat: e.target.value })}
                      required
                    />
                  </div>

                  {/* Fields Config JSON Form Builder */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-[#8C8170] uppercase font-mono">Input Form Dinamis (Fields Config)</label>
                      <button
                        type="button"
                        onClick={handleAddFieldConfig}
                        className="text-[#1C1A17] bg-[#FAF9F5] hover:bg-[#1C1A17] hover:text-white border border-[#E5E1DA] font-mono font-bold px-2.5 py-1 rounded text-[9px] uppercase tracking-wider transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah Field
                      </button>
                    </div>

                    <div className="space-y-3 bg-[#FAF9F5] p-3 rounded-md border border-[#E5E1DA] max-h-80 overflow-y-auto">
                      {editingTemplate.fields_config?.map((field, index) => (
                        <div key={index} className="bg-white p-3 rounded-md border border-[#E5E1DA] space-y-2 relative shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldConfig(index)}
                            className="absolute top-2 right-2 text-[#9E2A2B] hover:text-white p-1 bg-[#FCF5F5] hover:bg-[#9E2A2B] border border-[#F5E1E2] rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[9px] font-mono text-[#8C8170] font-bold block mb-0.5">Label Form</span>
                              <input
                                type="text"
                                className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded px-2 py-1 text-xs"
                                value={field.label}
                                onChange={(e) => handleFieldConfigValueChange(index, 'label', e.target.value)}
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-[#8C8170] font-bold block mb-0.5">Variable Key</span>
                              <input
                                type="text"
                                className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded px-2 py-1 font-mono text-[10px]"
                                value={field.name}
                                onChange={(e) => handleFieldConfigValueChange(index, 'name', e.target.value.replace(/\s+/g, '_').toLowerCase())}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[9px] font-mono text-[#8C8170] font-bold block mb-0.5">Tipe Input</span>
                              <select
                                className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded px-2 py-1 text-xs"
                                value={field.type}
                                onChange={(e) => handleFieldConfigValueChange(index, 'type', e.target.value)}
                              >
                                <option value="text">Teks Singkat</option>
                                <option value="textarea">Teks Panjang</option>
                                <option value="select">Dropdown Opsi</option>
                                <option value="date">Tanggal</option>
                                <option value="number">Angka</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-[#8C8170] font-bold block mb-0.5">Opsi (Koma Separator)</span>
                              <input
                                type="text"
                                className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded px-2 py-1 text-xs text-[#1C1A17]"
                                disabled={field.type !== 'select'}
                                placeholder="Opsi A, Opsi B, Opsi C"
                                value={field.options?.join(', ') || ''}
                                onChange={(e) => handleFieldConfigValueChange(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Template Layout Editor */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-bold text-[#8C8170] uppercase font-mono">Kerangka Surat Resmi (HTML)</label>
                      <span className="text-[9px] text-[#8C8170] bg-[#FAF9F5] border border-[#E5E1DA] px-2 py-0.5 rounded font-mono">Gunakan {'{{variabel}}'}, {'{{%qrcode}}'}, {'{{%ttd}}'}</span>
                    </div>
                    <textarea
                      rows={18}
                      className="w-full bg-[#1C1A17] border border-[#2D2A25] text-[#FAF9F5] font-mono text-[10px] rounded-md p-4 focus:outline-none leading-relaxed"
                      value={editingTemplate.template_content || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, template_content: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E1DA]">
                <button
                  type="button"
                  onClick={() => { setEditingTemplate(null); setIsCreatingTemplate(false); }}
                  className="bg-[#FAF9F5] hover:bg-[#F4F1EA] text-[#1C1A17] border border-[#E5E1DA] font-mono text-xs uppercase tracking-wider font-bold py-2.5 px-4 rounded transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-mono text-xs uppercase tracking-wider font-bold py-2.5 px-5 rounded transition shadow-sm cursor-pointer"
                >
                  Simpan Template Dokumen
                </button>
              </div>
            </form>
          ) : (
            /* Templates Table */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-white p-5 rounded-lg border border-[#E5E1DA] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="font-mono text-[9px] bg-[#FAF9F5] border border-[#E5E1DA] px-2 py-0.5 rounded text-[#8C8170] font-bold tracking-wider uppercase">{tpl.kode_surat}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingTemplate(tpl)}
                          className="p-1 text-[#1C1A17] hover:bg-[#FAF9F5] rounded border border-[#E5E1DA] transition cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1 text-[#9E2A2B] hover:bg-[#FCF5F5] border border-[#F5E1E2] rounded transition cursor-pointer"
                          title="Hapus Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-serif font-bold text-[#1C1A17] text-sm mb-1.5">{tpl.nama_surat}</h3>
                    <p className="text-[10px] text-[#8C8170] font-mono mb-4">Terakhir diupdate: {new Date(tpl.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    
                    <div className="bg-[#FAF9F5] p-2.5 rounded border border-[#E5E1DA] text-[10px] text-[#5C5549] mb-4 space-y-1">
                      <span className="font-bold block uppercase tracking-wider text-[9px] text-[#8C8170] font-mono">Variabel Form Aktif:</span>
                      <div className="flex flex-wrap gap-1">
                        {tpl.fields_config.map(f => (
                          <span key={f.name} className="bg-white border border-[#E5E1DA] px-1.5 py-0.5 rounded font-mono text-[9px] text-[#1C1A17]">
                            {f.label} ({f.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingTemplate(tpl)}
                    className="w-full bg-[#FAF9F5] hover:bg-[#1C1A17] hover:text-white border border-[#E5E1DA] text-[#1C1A17] py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Buka Editor Desain
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-lg border border-[#E5E1DA] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E5E1DA] flex justify-between items-center bg-[#FAF9F5]">
            <div>
              <h2 className="text-sm font-serif font-bold text-[#1C1A17]">Log Pengawasan Mutu Pelayanan Desa (Audit Trails)</h2>
              <p className="text-[10px] text-[#8C8170] mt-0.5 font-mono">Arsip tidak terubah (immutable) mencatat semua aksi warga dan operator pamong desa.</p>
            </div>
            <span className="text-[9px] font-mono bg-white border border-[#E5E1DA] text-[#1C1A17] font-bold px-2 py-0.5 rounded">TOTAL AUDIT: {logs.length}</span>
          </div>
          
          <div className="divide-y divide-[#E5E1DA] max-h-[70vh] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="p-8 text-center text-[#8C8170] italic text-xs">Belum ada aktivitas yang terekam.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-4 flex gap-4 text-xs font-medium hover:bg-[#FAF9F5]/40 transition">
                  <span className="font-mono text-[#8C8170] text-[10px] whitespace-nowrap pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                        log.action.includes('COMPLETE') ? 'bg-[#EAF2ED] text-[#3F5E4D] border-[#CDE1D5]' :
                        log.action.includes('REJECT') ? 'bg-[#FCF5F5] text-[#9E2A2B] border-[#F5E1E2]' :
                        log.action.includes('SUBMIT') ? 'bg-[#EDF2F7] text-[#2D3748] border-[#D1DBE5]' :
                        log.action.includes('CREATE') ? 'bg-[#FDFBF7] text-[#8C8170] border-[#E5DBCF]' : 'bg-[#FAF9F5] text-[#8C8170] border-[#E5E1DA]'
                      }`}>
                        {log.action}
                      </span>
                      {log.operator && <span className="text-[10px] text-[#8C8170] italic">Oleh: {log.operator}</span>}
                    </div>
                    <p className="text-[#1C1A17] font-semibold">{log.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminPortal;
