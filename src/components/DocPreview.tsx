import React from 'react';
import { Printer } from 'lucide-react';
import { PengajuanSurat, JenisSurat } from '../types';

interface DocPreviewProps {
  submission: Partial<PengajuanSurat>;
  template: JenisSurat | undefined;
  previewHtml?: string; // Optional pre-rendered HTML from server
}

export const DocPreview: React.FC<DocPreviewProps> = ({ submission, template, previewHtml }) => {
  // Local fallback parser if previewHtml is not provided yet (for real-time typing preview)
  const renderLocalHtml = () => {
    if (!template) return '<p class="text-gray-400 italic text-center py-12">Pilih jenis surat untuk melihat pratinjau</p>';
    
    let html = template.template_content;
    const data = submission.data_surat || {};

    // 1. Replace form fields
    template.fields_config.forEach(field => {
      const val = data[field.name] || `[Isi ${field.label}]`;
      const regex = new RegExp(`{{${field.name}}}`, 'g');
      html = html.replace(regex, `<span class="border-b border-gray-300 px-1 font-semibold text-gray-900">${val}</span>`);
    });

    // 2. Extra system placeholders
    const nomorSurat = submission.id ? submission.id.toUpperCase().replace('REQ-', '') : 'XXX';
    html = html.replace(/{{nomor_surat}}/g, nomorSurat);
    html = html.replace(/{{tanggal_sekarang}}/g, new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }));

    // 3. Render QR Code Representation
    const qrPlaceholder = submission.status === 'selesai' 
      ? `<div class="w-16 h-16 bg-[#FAF9F5] border border-[#E5E1DA] flex items-center justify-center text-[7px] text-[#1C1A17] font-mono font-bold text-center mx-auto">QR CODES VERIFIED</div>`
      : `<div class="border border-dashed border-[#8C8170]/40 text-[#8C8170] p-1 text-[7px] rounded uppercase font-mono text-center mx-auto">DRAF DOKUMEN</div>`;
    html = html.replace(/{{%qrcode}}/g, qrPlaceholder);

    // 4. Render TTE Signature Block
    const ttePlaceholder = submission.status === 'selesai'
      ? `
        <div style="border: 2px double #3F5E4D; background-color: #EAF2ED; color: #3F5E4D; padding: 6px 12px; border-radius: 2px; display: inline-block; font-family: monospace; text-align: center; line-height: 1.1; margin: 0 auto; max-width: 170px;">
          <span style="font-size: 7px; font-weight: bold; display: block; letter-spacing: 0.5px;">DESA HARAPAN JAYA</span>
          <span style="font-size: 8px; font-weight: bold; display: block; border-top: 1px solid #3F5E4D; margin-top: 2px; padding-top: 2px; color: #344E3F;">TTE TERVERIFIKASI BSrE</span>
          <span style="font-size: 6px; opacity: 0.8; display: block; margin-top: 1px;">REF: HJ-${nomorSurat}</span>
        </div>
      `
      : submission.status === 'ditolak'
      ? `
        <div style="border: 2px solid #9E2A2B; background-color: #FCF5F5; color: #9E2A2B; padding: 4px 8px; border-radius: 2px; display: inline-block; font-family: monospace; text-align: center; font-weight: bold; font-size: 8px; width: 150px; margin: 0 auto;">
          DITOLAK
        </div>
      `
      : `
        <div style="border: 1px dashed #8C8170; color: #8C8170; padding: 8px; text-align: center; font-size: 9px; font-style: italic; border-radius: 2px; width: 100%; max-width: 150px; margin: 0 auto;">
          MENUNGGU VERIFIKASI TTE
        </div>
      `;
    html = html.replace(/{{%ttd}}/g, ttePlaceholder);

    // 5. Clean up any other remaining unmatched braces
    html = html.replace(/{{[a-zA-Z0-9_]+}}/g, '...');

    return html;
  };

  const finalHtml = previewHtml || renderLocalHtml();

  return (
    <div className="relative bg-white shadow-inner rounded-md border border-[#E5E1DA] overflow-hidden">
      {/* Visual Status Tag and Actions on Preview Container */}
      <div className="absolute top-4 right-4 z-10 no-print flex items-center gap-2">
        <button
          onClick={() => window.print()}
          className="bg-white hover:bg-[#FAF9F5] text-[#1C1A17] border border-[#E5E1DA] rounded px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 transition cursor-pointer hover:border-[#1C1A17]"
          title="Cetak Dokumen Resmi (A4)"
        >
          <Printer className="w-3 h-3 text-[#8C8170]" />
          Cetak
        </button>

        {submission.status === 'selesai' && (
          <span className="bg-[#EAF2ED] text-[#3F5E4D] text-[9px] font-mono font-bold px-2.5 py-1.5 rounded border border-[#CDE1D5] shadow-sm flex items-center gap-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F5E4D] animate-pulse"></span>
            TTE Terbit
          </span>
        )}
        {submission.status === 'proses' && (
          <span className="bg-[#EDF2F7] text-[#2D3748] text-[9px] font-mono font-bold px-2.5 py-1.5 rounded border border-[#D1DBE5] flex items-center gap-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D3748] animate-pulse"></span>
            Verifikasi
          </span>
        )}
        {submission.status === 'ditolak' && (
          <span className="bg-[#FCF5F5] text-[#9E2A2B] text-[9px] font-mono font-bold px-2.5 py-1.5 rounded border border-[#F5E1E2] uppercase tracking-wider">
            Ditolak
          </span>
        )}
        {(submission.status === 'pending' || !submission.status) && (
          <span className="bg-[#FDFBF7] text-[#8C8170] text-[9px] font-mono font-bold px-2.5 py-1.5 rounded border border-[#E5DBCF] flex items-center gap-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8C8170]"></span>
            Draf
          </span>
        )}
      </div>

      {/* Styled letter canvas */}
      <div className="overflow-auto max-h-[85vh] p-6 bg-[#FAF9F5] flex justify-center">
        <div 
          className="bg-white p-8 shadow-md border border-[#E5E1DA] rounded-sm w-full max-w-[650px] transition-all duration-300 hover:shadow-lg"
          style={{ minHeight: '800px' }}
          dangerouslySetInnerHTML={{ __html: finalHtml }}
          id="village-doc-canvas"
        />
      </div>
    </div>
  );
};
export default DocPreview;
