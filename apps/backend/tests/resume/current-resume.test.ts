import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { splitAssets, watermarkPdf, saveCurrentResumeSchema } from '../../src/modules/resume/resume.controller.js';

const asset = { src: 'data:image/jpeg;base64,/9j/2Q==', pxW: 1, pxH: 1 };
describe('current resume storage', () => {
  it('stores used image bytes separately and drops unused images', () => {
    const original = { pages: [{ objects: [{ type: 'image' as const, assetId: 'photo' }] }], assets: { photo: asset, unused: asset } };
    const { stored, assets } = splitAssets(original);
    expect(assets).toHaveLength(1);
    expect(Buffer.isBuffer(assets[0].data)).toBe(true);
    expect(stored.assets.photo.src).toBe('asset:photo');
    expect(stored.assets.unused).toBeUndefined();
    expect(original.assets.photo.src).toContain('data:image/jpeg');
  });
  it('rejects missing images and external image URLs', () => {
    expect(() => splitAssets({ pages: [{ objects: [{ type: 'image', assetId: 'missing' }] }], assets: {} })).toThrow('Invalid image reference');
    expect(() => splitAssets({ pages: [{ objects: [{ type: 'image', assetId: 'photo' }] }], assets: { photo: { src: 'https://example.com/photo.jpg' } } })).toThrow('JPEG');
  });
  it('rejects an empty canvas before persistence', () => {
    expect(saveCurrentResumeSchema.safeParse({ fileName: 'resume.pdf', pdfBase64: 'abcdefgh', canvas: { pages: [], assets: {} }, profile: {} }).success).toBe(false);
  });
  it('brands every recruiter PDF page without changing the original', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage(); pdf.addPage();
    const original = await pdf.save();
    const branded = await watermarkPdf(original);
    expect(Buffer.compare(Buffer.from(original), branded)).not.toBe(0);
    const loaded = await PDFDocument.load(branded);
    expect(loaded.getPageCount()).toBe(2);
    for (const page of loaded.getPages()) {
      const streams = page.node.Contents() as PDFArray;
      const content = streams.asArray().map(ref => {
        const stream = loaded.context.lookup(ref) as PDFRawStream;
        return Buffer.from(decodePDFRawStream(stream).decode()).toString();
      }).join('');
      expect(content).toContain(Buffer.from('JobDev').toString('hex').toUpperCase());
      expect(content).toContain(Buffer.from('Shared through JobDev').toString('hex').toUpperCase());
    }
    expect((await PDFDocument.load(original)).getPageCount()).toBe(2);
  });
});
