import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  updateProfileSchema,
  verifyOtpSchema,
} from '../../src/modules/auth/auth.schema.js';
import { accountFields } from '../../src/modules/user/user.repository.js';
function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(root, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [path.join(root, entry.name)]
        : [],
  );
}
describe('query data boundaries', () => {
  it('does not issue API requests inside effects', () => {
    for (const file of files(path.resolve('../frontend/src'))) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          /^(React\.)?useEffect$/.test(node.expression.getText(source))
        ) {
          const effect = node.arguments[0]?.getText(source) ?? '';
          expect(effect, file).not.toMatch(
            /\b(?:apiGet|apiPost|apiPut|apiPatch|apiDelete|apiBlob|apiClient|api|axios|\w+Request)\s*[.(]/,
          );
          expect(effect, file).not.toMatch(
            /\b(?:window\.)?location\.(?:reload|assign|replace)\s*\(/,
          );
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  });
  it('keeps heavy resume columns out of ordinary account queries', () => {
    for (const key of ['resumeData', 'resumeCanvas', 'resumePdf'])
      expect(accountFields).not.toHaveProperty(key);
    expect(accountFields).toMatchObject({
      userId: true,
      sessionVersion: true,
      isDeleted: true,
      role: true,
      parsedProfile: true,
    });
  });
  it('accepts profile objects or null, but not redundant serialized JSON', () => {
    expect(
      updateProfileSchema.safeParse({
        parsedProfile: { skills: ['TypeScript'] },
      }).success,
    ).toBe(true);
    expect(updateProfileSchema.safeParse({ parsedProfile: null }).success).toBe(
      true,
    );
    expect(
      updateProfileSchema.safeParse({ parsedProfile: '{"skills":[]}' }).success,
    ).toBe(false);
  });
  it('requires a six-digit OTP', () => {
    expect(
      verifyOtpSchema.safeParse({
        identifier: 'test@example.com',
        otp: '123456',
      }).success,
    ).toBe(true);
    expect(
      verifyOtpSchema.safeParse({
        identifier: 'test@example.com',
        otp: 'abc123',
      }).success,
    ).toBe(false);
  });
});
