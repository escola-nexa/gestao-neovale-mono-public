import { ORIENTATION_TYPE_LABELS, ORIENTATION_STATUS_LABELS, type Orientation } from '@/types/academic';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function generateOrientationPDF(
  orientation: Orientation,
  getProfessorName: (id: string) => string,
  getSchoolName: (id?: string) => string,
  getCourseName: (id?: string) => string,
  getOrientationDate: (o: Orientation) => Date,
  getOrientationTime: (o: Orientation) => string,
) {
  const professorName = getProfessorName(orientation.professor_id);
  const schoolName = getSchoolName(orientation.school_id);
  const courseName = getCourseName(orientation.course_id);
  const orientationDate = getOrientationDate(orientation);
  const orientationTime = getOrientationTime(orientation);
  const typeLabel = ORIENTATION_TYPE_LABELS[orientation.orientation_type as keyof typeof ORIENTATION_TYPE_LABELS] || orientation.orientation_type;
  const statusLabel = ORIENTATION_STATUS_LABELS[orientation.status as keyof typeof ORIENTATION_STATUS_LABELS] || orientation.status;

  let signatureImgHtml = '';
  if (orientation.signature_photo_url) {
    try {
      const response = await fetch(orientation.signature_photo_url);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
      signatureImgHtml = `<img src="${base64}" alt="Foto da Assinatura" style="max-width:300px;border-radius:8px;border:1px solid #ccc;" />`;
    } catch { signatureImgHtml = '<p style="color:#999;">Foto não disponível</p>'; }
  }

  const evidenceHtmlParts: string[] = [];
  if (orientation.evidence_urls && orientation.evidence_urls.length > 0) {
    for (let idx = 0; idx < orientation.evidence_urls.length; idx++) {
      const url = orientation.evidence_urls[idx];
      const lowerUrl = url.toLowerCase();
      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(lowerUrl) || lowerUrl.includes('image');
      const isVideo = /\.(mp4|mov|avi|mkv|webm|wmv|flv)(\?.*)?$/i.test(lowerUrl) || lowerUrl.includes('video');
      const isPdf = /\.pdf(\?.*)?$/i.test(lowerUrl);

      if (isImage) {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
          evidenceHtmlParts.push(`<div class="evidence-item"><p class="evidence-label">📷 Evidência ${idx + 1} - Imagem</p><img src="${base64}" alt="Evidência ${idx + 1}" style="max-width:100%;max-height:400px;border-radius:8px;border:1px solid #ddd;margin-top:4px;" /></div>`);
        } catch { evidenceHtmlParts.push(`<div class="evidence-item"><p class="evidence-label">📷 Evidência ${idx + 1} - Imagem (não foi possível carregar)</p></div>`); }
      } else if (isVideo) {
        const fileName = url.split('/').pop()?.split('?')[0] || `video_${idx + 1}`;
        evidenceHtmlParts.push(`<div class="evidence-item"><p class="evidence-label">🎥 Evidência ${idx + 1} - Vídeo</p><p style="font-size:13px;color:#555;margin:4px 0 0 0;">${fileName}</p></div>`);
      } else if (isPdf) {
        const fileName = url.split('/').pop()?.split('?')[0] || `documento_${idx + 1}.pdf`;
        evidenceHtmlParts.push(`<div class="evidence-item"><p class="evidence-label">📄 Evidência ${idx + 1} - PDF</p><p style="font-size:13px;color:#555;margin:4px 0 0 0;">${fileName}</p></div>`);
      } else {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          if (blob.type.startsWith('image/')) {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
            evidenceHtmlParts.push(`<div class="evidence-item"><p class="evidence-label">📷 Evidência ${idx + 1} - Imagem</p><img src="${base64}" alt="Evidência ${idx + 1}" style="max-width:100%;max-height:400px;border-radius:8px;border:1px solid #ddd;margin-top:4px;" /></div>`);
          } else {
            const fileName = url.split('/').pop()?.split('?')[0] || `arquivo_${idx + 1}`;
            evidenceHtmlParts.push(`<div class="evidence-item"><p class="evidence-label">📎 Evidência ${idx + 1}</p><p style="font-size:13px;color:#555;margin:4px 0 0 0;">${fileName}</p></div>`);
          }
        } catch {
          const fileName = url.split('/').pop()?.split('?')[0] || `arquivo_${idx + 1}`;
          evidenceHtmlParts.push(`<div class="evidence-item"><p class="evidence-label">📎 Evidência ${idx + 1}</p><p style="font-size:13px;color:#555;margin:4px 0 0 0;">${fileName}</p></div>`);
        }
      }
    }
  }

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orientação Pedagógica - ${professorName}</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;color:#333}h1{font-size:20px;border-bottom:2px solid #4338ca;padding-bottom:8px;color:#4338ca}h2{font-size:16px;margin-top:24px;color:#4338ca}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.info-item label{font-weight:bold;font-size:12px;color:#666;display:block;margin-bottom:2px}.info-item p{margin:0;font-size:14px}.section{margin:16px 0;padding:12px;background:#f8f9fa;border-radius:6px}.section-title{font-weight:bold;font-size:13px;color:#555;margin-bottom:6px}.section-content{font-size:14px;white-space:pre-wrap}.signature-box{margin-top:24px;padding:16px;border:2px solid #10b981;border-radius:8px;background:#ecfdf5}.signature-box h3{color:#059669;margin:0 0 12px 0;font-size:15px}.evidence-item{margin:12px 0;padding:12px;background:#f8f9fa;border-radius:6px;border:1px solid #e5e7eb}.evidence-label{font-weight:bold;font-size:13px;color:#555;margin:0}.footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:12px}.status-badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold}@media print{body{margin:20px}.evidence-item{break-inside:avoid}}</style>
    </head><body>
      <h1>📋 Orientação Pedagógica</h1>
      <div class="info-grid">
        <div class="info-item"><label>Professor</label><p>${professorName}</p></div>
        <div class="info-item"><label>Escola</label><p>${schoolName}</p></div>
        <div class="info-item"><label>Curso</label><p>${courseName}</p></div>
        <div class="info-item"><label>Tipo</label><p>${typeLabel}</p></div>
        <div class="info-item"><label>Status</label><p><span class="status-badge" style="background:#ecfdf5;color:#059669;">${statusLabel}</span></p></div>
        <div class="info-item"><label>Data Agendada</label><p>${format(orientationDate, 'dd/MM/yyyy', { locale: ptBR })}</p></div>
        <div class="info-item"><label>Horário</label><p>${orientationTime}</p></div>
      </div>
      ${orientation.scheduling_notes ? `<div class="section"><div class="section-title">Observações do Agendamento</div><div class="section-content">${orientation.scheduling_notes}</div></div>` : ''}
      ${orientation.description ? `<div class="section"><div class="section-title">Descrição da Orientação</div><div class="section-content">${orientation.description}</div></div>` : ''}
      ${evidenceHtmlParts.length > 0 ? `<h2>Evidências (${orientation.evidence_urls!.length})</h2>${evidenceHtmlParts.join('')}` : ''}
      ${orientation.status === 'ASSINADO_PROFESSOR' ? `
        <div class="signature-box"><h3>✅ Assinatura Digital do Professor</h3>
          <div class="info-grid">
            <div class="info-item"><label>Assinado por</label><p>${professorName}</p></div>
            <div class="info-item"><label>Data e Hora</label><p>${orientation.signed_at ? format(new Date(orientation.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) : '—'}</p></div>
          </div>
          ${signatureImgHtml ? `<div style="margin-top:12px;"><label style="font-weight:bold;font-size:12px;color:#666;display:block;margin-bottom:6px;">Foto da Assinatura</label>${signatureImgHtml}</div>` : ''}
        </div>` : ''}
      <div class="footer">Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — Neovale 1.0</div>
    </body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => printWindow.print(), 500); }
}
