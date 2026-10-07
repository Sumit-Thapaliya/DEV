/** Opt-in DB integration check: creates temporary users and removes them in finally.
 * Run from apps/backend: pnpm exec tsx tests/resume/smoke-current-resume.ts
 * ATS extraction is mocked; the database, auth, HTTP, PDF and image storage are real.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { PDFDocument } from 'pdf-lib';
import { AppDataSource } from '../../src/database/data-source.js';
import { User, UserRole } from '../../src/modules/user/user.entity.js';
import { ResumeVersion } from '../../src/modules/user/resume-version.entity.js';
import { signSession, AuthService } from '../../src/modules/auth/auth.service.js';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  const candidateId = randomUUID(); const recruiterId = randomUUID();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const nativeFetch = globalThis.fetch;
  let atsFails = false;
  const oldKey = env.ATS_API_KEY;
  env.ATS_API_KEY = 'integration-test-only';
  globalThis.fetch = async (url, init) => {
    if (String(url) === `${env.ATS_ENDPOINT}/v1/format`) {
      if (atsFails) return new Response('temporarily unavailable', { status: 503 });
      return Response.json({ raw_resume_data: { basics: { name: 'Temporary Save Test', summary: 'Edited summary' }, skills: [{ keywords: ['TypeScript', 'PostgreSQL'] }], education: [{ institution: 'Test University', area: 'Computer Science' }] } });
    }
    return nativeFetch(url, init);
  };
  try {
    const candidate = await repo.save(repo.create({ userId: candidateId, mobile: `test-${candidateId}`, email: null, password: 'not-a-login-hash', role: UserRole.CANDIDATE, resumeFileName: 'old.pdf', resumeData: Buffer.from('%PDF-old').toString('base64') }));
    const recruiter = await repo.save(repo.create({ userId: recruiterId, mobile: `test-${recruiterId}`, email: null, password: 'not-a-login-hash', role: UserRole.RECRUITER }));
    const token = signSession(candidate); const recruiterToken = signSession(recruiter);
    const request = (path: string, method = 'GET', body?: unknown, bearer = token) => fetch(base + path, { method, headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const pdf = await PDFDocument.create(); pdf.addPage().drawText('First edited resume');
    const firstPdf = Buffer.from(await pdf.save());
    const image = { src: 'data:image/jpeg;base64,/9j/2Q==', pxW: 1, pxH: 1 };
    const canvas = { pages: [{ objects: [{ type: 'image', assetId: 'photo', x: 10, y: 10, w: 20, h: 20 }] }], assets: { photo: image } };
    const payload = { fileName: 'edited.pdf', pdfBase64: firstPdf.toString('base64'), canvas, profile: { skills: ['Old skill'], expectedSalary: 'Negotiable' } };
    await AppDataSource.getRepository(ResumeVersion).save({ userId: candidateId, version: 1, profileData: { old: true } });
    assert.equal((await request('/api/auth/resume/current','PUT',payload,'')).status,401);
    assert.equal((await request('/api/auth/resume/current','PUT',payload,recruiterToken)).status,403);
    let response = await request('/api/auth/resume/current','PUT',payload);
    assert.equal(response.status,200,await response.clone().text());
    const saved = await repo.findOneByOrFail({ userId: candidateId });
    assert.equal(saved.resumeData,null);
    assert.deepEqual(saved.resumePdf,firstPdf);
    assert.equal(saved.resumeCanvas?.assets.photo.src,'asset:photo');
    assert.equal(await AppDataSource.getRepository(ResumeVersion).countBy({userId:candidateId}),0);
    const assets = await AppDataSource.query('SELECT data, pg_typeof(data)::text AS type FROM resume_assets WHERE "userId" = $1',[candidateId]);
    assert.equal(assets.length,1); assert.equal(assets[0].type,'bytea');
    const restored = await (await request('/api/auth/resume')).json();
    assert.equal(restored.data.resume.canvas.assets.photo.src,image.src);
    assert.equal(restored.data.resume.dataBase64,payload.pdfBase64);
    assert.deepEqual(restored.data.resume.parsedProfile.raw_resume_data.skills[0].keywords,['TypeScript','PostgreSQL']);
    assert.equal((await request(`/api/candidates/${candidateId}/resume`)).status,403);
    response = await request(`/api/candidates/${candidateId}/resume`,'GET',undefined,recruiterToken);
    assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store');
    const branded = Buffer.from(await response.arrayBuffer());
    assert.notDeepEqual(branded,firstPdf); assert.equal((await PDFDocument.load(branded)).getPageCount(),1);
    const bad = await request('/api/auth/resume/current','PUT',{...payload,pdfBase64:'badfile!'});
    assert.equal(bad.status,400); assert.deepEqual((await repo.findOneByOrFail({userId:candidateId})).resumePdf,firstPdf);
    const newer = await PDFDocument.create(); newer.addPage().drawText('Second edit replaces first');
    const secondPdf = Buffer.from(await newer.save());
    atsFails = true;
    response = await request('/api/auth/resume/current','PUT',{...payload,pdfBase64:secondPdf.toString('base64'),canvas:{pages:[{objects:[]}],assets:{}}});
    assert.equal(response.status,200); assert.match((await response.json()).data.warning,/extraction/);
    assert.deepEqual((await repo.findOneByOrFail({userId:candidateId})).resumePdf,secondPdf);
    assert.equal((await AppDataSource.query('SELECT * FROM resume_assets WHERE "userId" = $1',[candidateId])).length,0);
    // Replacing the file clears the previous edited canvas/PDF as well.
    await new AuthService().uploadResume(candidateId,'replacement.pdf',firstPdf.toString('base64'),{skills:['New upload']});
    const replaced = await repo.findOneByOrFail({userId:candidateId});
    assert.equal(replaced.resumeCanvas,null); assert.equal(replaced.resumePdf,null);
    console.log('PASS: authenticated replacement, bytea images, restore, latest PDF, recruiter watermark, failed-save preservation, old-version cleanup, ATS warning and upload replacement.');
  } finally {
    globalThis.fetch = nativeFetch; env.ATS_API_KEY = oldKey;
    await AppDataSource.getRepository(ResumeVersion).delete({userId:candidateId});
    await repo.delete([candidateId,recruiterId]);
    await new Promise<void>(resolve => server.close(()=>resolve()));
    await AppDataSource.destroy();
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
