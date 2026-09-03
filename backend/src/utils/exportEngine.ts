import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

// Event & Institution Metadata
export const REPORT_BRANDING = {
  title: 'SMART HORIZON 2026',
  subtitle: 'New Horizon College of Engineering — Hackathon Operations Platform',
  timezone: 'Asia/Kolkata',
};

// 1. Timestamp Formatting (Human-Readable Event Timezone)
export function formatTimestamp(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: REPORT_BRANDING.timezone,
  });
}

export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: REPORT_BRANDING.timezone,
  });
}

// 2. Formula Injection Protection Helper
export function sanitizeCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// Interface definitions for workbook sheets
export interface ExportSheetDef {
  sheetName: string;
  reportTitle: string;
  summaryStats?: Array<{ label: string; value: string | number }>;
  metadata?: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<Array<string | number | boolean>>;
  colWidths?: number[];
}

// 3. EXCEL WORKBOOK GENERATOR
export function generateExcelWorkbook(sheets: ExportSheetDef[]): Buffer {
  const workbook = XLSX.utils.book_new();

  for (const sheetDef of sheets) {
    const aoa: any[][] = [];

    // Header Block
    aoa.push([REPORT_BRANDING.title]);
    aoa.push([REPORT_BRANDING.subtitle]);
    aoa.push([sheetDef.reportTitle.toUpperCase()]);
    
    const genTime = formatTimestamp(new Date());
    let metaStr = `Generated: ${genTime}`;
    if (sheetDef.metadata && sheetDef.metadata.length > 0) {
      metaStr += ' | ' + sheetDef.metadata.map(m => `${m.label}: ${m.value}`).join(' | ');
    }
    aoa.push([metaStr]);
    aoa.push([]); // blank spacing row

    // Executive Summary Box if present
    if (sheetDef.summaryStats && sheetDef.summaryStats.length > 0) {
      aoa.push(['EXECUTIVE SUMMARY']);
      const statLabels = sheetDef.summaryStats.map(s => s.label);
      const statValues = sheetDef.summaryStats.map(s => String(s.value));
      aoa.push(statLabels);
      aoa.push(statValues);
      aoa.push([]); // blank spacing row
    }

    // Main Data Table Header & Rows
    const tableStartRow = aoa.length;
    aoa.push(sheetDef.headers);

    if (sheetDef.rows.length === 0) {
      aoa.push(['No records found for the selected filters.']);
    } else {
      sheetDef.rows.forEach(row => {
        const sanitizedRow = row.map(cell => {
          if (typeof cell === 'number' || typeof cell === 'boolean') return cell;
          return sanitizeCell(cell);
        });
        aoa.push(sanitizedRow);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Calculate Column Widths
    const cols: Array<{ wch: number }> = [];
    sheetDef.headers.forEach((h, colIdx) => {
      let maxLen = h.length;
      sheetDef.rows.forEach(r => {
        const val = r[colIdx] !== undefined && r[colIdx] !== null ? String(r[colIdx]) : '';
        // Clamp length to prevent massive columns for URLs/Abstracts
        const displayLen = Math.min(val.length, 45);
        if (displayLen > maxLen) maxLen = displayLen;
      });
      const customWidth = sheetDef.colWidths && sheetDef.colWidths[colIdx] ? sheetDef.colWidths[colIdx] : maxLen + 4;
      cols.push({ wch: Math.max(customWidth, 12) });
    });
    worksheet['!cols'] = cols;

    // Set Freeze Pane below header row
    worksheet['!views'] = [{ state: 'frozen', ySplit: tableStartRow + 1 }];

    // Set AutoFilter on table headers if there are data rows
    if (sheetDef.rows.length > 0) {
      const lastColChar = String.fromCharCode(65 + Math.min(sheetDef.headers.length - 1, 25));
      const lastRowIdx = aoa.length;
      worksheet['!autofilter'] = { ref: `A${tableStartRow + 1}:${lastColChar}${lastRowIdx}` };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetDef.sheetName);
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// 4. PDF REPORT GENERATOR
export interface PdfReportOptions {
  reportTitle: string;
  metadata?: Array<{ label: string; value: string }>;
  summaryStats?: Array<{ label: string; value: string | number }>;
  headers: string[];
  rows: string[][];
  orientation?: 'portrait' | 'landscape';
}

export function streamPdfReport(res: Response, filename: string, options: PdfReportOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const orientation = options.orientation || (options.headers.length > 6 ? 'landscape' : 'portrait');
    const doc = new PDFDocument({
      margin: 36,
      size: 'A4',
      layout: orientation,
      bufferPages: true,
    });

    const chunks: any[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', err => reject(err));
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
      resolve();
    });

  const pageWidth = orientation === 'landscape' ? 841.89 : 595.28;
  const pageHeight = orientation === 'landscape' ? 595.28 : 841.89;
  const contentWidth = pageWidth - 72;

  // Header Banner
  doc.fillColor('#1e3a8a').fontSize(16).font('Helvetica-Bold').text(REPORT_BRANDING.title, 36, 36);
  doc.fillColor('#475569').fontSize(10).font('Helvetica').text(REPORT_BRANDING.subtitle, 36, 56);
  
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(options.reportTitle.toUpperCase(), 36, 75);

  const genTime = formatTimestamp(new Date());
  let metaLine = `Generated: ${genTime}`;
  if (options.metadata && options.metadata.length > 0) {
    metaLine += ' | ' + options.metadata.map(m => `${m.label}: ${m.value}`).join(' | ');
  }
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(metaLine, 36, 95);

  // Line Divider
  doc.moveTo(36, 110).lineTo(pageWidth - 36, 110).lineWidth(1).strokeColor('#cbd5e1').stroke();

  let startY = 125;

  // Summary Stat Cards Box if provided
  if (options.summaryStats && options.summaryStats.length > 0) {
    const cardCount = options.summaryStats.length;
    const cardWidth = Math.min(130, (contentWidth - (cardCount - 1) * 10) / cardCount);

    options.summaryStats.forEach((stat, idx) => {
      const cardX = 36 + idx * (cardWidth + 10);
      doc.rect(cardX, startY, cardWidth, 42).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text(stat.label.toUpperCase(), cardX + 6, startY + 6, { width: cardWidth - 12 });
      doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(String(stat.value), cardX + 6, startY + 20, { width: cardWidth - 12 });
    });

    startY += 55;
  }

  // Draw Table
  const headers = options.headers;
  const rows = options.rows;
  const colCount = headers.length;
  const colWidth = contentWidth / colCount;
  const rowHeight = 22;

  // Render Table Header
  const drawTableHeader = (yPos: number) => {
    doc.rect(36, yPos, contentWidth, rowHeight).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, 40 + i * colWidth, yPos + 6, { width: colWidth - 8, align: 'left', lineBreak: false });
    });
    return yPos + rowHeight;
  };

  let currentY = drawTableHeader(startY);

  if (rows.length === 0) {
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('No records found for the selected filters.', 36, currentY + 15);
  } else {
    rows.forEach((row, rowIdx) => {
      // Auto page break if table exceeds page height
      if (currentY + rowHeight > pageHeight - 50) {
        doc.addPage();
        currentY = drawTableHeader(36);
      }

      const isEven = rowIdx % 2 === 0;
      const bg = isEven ? '#ffffff' : '#f8fafc';
      doc.rect(36, currentY, contentWidth, rowHeight).fillAndStroke(bg, '#f1f5f9');

      doc.fillColor('#1e293b').fontSize(8).font('Helvetica');
      row.forEach((cell, colIdx) => {
        const textStr = String(cell || '');
        doc.text(textStr, 40 + colIdx * colWidth, currentY + 6, {
          width: colWidth - 8,
          align: 'left',
          lineBreak: false,
          ellipsis: true,
        });
      });

      currentY += rowHeight;
    });
  }

  // Add Footers (Page X of Y)
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.moveTo(36, pageHeight - 30).lineTo(pageWidth - 36, pageHeight - 30).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
      `Smart Horizon 2026 Operations Report  |  Page ${i + 1} of ${totalPages}`,
      36,
      pageHeight - 22,
      { width: contentWidth, align: 'center' }
    );
  }

  doc.end();
  });
}

// 5. CSV REPORT GENERATOR
export function generateCsvReport(headers: string[], rows: string[][]): string {
  const escapeCsv = (val: string) => {
    const str = String(val || '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(cell => escapeCsv(sanitizeCell(cell))).join(','))
  ];

  return '\uFEFF' + csvLines.join('\n'); // UTF-8 BOM prefix
}
