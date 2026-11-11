import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import type { CheckVoucherPrintData } from './checkprint.types.js';

const WIDTH = 612;
const HEIGHT = 411;
const DETAILS_TOP = 114;
const DETAILS_BOTTOM = 276;

const displayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
};

const displayTime = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return '';
  const hour = Number(match[4]);
  return `${match[2]}/${match[3]} ${hour % 12 || 12}:${match[5]} ${hour < 12 ? 'AM' : 'PM'}`;
};

const description = (line: CheckVoucherPrintData['lines'][number]) => [
  `${line.transactionType} # ${line.transType === 20 ? line.reference || line.transNo : line.transNo}`,
  ...(line.supplierReference ? [line.transType === 20 ? `SI # ${line.supplierReference}` : line.supplierReference] : []),
  ...line.comments,
].join(' -- ').replace(/\s*\n\s*/g, ' -- ');

function templatePath(template: string): string {
  const filename = `${template}.png`;
  const candidates = [
    resolve(process.cwd(), 'frontend/public/checkprint', filename),
    resolve(process.cwd(), '../frontend/public/checkprint', filename),
  ];
  const path = candidates.find(existsSync);
  if (!path) throw new Error(`Check voucher background ${filename} was not found.`);
  return path;
}

export async function createCheckVoucherPdf(voucher: CheckVoucherPrintData): Promise<Buffer> {
  const doc = new PDFDocument({ size: [WIDTH, HEIGHT], margin: 0, info: { Title: 'Supplier Debit Memo', Author: voucher.companyName } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolveResult, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolveResult(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const background = templatePath(voucher.template);
  const drawHeader = (page: number) => {
    doc.image(background, 0, 0, { width: WIDTH, height: HEIGHT });
    doc.font('Helvetica-Bold').fontSize(12).text(voucher.companyName, 0, 20, { width: WIDTH, align: 'center' });
    doc.font('Helvetica').fontSize(7).text(voucher.companyAddress, 0, 34, { width: WIDTH, align: 'center' });
    doc.fontSize(7).text(`page ${page}`, 535, 32, { width: 50, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(11).text(voucher.cvNo, 510, 57, { width: 65 });
    doc.font('Helvetica').fontSize(9).text(voucher.supplierName, 85, 80, { width: 320 });
    doc.text(displayDate(voucher.cvDate), 435, 80, { width: 100 });
  };
  const pages: Array<Array<{ line: CheckVoucherPrintData['lines'][number]; text: string; y: number; height: number }>> = [];
  let pageRows: typeof pages[number] = [];
  let y = DETAILS_TOP;

  doc.font('Helvetica').fontSize(9);
  for (const line of voucher.lines) {
    const text = description(line);
    const height = Math.max(11, doc.heightOfString(text, { width: 250, lineGap: 2 }));
    const rowHeight = Math.max(13, height + 3);
    if (pageRows.length && y + rowHeight > DETAILS_BOTTOM) {
      pages.push(pageRows);
      pageRows = [];
      y = DETAILS_TOP;
    }
    pageRows.push({ line, text, y, height });
    y += rowHeight;
  }
  if (pageRows.length || pages.length === 0) pages.push(pageRows);

  pages.forEach((rows, pageIndex) => {
    if (pageIndex) doc.addPage({ size: [WIDTH, HEIGHT], margin: 0 });
    drawHeader(pageIndex + 1);
    if (pageIndex === 0) {
      doc.font('Helvetica').fontSize(8);
      voucher.glItems.slice(0, 4).forEach((item, index) => {
        const rowY = 310 + index * 15;
        const amount = Number(item.amount);
        doc.text(item.accountName || item.account, 43, rowY, { width: 104 });
        if (amount > 0) doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 150, rowY, { width: 62, align: 'right' });
        if (amount < 0) doc.text(Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 215, rowY, { width: 62, align: 'right' });
      });
    }
    doc.font('Helvetica').fontSize(9);
    for (const { line, text, y: rowY } of rows) {
      doc.text(displayDate(line.date), 41, rowY, { width: 65 });
      doc.text(text, 110, rowY, { width: 250, lineGap: 2 });
      doc.text(line.displayedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 380, rowY, { width: 150, align: 'right' });
    }
    if (pageIndex < pages.length - 1) {
      const last = rows.at(-1);
      const continuationY = Math.min(DETAILS_BOTTOM, (last?.y ?? DETAILS_TOP) + (last?.height ?? 0) + 3);
      doc.fontSize(9).text(`see page ${pageIndex + 2} for continuation.`, 41, continuationY, { width: 300 });
    } else {
      if (voucher.ewtToDisplay) {
        doc.font('Helvetica').fontSize(9)
          .text((-voucher.ewtToDisplay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 380, 270, { width: 150, align: 'right' })
          .text(' (EWT)', 530, 270, { width: 45 });
      }
      doc.font('Helvetica-Bold').fontSize(9).text(voucher.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 380, 286, { width: 150, align: 'right' });
    }

    doc.font('Helvetica').fontSize(7);
    doc.text(voucher.bankName || voucher.bankAccountName, 405, 347, { width: 160 });
    doc.text(voucher.cheques.map((check) => check.number).filter(Boolean).join(', '), 405, 359, { width: 160 });
    doc.text(voucher.cheques.map((check) => displayDate(check.date)).filter(Boolean).join(', '), 405, 371, { width: 160 });
    doc.fontSize(10).text(voucher.preparedBy, 65, 380, { width: 110 });
    doc.text(displayTime(voucher.preparedAt), 133, 369, { width: 90 });
    doc.text(voucher.approvedBy, 330, 382, { width: 110 });
    doc.text(displayTime(voucher.approvedAt), 380, 369, { width: 90 });
  });

  if (voucher.debitMemoSections.length) {
    let reportPage = 0;
    let reportY = 0;
    let totalQuantity = 0;
    let totalUnitCost = 0;
    let totalExtended = 0;
    const reportWidth = 552;
    const columns = [30, 260, 330, 430, 530, 582];
    const drawTableHeader = () => {
      doc.font('Helvetica-Oblique').fontSize(9);
      ['Description', 'UOM', 'Quantity', 'UnitCost', 'Extended'].forEach((label, i) => doc.text(label, columns[i] + 3, reportY, { width: columns[i + 1] - columns[i] - 6 }));
      reportY += 13;
      doc.moveTo(columns[0], reportY).lineTo(columns.at(-1)!, reportY).strokeColor('#888').stroke();
      reportY += 5;
      doc.font('Helvetica').fontSize(9);
    };
    const startReportPage = () => {
      doc.addPage({ size: [WIDTH, HEIGHT], margin: 0 });
      reportPage += 1;
      reportY = 34;
      const printed = new Date();
      doc.font('Helvetica-Bold').fontSize(14).text('Supplier Debit Memo', columns[0], reportY, { width: reportWidth });
      reportY += 20;
      doc.font('Helvetica').fontSize(9).text('Print Out Date:', columns[0], reportY);
      doc.text(`${printed.toLocaleDateString('en-US')}   ${printed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 130, reportY);
      doc.text('Supplier:', columns[0], reportY + 13);
      doc.text(voucher.supplierName, 130, reportY + 13, { width: 350 });
      doc.text(`Page ${pages.length + reportPage}`, 510, reportY, { width: 72, align: 'right' });
      reportY += 35;
      doc.moveTo(columns[0], reportY).lineTo(columns.at(-1)!, reportY).strokeColor('#888').stroke();
      reportY += 7;
      drawTableHeader();
    };
    startReportPage();
    doc.font('Helvetica').fontSize(9);
    for (const section of voucher.debitMemoSections) {
      if (section.heading) {
        if (reportY + 20 > 380) startReportPage();
        doc.font('Helvetica-Bold').text(section.heading, columns[0] + 3, reportY, { width: reportWidth - 6 });
        reportY += 13;
      }
      doc.font('Helvetica');
      for (const item of section.items) {
        const height = Math.max(12, doc.heightOfString(item.description, { width: columns[1] - columns[0] - 6 }));
        if (reportY + height + 22 > 380) startReportPage();
        const values = [item.description, item.uom, String(item.quantity || ''), item.unitCost ? item.unitCost.toFixed(2) : '', item.extended.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })];
        values.forEach((value, i) => doc.text(value, columns[i] + 3, reportY, { width: columns[i + 1] - columns[i] - 6, align: i > 1 ? 'right' : 'left' }));
        reportY += height + 3;
        totalQuantity += item.quantity;
        totalUnitCost += item.unitCost;
        totalExtended += item.extended;
      }
      if (reportY + 24 > 380) startReportPage();
      doc.font('Helvetica-Bold').text('Total:', columns[3] + 3, reportY, { width: columns[4] - columns[3] - 6 });
      doc.text(section.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), columns[4] + 3, reportY, { width: columns[5] - columns[4] - 6, align: 'right' });
      reportY += 18;
      doc.font('Helvetica');
    }
    if (reportY + 24 > 380) startReportPage();
    doc.moveTo(columns[0], reportY).lineTo(columns.at(-1)!, reportY).strokeColor('#888').stroke();
    reportY += 8;
    doc.font('Helvetica-Bold').fontSize(9).text('TOTAL:', columns[1] + 3, reportY, { width: columns[2] - columns[1] - 6 });
    doc.text(String(totalQuantity), columns[2] + 3, reportY, { width: columns[3] - columns[2] - 6, align: 'right' });
    doc.text(totalUnitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), columns[3] + 3, reportY, { width: columns[4] - columns[3] - 6, align: 'right' });
    doc.text(totalExtended.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), columns[4] + 3, reportY, { width: columns[5] - columns[4] - 6, align: 'right' });
  }

  doc.end();
  return result;
}
