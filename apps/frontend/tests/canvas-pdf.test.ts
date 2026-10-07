import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument, PDFName } from '../../backend/node_modules/pdf-lib';
import { resumePdfFromCanvas } from '../src/features/dashboard/candidate/demo-resume-pdf';

test('canvas PDF with JPEG and fonts is strictly parseable and can be watermarked', async () => {
  const jpeg = fs.readFileSync(new URL('./fixtures/resume-image.jpg', import.meta.url));
  const canvas = { pages: [{ objects: [
    { type: 'text' as const, x: 56, y: 56, w: 300, text: 'Edited resume', style: { size: 16, bold: true } },
    { type: 'image' as const, x: 56, y: 90, w: 80, h: 80, assetId: 'photo' },
  ] }], assets: { photo: { src: `data:image/jpeg;base64,${jpeg.toString('base64')}`, pxW: 8, pxH: 8 } } };
  const generated = resumePdfFromCanvas(canvas);
  const pdf = await PDFDocument.load(await generated.blob.arrayBuffer(), { throwOnInvalidObject: true });
  assert.equal(pdf.getPageCount(), 1);
  assert(pdf.getPages()[0].node.Resources()?.has(PDFName.of('XObject')));
  pdf.getPages()[0].drawText('JobDev');
  assert((await pdf.save()).length > 0);
});
