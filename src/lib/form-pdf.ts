// Styled, data-driven PDF builder for the downloadable car & owner forms.
//
// Renders a document that resembles the CMS review screens — a car-name title
// with the owner's name as a sub-header, tinted "which form is this" banners,
// section headings, labelled bordered value boxes (that grow to fit long text),
// yes/no checkboxes and a side-by-side image grid. Built on jsPDF's vector API
// so the text stays crisp and selectable.

import { jsPDF } from "jspdf";

/** An image already decoded to a data URL, with its natural pixel size. */
export type PdfImage = {
  dataUrl: string;
  /** jsPDF image format, e.g. "JPEG" | "PNG". */
  format: string;
  width: number;
  height: number;
};

/** One labelled field in a grid. `span` widens it across grid columns. */
export type PdfField = {
  label: string;
  value: string;
  /** Column span (1–3). Defaults to 1. */
  span?: number;
};

// Brand palette, mirroring the CMS light-theme tokens in globals.css.
const C = {
  fg: [28, 25, 23] as const, // --foreground #1c1917
  muted: [121, 113, 107] as const, // --muted-foreground #79716b
  primary: [199, 26, 78] as const, // --primary #c71a4e
  border: [232, 229, 224] as const, // --border #e8e5e0
  white: [255, 255, 255] as const,
  bannerBg: [250, 234, 239] as const, // light primary tint
};

const MARGIN = 40;
const COL_GAP = 12;
const ROW_GAP = 12;

export class FormPdf {
  private doc: jsPDF;
  private pageW: number;
  private pageH: number;
  private contentW: number;
  private y: number;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    this.pageW = this.doc.internal.pageSize.getWidth();
    this.pageH = this.doc.internal.pageSize.getHeight();
    this.contentW = this.pageW - MARGIN * 2;
    this.y = MARGIN;
  }

  private get bottom() {
    return this.pageH - MARGIN;
  }

  /** Break to a new page when `needed` points won't fit in the remaining space. */
  private ensure(needed: number) {
    if (this.y + needed > this.bottom) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  private setColor(rgb: readonly number[]) {
    this.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  /**
   * Document header: car-name title with the owner's name as a sub-header, and
   * an optional brand logo in the top-right corner. The title and sub-header
   * wrap within the space left of the logo, so a long car name never runs
   * underneath it.
   */
  header(title: string, subtitle: string, logo?: PdfImage) {
    // Fit the logo (already trimmed of transparent margins) within a bounding
    // box, preserving its aspect ratio. Its top sits on MARGIN — the same top
    // line the title starts on — so the two are top-aligned.
    let logoW = 0;
    let logoH = 0;
    if (logo) {
      // Sized to match the visible mark of the earlier square logo (~49×37pt);
      // height binds for the wide trimmed logo.
      const maxW = 52;
      const maxH = 37;
      const scale = Math.min(maxW / logo.width, maxH / logo.height);
      logoW = logo.width * scale;
      logoH = logo.height * scale;
      try {
        this.doc.addImage(
          logo.dataUrl,
          logo.format,
          this.pageW - MARGIN - logoW,
          MARGIN,
          logoW,
          logoH,
        );
      } catch {
        // Skip the logo rather than aborting the export.
      }
    }

    const logoGap = 16;
    // Text column stops short of the logo so the two never overlap.
    const textW = this.contentW - (logo ? logoW + logoGap : 0);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(20);
    this.setColor(C.fg);
    const lines = this.doc.splitTextToSize(title || "—", textW);
    for (const line of lines) {
      this.doc.text(line, MARGIN, this.y, { baseline: "top" });
      this.y += 24;
    }
    if (subtitle) {
      this.y += 2;
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(11);
      this.setColor(C.muted);
      const subLines = this.doc.splitTextToSize(subtitle, textW);
      for (const line of subLines) {
        this.doc.text(line, MARGIN, this.y, { baseline: "top" });
        this.y += 16;
      }
    }
    // Keep the divider (and everything after) clear of the logo.
    if (logo) this.y = Math.max(this.y, MARGIN + logoH);
    this.y += 6;
    this.doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    this.doc.setLineWidth(1);
    this.doc.line(MARGIN, this.y, this.pageW - MARGIN, this.y);
    this.y += 16;
  }

  /** Tinted full-width bar naming which form the following sections belong to. */
  formBanner(label: string) {
    // A form banner starts a major block — keep it with at least its first
    // heading by nudging to a new page when little room remains.
    this.ensure(72);
    const h = 28;
    this.doc.setFillColor(C.bannerBg[0], C.bannerBg[1], C.bannerBg[2]);
    this.doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(MARGIN, this.y, this.contentW, h, 5, 5, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.setColor(C.primary);
    this.doc.text(label.toUpperCase(), MARGIN + 12, this.y + h / 2, {
      baseline: "middle",
      charSpace: 0.6,
    });
    this.y += h + 14;
  }

  /** Bold section heading, matching the CMS review-card section titles. */
  section(title: string) {
    this.ensure(30);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.setColor(C.fg);
    this.doc.text(title, MARGIN, this.y, { baseline: "top" });
    this.y += 20;
  }

  /** Height a value box needs for `value` at the given width (label included). */
  private measureField(width: number, value: string): number {
    const padX = 7;
    const padY = 6;
    const lineH = 13;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    const lines = this.doc.splitTextToSize(value || "", width - padX * 2);
    const boxH = Math.max(24, lines.length * lineH + padY * 2);
    return 12 + boxH; // 12 = label row above the box
  }

  /** Draw one labelled value box at (x, y). Returns the total height it used. */
  private drawField(x: number, y: number, width: number, field: PdfField) {
    const padX = 7;
    const padY = 6;
    const lineH = 13;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.setColor(C.muted);
    this.doc.text(field.label, x, y, { baseline: "top" });

    const boxTop = y + 12;
    this.doc.setFontSize(10);
    const lines = this.doc.splitTextToSize(field.value || "", width - padX * 2);
    const boxH = Math.max(24, lines.length * lineH + padY * 2);

    this.doc.setFillColor(C.white[0], C.white[1], C.white[2]);
    this.doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    this.doc.setLineWidth(0.75);
    this.doc.roundedRect(x, boxTop, width, boxH, 5, 5, "FD");

    this.setColor(C.fg);
    lines.forEach((line: string, i: number) => {
      this.doc.text(line, x + padX, boxTop + padY + i * lineH, {
        baseline: "top",
      });
    });

    return 12 + boxH;
  }

  /**
   * A grid of labelled fields, `columns` wide. Fields with `span` widen across
   * columns; each row is measured so its fields align and page breaks land
   * between rows, never mid-row.
   */
  fields(items: PdfField[], columns = 3) {
    const colW = (this.contentW - COL_GAP * (columns - 1)) / columns;

    // Partition into rows by span so a row never exceeds `columns`.
    const rows: PdfField[][] = [];
    let row: PdfField[] = [];
    let used = 0;
    for (const item of items) {
      const span = Math.min(columns, Math.max(1, item.span ?? 1));
      if (used + span > columns) {
        rows.push(row);
        row = [];
        used = 0;
      }
      row.push({ ...item, span });
      used += span;
    }
    if (row.length) rows.push(row);

    for (const cells of rows) {
      // Row height = tallest field in the row.
      let rowH = 0;
      let col = 0;
      const placed = cells.map((cell) => {
        const span = cell.span ?? 1;
        const x = MARGIN + col * (colW + COL_GAP);
        const w = span * colW + (span - 1) * COL_GAP;
        col += span;
        const h = this.measureField(w, cell.value);
        rowH = Math.max(rowH, h);
        return { cell, x, w };
      });
      this.ensure(rowH);
      for (const { cell, x, w } of placed) {
        this.drawField(x, this.y, w, cell);
      }
      this.y += rowH + ROW_GAP;
    }
  }

  /** A single full-width labelled value box (e.g. a description). */
  field(label: string, value: string) {
    this.fields([{ label, value, span: 3 }], 3);
  }

  /** A read-only yes/no answer rendered as a ticked/blank checkbox. */
  bool(label: string, value: boolean) {
    this.ensure(20);
    const size = 11;
    const x = MARGIN;
    const y = this.y;
    if (value) {
      this.doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
      this.doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
      this.doc.setLineWidth(0.75);
      this.doc.roundedRect(x, y, size, size, 2, 2, "FD");
      // A check mark, drawn in white.
      this.doc.setDrawColor(C.white[0], C.white[1], C.white[2]);
      this.doc.setLineWidth(1.1);
      this.doc.line(x + 2.5, y + 5.8, x + 4.6, y + 8);
      this.doc.line(x + 4.6, y + 8, x + 8.6, y + 3.2);
    } else {
      this.doc.setFillColor(C.white[0], C.white[1], C.white[2]);
      this.doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
      this.doc.setLineWidth(0.75);
      this.doc.roundedRect(x, y, size, size, 2, 2, "FD");
    }
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    this.setColor(value ? C.fg : C.muted);
    const textX = x + size + 7;
    const lines = this.doc.splitTextToSize(
      label,
      this.contentW - (size + 7),
    );
    lines.forEach((line: string, i: number) => {
      this.doc.text(line, textX, y + 1 + i * 12, { baseline: "top" });
    });
    this.y += Math.max(size + 5, lines.length * 12 + 4);
  }

  /** A small muted caption line, e.g. the CMS field hints. */
  caption(text: string) {
    this.ensure(14);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.setColor(C.muted);
    const lines = this.doc.splitTextToSize(text, this.contentW);
    lines.forEach((line: string, i: number) => {
      this.doc.text(line, MARGIN, this.y + i * 11, { baseline: "top" });
    });
    this.y += lines.length * 11 + 4;
  }

  /** All car images laid out side by side in a grid (three per row). */
  imageGrid(images: PdfImage[]) {
    if (images.length === 0) return;
    const perRow = 3;
    const gap = 10;
    const cellW = (this.contentW - gap * (perRow - 1)) / perRow;

    for (let i = 0; i < images.length; i += perRow) {
      const rowImages = images.slice(i, i + perRow);
      const cells = rowImages.map((img) => {
        const ratio = img.height / img.width || 0.66;
        const h = Math.min(cellW * ratio, 150);
        const w = h / ratio;
        return { img, w, h };
      });
      const rowH = Math.max(...cells.map((c) => c.h));
      this.ensure(rowH + ROW_GAP);
      cells.forEach((cell, j) => {
        const x = MARGIN + j * (cellW + gap);
        // Left-align within the cell; center vertically in the row.
        try {
          this.doc.addImage(
            cell.img.dataUrl,
            cell.img.format,
            x,
            this.y + (rowH - cell.h) / 2,
            cell.w,
            cell.h,
          );
        } catch {
          // Skip an image jsPDF can't decode rather than aborting the export.
        }
      });
      this.y += rowH + ROW_GAP;
    }
  }

  /** Vertical spacer between sections. */
  gap(amount = 8) {
    this.y += amount;
  }

  blob(): Blob {
    return this.doc.output("blob");
  }
}
