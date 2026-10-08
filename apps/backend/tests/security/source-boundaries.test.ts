import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(path.join(root, entry.name))
    : /\.tsx?$/.test(entry.name) ? [path.join(root, entry.name)] : []);
}
const frontend = path.resolve(process.cwd(), '../frontend/src');
describe('auth transport boundaries', () => {
  it('uses no fetch transport in application source', () => {
    for (const file of [...files(frontend), ...files(path.resolve('src'))]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\bfetch\s*\(/);
    }
  });
  it('has no web storage access outside deletion-only legacy cleanup', () => {
    for (const file of files(frontend).filter(file => !file.endsWith('clear-legacy-storage.ts'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/localStorage|sessionStorage/);
    }
    const cleanup = readFileSync(path.join(frontend, 'lib/clear-legacy-storage.ts'), 'utf8');
    expect(cleanup).toContain('removeItem'); expect(cleanup).not.toMatch(/getItem|setItem/);
  });
  it('does not read a public ATS API key', () => {
    for (const file of files(frontend)) expect(readFileSync(file, 'utf8'), file).not.toContain('NEXT_PUBLIC_ATS_API_KEY');
  });
});
