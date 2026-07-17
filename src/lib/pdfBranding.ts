import type jsPDF from 'jspdf';
import defaultBrandLogoUrl from '@/assets/neovale-brand-logo.png';


/**
 * Paleta oficial Neovale (manual de marca)
 * Amarelo principal: #FFDA45
 * Azul-escuro:       #1B1E2C
 */
export const BRAND = {
  yellow: [255, 218, 69] as [number, number, number],   // #FFDA45
  navy:   [27, 30, 44]   as [number, number, number],   // #1B1E2C
  navySoft: [60, 60, 60] as [number, number, number],   // texto suave
  bgSoft: [255, 249, 220] as [number, number, number],  // amarelo claro p/ blocos
  border: [200, 200, 200] as [number, number, number],
  muted:  [120, 120, 120] as [number, number, number],
  red:    [220, 38, 38]   as [number, number, number],
} as const;

export const BRAND_NAME = 'Neovale';
export const BRAND_FULL_NAME = 'Neovale - Gestão Acadêmica';

interface BrandedHeaderOptions {
  /** Eyebrow (linha pequena no topo, ex: "NEOVALE · RELATÓRIO"). Default automático. */
  eyebrow?: string;
  /** Título grande (ex: "Relatório de Professores"). */
  title?: string;
  /** Frase de efeito em itálico (ex: "Onde o talento encontra a oportunidade certa."). */
  tagline?: string;
  /** Texto pequeno no canto direito (ex: "Documento Oficial"). */
  subtitle?: string;
  /** Data de emissão (default: now). */
  emittedAt?: Date;
  /** Altura da faixa em mm (default: 36mm para variante navy). */
  height?: number;
  /** Logo da organização (PNG/JPG dataURL). Quadrado/símbolo — usado no fallback. */
  logoDataUrl?: string | null;
  /** Logo completa com dimensões — preferida; permite renderizar a horizontal corretamente. */
  logo?: BrandLogo | null;
  /** Variante visual. 'navy' = padrão Neovale (oficial); 'yellow' = legado. */
  variant?: 'yellow' | 'navy';
}

/**
 * Desenha o cabeçalho oficial Neovale no topo do PDF.
 *
 * Visual unificado em todos os relatórios do sistema:
 *  - Faixa azul-marinho (#1B1E2C) com barras amarelas diagonais decorativas no canto.
 *  - Logo da organização em "tile" branco com brilho amarelo.
 *  - Eyebrow em amarelo (NEOVALE · …).
 *  - Título em branco, negrito.
 *  - Tagline em itálico (frase de efeito).
 *  - Linha amarela de acento na base.
 *
 * Retorna o Y onde o conteúdo deve começar.
 */
export function drawBrandedHeader(doc: jsPDF, opts: BrandedHeaderOptions = {}): number {
  const pw = doc.internal.pageSize.getWidth();
  const variant = opts.variant ?? 'navy';
  const h = opts.height ?? (variant === 'navy' ? 36 : 26);
  const margin = 14;
  const emittedAt = opts.emittedAt ?? new Date();

  // ---------- Variante legada (amarela) — mantida p/ compatibilidade ----------
  if (variant === 'yellow') {
    doc.setFillColor(...BRAND.yellow);
    doc.rect(0, 0, pw, h, 'F');
    doc.setFillColor(...BRAND.navy);
    doc.rect(0, h, pw, 0.8, 'F');

    let textX = margin;
    if (opts.logoDataUrl) {
      try {
        const logoH = h - 8;
        const fmt = opts.logoDataUrl.startsWith('data:image/jpeg') || opts.logoDataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(opts.logoDataUrl, fmt, margin, 4, logoH, logoH, undefined, 'FAST');
        textX = margin + logoH + 4;
      } catch { /* noop */ }
    }
    doc.setTextColor(...BRAND.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(BRAND_FULL_NAME, textX, 11);
    if (opts.title) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(opts.title.toUpperCase(), textX, 18);
    }
    doc.setFontSize(8);
    doc.text(`Emitido em: ${emittedAt.toLocaleString('pt-BR')}`, pw - margin, 11, { align: 'right' });
    if (opts.subtitle) doc.text(opts.subtitle, pw - margin, 18, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    return h + 8;
  }

  // ---------- Cabeçalho NAVY oficial (padrão de todos os relatórios) ----------

  // 1) Fundo navy
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, pw, h, 'F');

  // 2) Glow amarelo discreto (halo no canto inferior direito) — clipado pela faixa
  drawGlow(doc, pw - 18, h - 2, [
    { r: 14, color: [42, 40, 30] },
    { r: 9,  color: [70, 60, 24] },
    { r: 5,  color: [120, 100, 28] },
  ]);

  // 3) Barras amarelas diagonais no canto superior direito (assinatura visual)
  drawDiagonalBars(doc, pw - 26, 6, 3, 14, 1.2);

  // 4) Logo: se for horizontal (proporção wide), desenha em retângulo branco maior; senão em tile quadrado.
  const brandLogo: BrandLogo | null =
    opts.logo ??
    (opts.logoDataUrl ? { dataUrl: opts.logoDataUrl, width: 1, height: 1, isHorizontal: false } : null);

  let textX: number;
  let logoCenterY: number;

  if (brandLogo?.isHorizontal) {
    // Logotipo horizontal (ex.: 800x200 = 4:1) renderizado em placa branca arredondada
    const plateH = 20;
    const plateW = Math.min(64, plateH * (brandLogo.width / brandLogo.height) + 8);
    const plateX = margin;
    const plateY = (h - plateH) / 2;
    // brilho amarelo
    doc.setFillColor(...BRAND.yellow);
    doc.roundedRect(plateX - 0.6, plateY - 0.6, plateW + 1.2, plateH + 1.2, 3, 3, 'F');
    // placa branca
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(plateX, plateY, plateW, plateH, 2.6, 2.6, 'F');
    try {
      const fmt = brandLogo.dataUrl.startsWith('data:image/jpeg') || brandLogo.dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
      const innerH = plateH - 4;
      const innerW = innerH * (brandLogo.width / brandLogo.height);
      const finalW = Math.min(innerW, plateW - 4);
      const finalH = finalW * (brandLogo.height / brandLogo.width);
      const imgX = plateX + (plateW - finalW) / 2;
      const imgY = plateY + (plateH - finalH) / 2;
      doc.addImage(brandLogo.dataUrl, fmt, imgX, imgY, finalW, finalH, undefined, 'FAST');
    } catch { /* noop */ }
    textX = plateX + plateW + 6;
    logoCenterY = plateY;
  } else {
    // Ícone/símbolo quadrado em tile
    const tileSize = 18;
    const tileX = margin;
    const tileY = (h - tileSize) / 2;
    doc.setFillColor(...BRAND.yellow);
    doc.roundedRect(tileX - 0.6, tileY - 0.6, tileSize + 1.2, tileSize + 1.2, 3, 3, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(tileX, tileY, tileSize, tileSize, 2.6, 2.6, 'F');
    if (brandLogo) {
      try {
        const fmt = brandLogo.dataUrl.startsWith('data:image/jpeg') || brandLogo.dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
        const inner = tileSize - 3;
        // Preserva proporção (contain) para não ficar minúsculo nem esticado
        const ratio = brandLogo.width / brandLogo.height;
        let finalW = inner;
        let finalH = inner;
        if (ratio > 1) {
          finalH = inner / ratio;
        } else if (ratio < 1) {
          finalW = inner * ratio;
        }
        const imgX = tileX + (tileSize - finalW) / 2;
        const imgY = tileY + (tileSize - finalH) / 2;
        doc.addImage(brandLogo.dataUrl, fmt, imgX, imgY, finalW, finalH, undefined, 'FAST');
      } catch { /* noop */ }
    } else {
      doc.setTextColor(...BRAND.yellow);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('N', tileX + tileSize / 2, tileY + tileSize / 2 + 2.5, { align: 'center' });
    }
    textX = tileX + tileSize + 6;
    logoCenterY = tileY;
  }

  // 5) Eyebrow (linha pequena, amarela, espaçada)
  doc.setTextColor(...BRAND.yellow);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setCharSpace(0.6);
  const eyebrow = (opts.eyebrow ?? `${BRAND_NAME.toUpperCase()} · GESTÃO ACADÊMICA`).toUpperCase();
  doc.text(eyebrow, textX, logoCenterY + 3.5);
  doc.setCharSpace(0);

  // 6) Título grande em branco
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  const title = opts.title ?? BRAND_FULL_NAME;
  doc.text(title, textX, logoCenterY + 11);

  // 7) Tagline em itálico (frase de efeito)
  if (opts.tagline) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(200, 200, 210);
    doc.text(`"${opts.tagline}"`, textX, logoCenterY + 16.5);
  }

  // 8) Lado direito: data de emissão + subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(170, 170, 180);
  doc.setCharSpace(0.4);
  doc.text('EMITIDO EM', pw - margin - 30, logoCenterY + 4);
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(emittedAt.toLocaleString('pt-BR'), pw - margin - 30, logoCenterY + 9);
  if (opts.subtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 218, 69);
    doc.text(opts.subtitle, pw - margin - 30, logoCenterY + 14);
  }

  // 9) Linha amarela de acento na base (efeito "underline" do hero)
  doc.setFillColor(...BRAND.yellow);
  doc.rect(0, h - 0.8, pw, 0.8, 'F');

  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setCharSpace(0);

  return h + 8;
}

/** Desenha "barras diagonais" amarelas (assinatura visual Neovale) no canto. */
function drawDiagonalBars(doc: jsPDF, x: number, y: number, count: number, length: number, thickness: number): void {
  doc.setFillColor(...BRAND.yellow);
  // jsPDF não suporta rotação simples por shape; simulamos com pequenos retângulos deslocados.
  for (let i = 0; i < count; i++) {
    const offset = i * (thickness + 1.4);
    for (let s = 0; s < 7; s++) {
      const dx = s * 0.85;
      const dy = -s * 1.05;
      doc.rect(x + offset + dx, y + dy, thickness, length / 7, 'F');
    }
  }
}

/** Desenha um glow simulado (círculos concêntricos via cores escuras translúcidas). */
function drawGlow(doc: jsPDF, cx: number, cy: number, layers: Array<{ r: number; color: [number, number, number] }>): void {
  for (const l of layers) {
    doc.setFillColor(...l.color);
    doc.circle(cx, cy, l.r, 'F');
  }
}

export interface BrandLogo {
  dataUrl: string;
  width: number;
  height: number;
  /** true se for retangular wide (proporção >= 1.8). Indica logotipo horizontal. */
  isHorizontal: boolean;
}

/**
 * Carrega uma imagem (URL pública) e converte para data URL para uso no jsPDF.
 * Retorna também as dimensões originais p/ preservar proporção do logotipo.
 * Retorna null em caso de falha (CORS, 404, etc.).
 */
export async function loadLogoAsDataUrl(url: string | null | undefined): Promise<string | null> {
  const logo = await loadBrandLogo(url);
  return logo?.dataUrl ?? null;
}

export async function loadBrandLogo(url: string | null | undefined): Promise<BrandLogo | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;

    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    const w = dims?.w ?? 1;
    const h = dims?.h ?? 1;
    return { dataUrl, width: w, height: h, isHorizontal: w / h >= 1.8 };
  } catch {
    return null;
  }
}

/**
 * Resolve a melhor logo para usar no PDF: prioriza a horizontal (`logo_url`);
 * se indisponível, cai para o ícone (`icon_url`) e, por último, para a logo
 * oficial Neovale empacotada no bundle. Garante que TODOS os PDFs exibam a logo.
 */
export async function resolveBrandLogo(
  logoUrl?: string | null,
  iconUrl?: string | null,
): Promise<BrandLogo | null> {
  const horizontal = await loadBrandLogo(logoUrl);
  if (horizontal) return horizontal;
  const icon = await loadBrandLogo(iconUrl);
  if (icon) return icon;
  return await loadBrandLogo(defaultBrandLogoUrl);
}

/**
 * Desenha o rodapé padrão em todas as páginas do documento.
 */
export function drawBrandedFooter(doc: jsPDF, extraText?: string): void {
  const pageCount = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...BRAND.muted);
    const left = extraText ? `${extraText} — ${BRAND_NAME}` : BRAND_NAME;
    doc.text(left, pw / 2, ph - 6, { align: 'center' });
    doc.text(`Página ${i}/${pageCount}`, pw - 14, ph - 6, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  }
}

/** Estilos prontos p/ jspdf-autotable usando a paleta Neovale. */
export const brandTableStyles = {
  headStyles: {
    fillColor: BRAND.yellow,
    textColor: BRAND.navy,
    fontStyle: 'bold' as const,
  },
  styles: {
    lineColor: BRAND.border,
    lineWidth: 0.2,
  },
  alternateRowStyles: {
    fillColor: [255, 252, 235] as [number, number, number],
  },
};
