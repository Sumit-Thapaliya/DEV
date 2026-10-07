/**
 * DEMO-ONLY PDF writer.
 *
 * The upload/generate/download UI needs a real file to hand back today, before
 * the Python ATS service exists, so this module writes a small, valid PDF
 * in-browser: A4, single column, base-14 Helvetica, plain selectable text.
 *
 * When the ATS service is connected it returns the finished PDF itself and
 * NOTHING in this file is needed any more — delete it and drop the import in
 * `ats-service.ts` (the only place it is used).
 */

export type ResumeBlockKind = 'entry' | 'bullet' | 'text';
export type ResumeAlign = 'left' | 'center' | 'right';

/** Styling a block can carry once it has been through the editor. */
export interface ResumeBlockStyle {
  bold?: boolean;
  italic?: boolean;
  /** Point size. Defaults: 10 for text/bullets, 10.5 for entry rows. */
  size?: number;
  align?: ResumeAlign;
}

export interface ResumeBlock {
  kind: ResumeBlockKind;
  text: string;
  style?: ResumeBlockStyle;
}

export interface ResumeSection {
  title: string;
  blocks: ResumeBlock[];
}

export interface ResumeDocument {
  name: string;
  headline: string;
  contacts: string[];
  sections: ResumeSection[];
}

const PAGE_W = 595; // A4, in points
const PAGE_H = 842;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Average glyph width per font size — good enough for honest line wrapping. */
const AVG_CHAR = 0.5;

function measure(text: string, size: number): number {
  return text.length * size * AVG_CHAR;
}

function wrap(text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (measure(candidate, size) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = words[index];
    }
  }
  lines.push(current);
  return lines;
}

/** PDF strings are ASCII-only: no embedded font, nothing to mis-encode. */
function escapePdfText(value: string): string {
  return value
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u00B7]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u20B9/g, 'Rs ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

interface Row {
  text: string;
  size: number;
  bold: boolean;
  italic: boolean;
  align: ResumeAlign;
  gapBefore: number;
  /** Draw a hairline under this row (section headings). */
  ruleAfter?: boolean;
  /** Where this row came from — the editor's page markers use these. */
  sectionIndex?: number;
  blockIndex?: number;
}

function rowsFor(document: ResumeDocument): Row[] {
  const rows: Row[] = [];
  const push = (row: Row) => rows.push({ ...row, text: escapePdfText(row.text) });

  push({ text: document.name, size: 17, bold: true, italic: false, align: 'center', gapBefore: 0 });
  if (document.headline) {
    push({
      text: document.headline,
      size: 10.5,
      bold: false,
      italic: false,
      align: 'center',
      gapBefore: 5,
    });
  }
  if (document.contacts.length) {
    push({
      text: document.contacts.join(' | '),
      size: 9.5,
      bold: false,
      italic: false,
      align: 'center',
      gapBefore: 3,
    });
  }

  document.sections.forEach((section, sectionIndex) => {
    push({
      text: section.title.toUpperCase(),
      size: 10.5,
      bold: true,
      italic: false,
      align: 'left',
      gapBefore: 14,
      ruleAfter: true,
    });

    section.blocks.forEach((block, blockIndex) => {
      const style = block.style ?? {};
      const isEntry = block.kind === 'entry';
      const size = style.size ?? (isEntry ? 10.5 : 10);
      const bold = style.bold ?? isEntry;
      const italic = style.italic ?? false;
      const align = style.align ?? 'left';

      const isBullet = block.kind === 'bullet';
      const prefix = isBullet ? '- ' : '';
      const width = CONTENT_W - (isBullet ? prefix.length * 5 : 0);
      const gap = isEntry ? 7 : isBullet ? 2 : 3;

      /* The editor stores soft breaks as newlines; each one starts a new row. */
      let firstRow = true;
      for (const segment of block.text.split('\n')) {
        for (const line of wrap(segment, size, width)) {
          push({
            text: firstRow && isBullet ? `${prefix}${line}` : line,
            size,
            bold,
            italic,
            align,
            gapBefore: firstRow ? gap : 0,
            sectionIndex,
            blockIndex,
          });
          firstRow = false;
        }
      }
    });
  });

  return rows;
}

/** A page after the first, and the block whose content starts it. */
export interface ResumePageBreak {
  /** 1-based page number. */
  page: number;
  sectionIndex: number;
  blockIndex: number;
  /**
   * True when the block itself began on the previous page and only continues
   * here (a long paragraph) — the editor words its marker differently then.
   */
  insideBlock: boolean;
}

/**
 * Row layout and pagination — the single source of truth for both the PDF and
 * the editor's page markers, so the two can never disagree.
 */
function layout(document: ResumeDocument): { pages: string[]; breaks: ResumePageBreak[] } {
  const pages: string[] = [];
  const breaks: ResumePageBreak[] = [];
  let ops: string[] = [];
  let y = PAGE_H - MARGIN;
  let previous: Row | null = null;
  /* A page can also begin with a section heading, which belongs to no block —
     the marker then attaches to that section's first line. */
  let pendingBreakPage: number | null = null;

  const flush = () => {
    pages.push(ops.join('\n'));
    ops = [];
    y = PAGE_H - MARGIN;
  };

  for (const row of rowsFor(document)) {
    const leading = row.size * 1.4;
    y -= row.gapBefore;
    if (y - leading < MARGIN) {
      /* Every page after the first starts with some row — record whose it is so
         the editor can put its marker on the right line. */
      const continues =
        previous !== null &&
        previous.sectionIndex === row.sectionIndex &&
        previous.blockIndex === row.blockIndex;
      flush();
      const startedPage = pages.length + 1; /* the page this row goes on */
      if (row.sectionIndex !== undefined && row.blockIndex !== undefined) {
        breaks.push({
          page: startedPage,
          sectionIndex: row.sectionIndex,
          blockIndex: row.blockIndex,
          insideBlock: continues,
        });
        pendingBreakPage = null;
      } else {
        pendingBreakPage = startedPage;
      }
    }

    /* The heading that opened the page was followed by its first line. */
    if (pendingBreakPage !== null && row.sectionIndex !== undefined && row.blockIndex !== undefined) {
      breaks.push({
        page: pendingBreakPage,
        sectionIndex: row.sectionIndex,
        blockIndex: row.blockIndex,
        insideBlock: false,
      });
      pendingBreakPage = null;
    }

    if (row.text) {
      const width = measure(row.text, row.size);
      const x =
        row.align === 'center'
          ? MARGIN + Math.max((CONTENT_W - width) / 2, 0)
          : row.align === 'right'
            ? MARGIN + Math.max(CONTENT_W - width, 0)
            : MARGIN;
      const font = row.bold ? (row.italic ? 'F4' : 'F2') : row.italic ? 'F3' : 'F1';
      ops.push(
        `BT /${font} ${row.size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(
          2,
        )} Tm (${row.text}) Tj ET`,
      );
      y -= leading;
    } else {
      y -= leading;
    }

    if (row.ruleAfter) {
      ops.push(`0.75 G 0.7 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_W - MARGIN} ${y.toFixed(2)} l S`);
      y -= 6;
    }

    previous = row;
  }

  flush();
  return { pages: pages.length ? pages : [''], breaks };
}

/**
 * Where the generated PDF breaks onto a new page, as `sectionIndex` +
 * `blockIndex` of the document's blocks. The editor draws its
 * "Page 2 starts here" markers from this, so a marker always matches the PDF.
 */
export function resumePageBreaks(document: ResumeDocument): ResumePageBreak[] {
  return layout(document).breaks;
}

/** " | " joined plain text — the most parser-proof export there is. */
export function resumePlainText(document: ResumeDocument): string {
  const lines: string[] = [document.name];
  if (document.headline) lines.push(document.headline);
  if (document.contacts.length) lines.push(document.contacts.join(' | '));
  for (const section of document.sections) {
    lines.push('', section.title.toUpperCase());
    for (const block of section.blocks) {
      lines.push(block.kind === 'bullet' ? `- ${block.text}` : block.text);
    }
  }
  return lines.join('\n').trim();
}

/** Builds the PDF bytes. Returns the blob plus the page count for the UI. */
export function resumePdf(document: ResumeDocument): { blob: Blob; pages: number } {
  const { pages } = layout(document);
  const pageIds = pages.map((_, index) => 3 + index * 2);
  /* Only declare the faces the document actually uses, so a resume without
     styling produces exactly the same file it did before the editor existed. */
  const usedFonts = new Set<string>();
  for (const content of pages) {
    for (const match of content.matchAll(/BT \/(F[1-4])/g)) usedFonts.add(match[1]);
  }
  if (!usedFonts.size) usedFonts.add('F1');

  const fontIds: Record<string, number> = {};
  let nextFontId = 3 + pages.length * 2;
  for (const key of ['F1', 'F2', 'F3', 'F4']) {
    if (usedFonts.has(key)) {
      fontIds[key] = nextFontId;
      nextFontId += 1;
    }
  }
  const fontResources = Object.entries(fontIds)
    .map(([key, id]) => `/${key} ${id} 0 R`)
    .join(' ');

  const objects: Array<{ id: number; body: string }> = [
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    {
      id: 2,
      body: `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(' ')}] >>`,
    },
  ];

  pages.forEach((content, index) => {
    const pageId = pageIds[index];
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << ${fontResources} >> >> /Contents ${
        pageId + 1
      } 0 R >>`,
    });
    objects.push({
      id: pageId + 1,
      body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    });
  });

  const FONT_FACES: Record<string, string> = {
    F1: 'Helvetica',
    F2: 'Helvetica-Bold',
    F3: 'Helvetica-Oblique',
    F4: 'Helvetica-BoldOblique',
  };
  for (const [key, id] of Object.entries(fontIds)) {
    objects.push({
      id,
      body: `<< /Type /Font /Subtype /Type1 /BaseFont ${FONT_FACES[key]} /Encoding /WinAnsiEncoding >>`,
    });
  }

  objects.sort((a, b) => a.id - b.id);

  const encoder = new TextEncoder();
  const bytes = (value: string) => encoder.encode(value).length;

  let pdf = '%PDF-1.4\n';
  const offsets: Record<number, number> = {};
  for (const object of objects) {
    offsets[object.id] = bytes(pdf);
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }

  const startxref = bytes(pdf);
  const size = objects.length + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const object of objects) {
    xref += `${String(offsets[object.id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `${xref}trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return { blob: new Blob([pdf], { type: 'application/pdf' }), pages: pages.length };
}

/* ========================================================================== */
/*  Canvas model — the free-placement page the Canva-style editor works on.   */
/*  Reconstructed to match resume-editor.tsx / edit-draft.ts usage exactly.   */
/* ========================================================================== */

export type CanvasFont = 'helvetica' | 'times' | 'courier';

export interface CanvasTextStyle {
  /** Point size. */
  size: number;
  font?: CanvasFont;
  /** '#rrggbb'; defaults to black where unset. */
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: ResumeAlign;
  /** Multiplier of the point size; defaults to 1.35. */
  lineHeight?: number;
}

interface CanvasObjectBase {
  /** Editor-assigned id; stripped again when the document is saved. */
  id?: string;
  /** Optional human label shown in the editor's layer list. */
  name?: string;
  locked?: boolean;
  /** Degrees, clockwise; the PDF writer applies it around the object box. */
  rotation?: number;
  /** Kept in the document but not drawn or printed. */
  hidden?: boolean;
  /** 0..1; defaults to 1. */
  opacity?: number;
  x: number;
  y: number;
  w: number;
}

export interface CanvasTextObject extends CanvasObjectBase {
  type: 'text';
  text: string;
  style: CanvasTextStyle;
}

export interface CanvasImageObject extends CanvasObjectBase {
  type: 'image';
  h: number;
  assetId: string;
}

export interface CanvasRectObject extends CanvasObjectBase {
  type: 'rect';
  h: number;
  fill?: string;
  stroke?: string;
  /** Stroke width in points when `stroke` is set. */
  thickness?: number;
  /** Rounded corners, in points. */
  radius?: number;
}

export interface CanvasLineObject extends CanvasObjectBase {
  type: 'line';
  thickness?: number;
  color?: string;
}

export interface CanvasShapeObject extends CanvasObjectBase {
  type: 'shape';
  kind: string;
  thickness?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  /** Corner roundness for box-like shapes, in points. */
  radius?: number;
}

export type CanvasObject =
  | CanvasTextObject
  | CanvasImageObject
  | CanvasRectObject
  | CanvasLineObject
  | CanvasShapeObject;

export interface CanvasAsset {
  /** Data URL; JPEG assets embed straight into the PDF. */
  src: string;
  pxW?: number;
  pxH?: number;
}

export interface CanvasPage {
  /** '#rrggbb' sheet colour. */
  background?: string;
  objects: CanvasObject[];
}

export interface CanvasDocument {
  pages: CanvasPage[];
  assets: Record<string, CanvasAsset>;
}

export const RESUME_PAGE = { width: PAGE_W, height: PAGE_H, margin: MARGIN };
export const RESUME_CONTENT = { width: CONTENT_W, height: PAGE_H - MARGIN * 2 };

const CANVAS_FONT_FACTOR: Record<CanvasFont, number> = {
  helvetica: 0.5,
  times: 0.47,
  courier: 0.6,
};

export function fontStack(font?: CanvasFont): string {
  if (font === 'times') return '"Times New Roman", Times, serif';
  if (font === 'courier') return '"Courier New", Courier, monospace';
  return 'Helvetica, Arial, sans-serif';
}

export function parseColor(color?: string | null): { r: number; g: number; b: number } | null {
  if (!color) return null;
  let hex = color.trim();
  if (!hex.startsWith('#')) return null;
  hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split('').map((char) => char + char).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

/** Average-glyph width model, shared by wrapping and the PDF writer so the
 *  on-screen wrap and the printed wrap agree. */
export function canvasTextWidth(text: string, style: CanvasTextStyle): number {
  const size = style.size ?? 11;
  const factor = CANVAS_FONT_FACTOR[style.font ?? 'helvetica'] ?? 0.5;
  return String(text ?? '').length * size * factor * (style.bold ? 1.06 : 1);
}

export function wrapCanvasText(text: string, style: CanvasTextStyle, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text ?? '').split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && canvasTextWidth(trial, style) > width) {
        lines.push(current);
        current = word;
      } else {
        current = trial;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [''];
}

export function canvasLineHeight(style: CanvasTextStyle): number {
  return (style.size ?? 11) * (style.lineHeight ?? 1.35);
}

export function canvasTextHeight(text: string, style: CanvasTextStyle, width: number): number {
  return wrapCanvasText(text, style, width).length * canvasLineHeight(style);
}

/** Drops empty text, unreferenced images and blank trailing sheets. */
export function pruneCanvas(canvas: CanvasDocument): CanvasDocument {
  const pages = (canvas.pages ?? []).map((page) => ({
    ...(page.background ? { background: page.background } : {}),
    objects: (page.objects ?? []).filter(
      (object) => object.type !== 'text' || object.text.trim().length > 0,
    ),
  }));
  while (pages.length > 1 && pages[pages.length - 1].objects.length === 0) pages.pop();
  const used = new Set<string>();
  for (const page of pages) {
    for (const object of page.objects) {
      if (object.type === 'image') used.add(object.assetId);
    }
  }
  const assets = Object.fromEntries(
    Object.entries(canvas.assets ?? {}).filter(([key]) => used.has(key)),
  );
  return { pages: pages.length ? pages : [{ objects: [] }], assets };
}

/** Flow document (the parsed/typed resume) → free-placement canvas page. */
export function flowToCanvas(document: ResumeDocument): CanvasDocument {
  const pages: CanvasPage[] = [{ objects: [] }];
  let y = MARGIN;
  const current = () => pages[pages.length - 1];
  const breakPage = () => {
    pages.push({ objects: [] });
    y = MARGIN;
  };
  const place = (text: string, style: CanvasTextStyle, gapAfter: number) => {
    const height = canvasTextHeight(text, style, CONTENT_W);
    if (y + height > PAGE_H - MARGIN) breakPage();
    current().objects.push({ type: 'text', x: MARGIN, y, w: CONTENT_W, text, style });
    y += height + gapAfter;
  };

  if (document.name) {
    place(document.name, { size: 20, font: 'helvetica', color: '#000000', bold: true }, 4);
  }
  if (document.headline) {
    place(document.headline, { size: 11.5, font: 'helvetica', color: '#334155' }, 4);
  }
  for (const contact of document.contacts) {
    place(contact, { size: 10, font: 'helvetica', color: '#64748b' }, 1);
  }
  if (document.contacts.length) y += 6;

  for (const section of document.sections) {
    if (y + 40 > PAGE_H - MARGIN) breakPage();
    place(section.title.toUpperCase(), {
      size: 11,
      font: 'helvetica',
      color: '#1d4ed8',
      bold: true,
    }, 6);
    /* No divider object: the draft store only persists text and image
       objects, so section separation is done with spacing alone. */
    for (const block of section.blocks) {
      const text = block.kind === 'bullet' ? `• ${block.text}` : block.text;
      place(
        text,
        {
          size: block.style?.size ?? (block.kind === 'entry' ? 10.5 : 10),
          font: 'helvetica',
          color: '#000000',
          bold: block.style?.bold ?? block.kind === 'entry',
          italic: block.style?.italic,
          align: block.style?.align,
        },
        block.kind === 'entry' ? 4 : 2,
      );
    }
    y += 8;
  }
  return { pages, assets: {} };
}

/* --------------------------- canvas → PDF writer -------------------------- */

const CANVAS_FONT_FACES: Record<string, string> = {
  F1: 'Helvetica',
  F2: 'Helvetica-Bold',
  F3: 'Helvetica-Oblique',
  F4: 'Helvetica-BoldOblique',
  F5: 'Times-Roman',
  F6: 'Times-Bold',
  F7: 'Courier',
  F8: 'Courier-Bold',
};

function canvasFontResource(style: CanvasTextStyle): string {
  const family = style.font ?? 'helvetica';
  if (family === 'times') return style.bold ? 'F6' : 'F5';
  if (family === 'courier') return style.bold ? 'F8' : 'F7';
  if (style.bold && style.italic) return 'F4';
  if (style.bold) return 'F2';
  if (style.italic) return 'F3';
  return 'F1';
}

const rgbOps = (color: { r: number; g: number; b: number }) =>
  `${(color.r / 255).toFixed(3)} ${(color.g / 255).toFixed(3)} ${(color.b / 255).toFixed(3)}`;

function jpegAssetBytes(src: string): Uint8Array | null {
  const match = /^data:image\/jpeg(?:;base64)?,/.exec(src);
  if (!match) return null;
  try {
    const binary = atob(src.slice(match[0].length));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** Five-point star outline as PDF path ops, centred at (cx, cy). */
function starOps(cx: number, cy: number, radius: number): string {
  const points: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const r = index % 2 === 0 ? radius : radius * 0.382;
    points.push(
      `${(cx + Math.cos(angle) * r).toFixed(2)} ${(PAGE_H - (cy + Math.sin(angle) * r)).toFixed(2)}`,
    );
  }
  return `${points[0]} m ${points.slice(1).map((p) => `${p} l`).join(' ')} h f`;
}

export function resumePdfFromCanvas(canvas: CanvasDocument): { blob: Blob; pages: number } {
  const pages = (canvas.pages ?? []).length ? canvas.pages : [{ objects: [] }];
  const toPdfY = (top: number) => PAGE_H - top;

  /* JPEG assets become XObjects; anything else degrades to a grey box. */
  const imageDefs: Array<{ name: string; bytes: Uint8Array; pxW: number; pxH: number }> = [];
  const imageNameFor = new Map<string, string>();
  const pageImageNames: string[][] = pages.map(() => []);
  pages.forEach((page, pageIndex) => {
    for (const object of page.objects) {
      if (object.type !== 'image') continue;
      const key = `${pageIndex}:${object.assetId}`;
      const known = imageNameFor.get(key);
      if (known) {
        pageImageNames[pageIndex].push(known);
        continue;
      }
      const asset = canvas.assets?.[object.assetId];
      const bytes = asset ? jpegAssetBytes(asset.src) : null;
      if (!bytes) continue;
      const name = `Im${imageDefs.length + 1}`;
      imageDefs.push({ name, bytes, pxW: asset?.pxW ?? 300, pxH: asset?.pxH ?? 300 });
      imageNameFor.set(key, name);
      pageImageNames[pageIndex].push(name);
    }
  });

  /* Per-page transparency states, only on sheets that actually fade something. */
  const gsDefs: Array<{ name: string; value: number }> = [];
  const pageOpacityNames: Array<Map<number, string>> = pages.map((page) => {
    const values = new Set<number>();
    for (const object of page.objects) {
      values.add(Math.min(1, Math.max(0, object.opacity ?? 1)));
    }
    const map = new Map<number, string>();
    if ([...values].some((value) => value < 1)) {
      for (const value of values) {
        let def = gsDefs.find((entry) => entry.value === value);
        if (!def) {
          def = { name: `GS${gsDefs.length + 1}`, value };
          gsDefs.push(def);
        }
        map.set(value, def.name);
      }
    }
    return map;
  });

  const pageStreams = pages.map((page, pageIndex) => {
    const ops: string[] = [];
    const background = parseColor(page.background);
    if (background) ops.push(`${rgbOps(background)} rg 0 0 ${PAGE_W} ${PAGE_H} re f`);

    for (const object of page.objects) {
      if (object.hidden) continue;
      const gsName = pageOpacityNames[pageIndex].get(
        Math.min(1, Math.max(0, object.opacity ?? 1)),
      );
      if (gsName) ops.push(`/${gsName} gs`);
      const rotationStart = ops.length;
      if (object.type === 'text') {
        const style = object.style;
        const size = style.size ?? 11;
        const lineHeight = canvasLineHeight(style);
        const color = parseColor(style.color) ?? { r: 0, g: 0, b: 0 };
        const lines = wrapCanvasText(object.text, style, object.w);
        ops.push(`${rgbOps(color)} rg BT /${canvasFontResource(style)} ${size} Tf`);
        lines.forEach((line, index) => {
          const lineWidth = canvasTextWidth(line, style);
          const align = style.align ?? 'left';
          const x =
            align === 'center'
              ? object.x + (object.w - lineWidth) / 2
              : align === 'right'
                ? object.x + object.w - lineWidth
                : object.x;
          const baseline = toPdfY(object.y + lineHeight * index + size * 0.85);
          ops.push(`1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${escapePdfText(line)}) Tj`);
        });
        ops.push('ET');
      } else if (object.type === 'rect') {
        const fill = parseColor(object.fill);
        const stroke = parseColor(object.stroke);
        const y = toPdfY(object.y + object.h);
        const box = `${object.x.toFixed(2)} ${y.toFixed(2)} ${object.w.toFixed(2)} ${object.h.toFixed(2)} re`;
        if (fill) ops.push(`${rgbOps(fill)} rg ${box} f`);
        if (stroke) {
          ops.push(`${rgbOps(stroke)} RG ${(object.thickness ?? 0.8).toFixed(2)} w ${box} S`);
        }
      } else if (object.type === 'line') {
        const color = parseColor(object.color) ?? { r: 0xbf, g: 0xbf, b: 0xbf };
        const thickness = Math.max(0.3, object.thickness ?? 0.7);
        ops.push(
          `${rgbOps(color)} rg ${object.x.toFixed(2)} ${toPdfY(object.y + thickness).toFixed(2)} ${object.w.toFixed(2)} ${thickness.toFixed(2)} re f`,
        );
      } else if (object.type === 'shape') {
        const thickness = Math.max(2, object.thickness ?? 10);
        const color = parseColor(object.fill) ?? parseColor(object.stroke) ?? { r: 0x33, g: 0x41, b: 0x55 };
        const count = Math.max(1, Math.round(object.w / (thickness * 1.8)));
        const step = object.w / count;
        ops.push(`${rgbOps(color)} rg`);
        for (let index = 0; index < count; index += 1) {
          ops.push(starOps(object.x + step * (index + 0.5), object.y + thickness / 2, thickness / 2));
        }
      } else if (object.type === 'image') {
        const name = imageNameFor.get(`${pageIndex}:${object.assetId}`);
        const y = toPdfY(object.y + object.h);
        if (name) {
          ops.push(
            `q ${object.w.toFixed(2)} 0 0 ${object.h.toFixed(2)} ${object.x.toFixed(2)} ${y.toFixed(2)} cm /${name} Do Q`,
          );
        } else {
          ops.push(
            `0.850 0.850 0.850 rg ${object.x.toFixed(2)} ${y.toFixed(2)} ${object.w.toFixed(2)} ${object.h.toFixed(2)} re f`,
          );
        }
      }
      const rotation = object.rotation ?? 0;
      if (rotation) {
        const height =
          object.type === 'text'
            ? canvasTextHeight(object.text, object.style, object.w)
            : object.type === 'line'
              ? Math.max(1, object.thickness ?? 0.7)
              : object.type === 'shape'
                ? Math.max(1, object.thickness ?? 10)
                : object.h;
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const cx = object.x + object.w / 2;
        const cy = PAGE_H - (object.y + height / 2);
        const e = cx - cos * cx + sin * cy;
        const f = cy - sin * cx - cos * cy;
        const body = ops.splice(rotationStart);
        ops.push(
          `q ${cos.toFixed(4)} ${sin.toFixed(4)} ${(-sin).toFixed(4)} ${cos.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)} cm`,
          ...body,
          'Q',
        );
      }
    }
    return ops.join('\n');
  });

  const pageIds = pages.map((_, index) => 3 + index * 2);
  let nextId = 3 + pages.length * 2;
  const usedFonts = new Set<string>();
  for (const content of pageStreams) {
    for (const match of content.matchAll(/BT \/(F[1-8])/g)) usedFonts.add(match[1]);
  }
  if (!usedFonts.size) usedFonts.add('F1');
  const fontIds: Record<string, number> = {};
  for (const key of Object.keys(CANVAS_FONT_FACES)) {
    if (usedFonts.has(key)) {
      fontIds[key] = nextId;
      nextId += 1;
    }
  }
  const imageIds: Record<string, number> = {};
  for (const def of imageDefs) {
    imageIds[def.name] = nextId;
    nextId += 1;
  }
  const gsIds: Record<string, number> = {};
  for (const def of gsDefs) {
    gsIds[def.name] = nextId;
    nextId += 1;
  }

  const objects: Array<{ id: number; body: string; raw?: Uint8Array }> = [
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    {
      id: 2,
      body: `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`,
    },
  ];
  pages.forEach((_, index) => {
    const pageId = pageIds[index];
    const fontResources = Object.entries(fontIds).map(([key, id]) => `/${key} ${id} 0 R`).join(' ');
    const imageResources = [...new Set(pageImageNames[index])]
      .map((name) => `/${name} ${imageIds[name]} 0 R`)
      .join(' ');
    const gsResources = [...pageOpacityNames[index].values()]
      .map((name) => `/${name} ${gsIds[name]} 0 R`)
      .join(' ');
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << ${fontResources} >>${imageResources ? ` /XObject << ${imageResources} >>` : ''}${gsResources ? ` /ExtGState << ${gsResources} >>` : ''} >> /Contents ${pageId + 1} 0 R >>`,
    });
    objects.push({
      id: pageId + 1,
      body: `<< /Length ${pageStreams[index].length} >>\nstream\n${pageStreams[index]}\nendstream`,
    });
  });
  for (const [key, id] of Object.entries(fontIds)) {
    objects.push({
      id,
      body: `<< /Type /Font /Subtype /Type1 /BaseFont /${CANVAS_FONT_FACES[key]} /Encoding /WinAnsiEncoding >>`,
    });
  }
  for (const def of imageDefs) {
    objects.push({
      id: imageIds[def.name],
      body: `<< /Type /XObject /Subtype /Image /Width ${def.pxW} /Height ${def.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${def.bytes.length} >>\nstream\n`,
      raw: def.bytes,
    });
  }
  for (const def of gsDefs) {
    objects.push({
      id: gsIds[def.name],
      body: `<< /Type /ExtGState /CA ${def.value.toFixed(3)} /ca ${def.value.toFixed(3)} >>`,
    });
  }
  objects.sort((a, b) => a.id - b.id);

  const encoder = new TextEncoder();
  const parts: Array<string | Uint8Array> = [];
  const offsets: Record<number, number> = {};
  let length = 0;
  const push = (value: string | Uint8Array) => {
    length += typeof value === 'string' ? encoder.encode(value).length : value.length;
    parts.push(value);
  };
  push('%PDF-1.4\n');
  for (const object of objects) {
    offsets[object.id] = length;
    if (object.raw) {
      push(`${object.id} 0 obj\n${object.body}`);
      push(object.raw);
      push('\nendstream\nendobj\n');
    } else {
      push(`${object.id} 0 obj\n${object.body}\nendobj\n`);
    }
  }
  const startxref = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const object of objects) {
    xref += `${String(offsets[object.id]).padStart(10, '0')} 00000 n \n`;
  }
  push(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`);

  return {
    blob: new Blob(parts as BlobPart[], { type: 'application/pdf' }),
    pages: pages.length,
  };
}
