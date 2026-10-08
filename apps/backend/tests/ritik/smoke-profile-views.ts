/** Opt-in, real database/API integration. Only UUID-tagged fixtures are changed. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import axios from 'axios';
import { AppDataSource } from '../../src/database/data-source.js';
import { app } from '../../src/app.js';
import { User, UserRole } from '../../src/modules/user/user.entity.js';
import { Job } from '../../src/modules/job/job.entity.js';
import { ProfileView } from '../../src/modules/candidate/profile-view.entity.js';
import { signSession } from '../../src/modules/auth/auth.service.js';

async function main() {
  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);
  const views = AppDataSource.getRepository(ProfileView);
  const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const api = axios.create({
    baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    validateStatus: () => true,
  });
  try {
    const roles = [
      UserRole.CANDIDATE,
      UserRole.RECRUITER,
      UserRole.RECRUITER,
      UserRole.ADMIN,
    ];
    const fixtures = await users.save(
      ids.map((userId, i) =>
        users.create({
          userId,
          role: roles[i],
          name: `Ritik integration ${i}`,
          email: `ritik-${userId}@example.invalid`,
          mobile: `test-${userId}`,
          password: 'not-a-login-password',
          companyName: `Fixture company ${i}`,
        }),
      ),
    );
    const sessions = fixtures.map(signSession);
    const csrfResponse = await api.get('/api/auth/csrf');
    const csrf = csrfResponse.data.data.csrfToken;
    const csrfCookie = csrfResponse.headers['set-cookie']![0].split(';')[0];
    const headers = (i: number) => ({
      Cookie: `${csrfCookie}; jobdev_token=${sessions[i]}`,
      'X-CSRF-Token': csrf,
      Origin: 'http://localhost:3000',
    });
    const get = (url: string, i: number) =>
      api.get(url, { headers: headers(i) });
    const post = (url: string, i: number, data: unknown = {}) =>
      api.post(url, data, { headers: headers(i) });
    const recordUrl = `/api/candidates/${ids[0]}/views`;
    assert.equal((await api.get('/api/candidates/views')).status, 401);
    assert.equal((await get('/api/candidates/views', 0)).status, 403);
    assert.equal((await get('/api/candidates/views', 3)).status, 403);
    assert.equal((await get('/api/candidates/views/me', 1)).status, 403);
    assert.equal(
      (await get('/api/candidates/views/me', 0)).data.data.totalViews,
      0,
    );
    const read = await get(`/api/candidates/${ids[0]}`, 1);
    assert.equal(read.status, 200);
    for (const field of ['password', 'otpHash', 'resumePdf', 'sessionVersion'])
      assert(!(field in read.data.data.candidate));
    assert.equal(
      await views.countBy({ candidateId: ids[0] }),
      0,
      'GET must not record a view',
    );
    assert.equal(
      (
        await api.post(
          recordUrl,
          {},
          { headers: { Cookie: `jobdev_token=${sessions[1]}` } },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await api.post(
          recordUrl,
          {},
          { headers: { ...headers(1), Origin: 'https://evil.example' } },
        )
      ).status,
      403,
    );
    assert.equal((await post(recordUrl, 0)).status, 403);
    assert.equal((await post(recordUrl, 3)).status, 403);
    assert.equal(
      (await post('/api/candidates/not-a-uuid/views', 1)).status,
      400,
    );
    assert.equal(
      (await post(`/api/candidates/${randomUUID()}/views`, 1)).status,
      404,
    );
    assert.equal(
      (await post(`/api/candidates/${ids[2]}/views`, 1)).status,
      404,
    );
    const concurrent = await Promise.all(
      Array.from({ length: 8 }, () =>
        post(recordUrl, 1, { recruiterId: ids[2] }),
      ),
    );
    assert(concurrent.every((response) => response.status === 200));
    assert.equal(
      concurrent.filter((response) => response.data.data.created).length,
      1,
    );
    assert.equal(
      await views.countBy({ recruiterId: ids[1], candidateId: ids[0] }),
      1,
    );
    assert.equal(
      await views.countBy({ recruiterId: ids[2], candidateId: ids[0] }),
      0,
    );
    const first = await get('/api/candidates/views', 1);
    assert.equal(first.data.data.totalViews, 1);
    assert.equal(first.data.data.views[0].candidateName, fixtures[0].name);
    assert.equal(
      (await get(`/api/candidates/views?recruiterId=${ids[1]}`, 2)).data.data
        .totalViews,
      0,
    );
    await post(recordUrl, 2);
    assert.equal(
      (await get('/api/candidates/views/me', 0)).data.data.totalViews,
      2,
    );
    const repeated = await post(recordUrl, 1);
    assert.equal(repeated.data.data.created, false);
    assert.equal(
      (await get('/api/candidates/views', 1)).data.data.views[0].viewedAt,
      first.data.data.views[0].viewedAt,
    );

    const payload = {
      title: 'Ritik integration engineer',
      description: 'Build reliable services.',
      minimumQualifications: 'TypeScript\nSQL',
      preferredQualifications: 'React Query',
      salary: null,
      employmentType: 'Full-time',
      company: 'spoofed',
      postedBy: ids[2],
    };
    assert.equal((await post('/api/jobs', 0, payload)).status, 403);
    assert.equal(
      (await post('/api/jobs', 1, { ...payload, minimumQualifications: [] }))
        .status,
      400,
    );
    const created = await post('/api/jobs', 1, payload);
    assert.equal(created.status, 201);
    const job = created.data.data.job;
    assert.equal(job.company, fixtures[1].companyName);
    assert.equal(job.postedBy, ids[1]);
    const fromList = (await get('/api/jobs/mine', 1)).data.data.jobs.find(
      (entry: Job) => entry.id === job.id,
    );
    const fromCandidateList = (await api.get('/api/jobs')).data.data.jobs.find(
      (entry: Job) => entry.id === job.id,
    );
    for (const row of [fromList, fromCandidateList]) {
      assert.equal(row.description, payload.description);
      assert.equal(
        row.metadata.minimumQualifications,
        payload.minimumQualifications,
      );
      assert.equal(
        row.metadata.preferredQualifications,
        payload.preferredQualifications,
      );
      assert.equal(row.metadata.salary, null);
    }
    await users.update(ids[0], { isDeleted: true });
    assert.equal(
      (await get('/api/candidates/views', 1)).data.data.totalViews,
      0,
    );
    assert.equal((await post(recordUrl, 1)).status, 404);
    await users.delete(ids[0]);
    assert.equal(
      await views.countBy({ candidateId: ids[0] }),
      0,
      'FK cascade removes stale history',
    );
    console.log(
      'PASS: migrated table; cookie/CSRF/role guards; read-only GET; unique concurrent views; actor isolation; candidate count; real job field round-trip; soft deletion and FK cleanup.',
    );
  } finally {
    await AppDataSource.getRepository(Job).delete({ postedBy: ids[1] });
    await users.delete(ids);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await AppDataSource.destroy();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
