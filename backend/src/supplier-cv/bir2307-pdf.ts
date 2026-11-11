import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Bir2307Form } from './supplier-cv.service.js';

const mm = (value: number) => value * 72 / 25.4;
const ink = rgb(0, 50 / 255, 119 / 255);
const templatePath = (name: string) => {
  const path = [resolve(process.cwd(), '../frontend/public/assets', name), resolve(process.cwd(), 'frontend/public/assets', name)].find(existsSync);
  if (!path) throw new Error(`BIR 2307 asset ${name} was not found.`);
  return path;
};

export async function createBir2307Pdf(form: Bir2307Form): Promise<Uint8Array> {
  const template = await PDFDocument.load(readFileSync(templatePath('bir-2307-template.pdf')));
  const pdf = await PDFDocument.create();
  const [background] = await pdf.embedPdf(await template.save(), [0]);
  const page = pdf.addPage([background.width, background.height]);
  const { height } = page.getSize();
  page.drawPage(background, { x: 0, y: 0 });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const scaleX = background.width / mm(210);
  const scaleY = background.height / mm(297);
  const draw = (left: number, top: number, value: string, size = 10, strong = false) => {
    if (!value) return;
    const fontSize = size;
    page.drawText(value, { x: mm(left) * scaleX, y: height - mm(top) * scaleY - fontSize, size: fontSize, font: strong ? bold : font, color: ink });
  };
  const drawRight = (right: number, top: number, value: string, size = 10, strong = false) => {
    if (!value) return;
    const selectedFont = strong ? bold : font;
    draw(right - selectedFont.widthOfTextAtSize(value, size) / scaleX * 25.4 / 72, top, value, size, strong);
  };
  const drawCentered = (center: number, top: number, value: string, size = 10, strong = false) => {
    const selectedFont = strong ? bold : font;
    draw(center - selectedFont.widthOfTextAtSize(value, size) / scaleX * 25.4 / 72 / 2, top, value, size, strong);
  };
  const money = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const spaced = (value: string) => value.split('').join(' ');

  draw(54, 34, spaced(form.periodFrom.month), 10); draw(64, 34, spaced(form.periodFrom.day), 10); draw(74, 34, spaced(form.periodFrom.year), 10);
  draw(139, 34, spaced(form.periodTo.month), 10); draw(149, 34, spaced(form.periodTo.day), 10); draw(159, 34, spaced(form.periodTo.year), 10);
  form.payeeTin.forEach((value, i) => draw([74, 92, 110, 130][i], 45, spaced(value), 10));
  draw(20, 54, form.payeeName); draw(20, 61, form.payeeAddress, 7); draw(185, 61, spaced(form.payeeZip), 12);
  form.payorTin.forEach((value, i) => draw([74, 92, 110, 130][i], 82, spaced(value), 10));
  draw(20, 89, form.payorName); draw(20, 100, form.payorAddress, 7); draw(187, 98, spaced(form.payorZip), 15);

  ['Income Payments Made By Top', 'Withholding Agents To Their', 'Local/Resident Supplier Of Goods', 'Other Than Those Covered By', 'Other Rates Of Withholding Tax']
    .forEach((value, i) => draw(15, 119.5 + i * 5, value, 8));
  const rows = form.lines.length ? form.lines : [{ atc: '', tax: 0 }];
  rows.forEach((line, i) => {
    const top = 121.5 + i * 5;
    draw(62, top, line.atc, 7);
    if (i === 0 && form.quarterSlot) drawRight([101, 126, 151][form.quarterSlot - 1], top, money(form.income), 7);
    if (i === 0) drawRight(175, top, money(form.income), 7);
    if (line.atc || line.tax) drawRight(203, top, money(line.tax), 7);
  });
  if (form.quarterSlot) drawRight([101, 126, 151][form.quarterSlot - 1], 162, money(form.income), 7, true);
  drawRight(175, 162, money(form.income), 7, true); drawRight(203, 162, money(form.tax), 7, true);

  const signature = await pdf.embedPng(readFileSync(templatePath('bir-2307-signature.png')));
  const signatureWidth = mm(18);
  const signatureHeight = signatureWidth * signature.height / signature.width;
  page.drawImage(signature, { x: mm(96) * scaleX, y: height - mm(253) * scaleY - signatureHeight, width: signatureWidth, height: signatureHeight });
  drawCentered(105, 257, form.signatory, 8, true);
  drawCentered(105, 260, form.signatoryTitle, 7);
  return pdf.save();
}
