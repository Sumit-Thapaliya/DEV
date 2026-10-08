import { toResumeDocument, type AtsGenerationResult } from './ats-service';
import {
  flowToCanvas,
  resumePdf,
  resumePdfFromCanvas,
  type CanvasDocument,
} from './demo-resume-pdf';
export interface SavedResume {
  fileName: string;
  dataBase64: string;
  uploadedAt: string | null;
  parsedProfile: Record<string, unknown> | null;
  canvas: CanvasDocument | null;
}
export function restoreFile(saved: SavedResume | null) {
  if (!saved) return null;
  const extension = saved.fileName.split('.').pop()?.toLowerCase();
  const type =
    extension === 'pdf'
      ? 'application/pdf'
      : extension === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/msword';
  return new File(
    [
      Uint8Array.from(atob(saved.dataBase64), (character) =>
        character.charCodeAt(0),
      ),
    ],
    saved.fileName,
    { type },
  );
}
export function restoreResult(
  saved: SavedResume | null,
): AtsGenerationResult | null {
  if (!saved?.parsedProfile && !saved?.canvas) return null;
  const canvas =
    saved.canvas ??
    (Array.isArray(saved.parsedProfile?.pages)
      ? (saved.parsedProfile as unknown as CanvasDocument)
      : null);
  const document = canvas ? undefined : toResumeDocument(saved.parsedProfile);
  return {
    ...(canvas ? resumePdfFromCanvas(canvas) : resumePdf(document!)),
    fileName: `${saved.fileName.replace(/\.[^.]+$/, '')}-ats-resume.pdf`,
    generatedAt: saved.uploadedAt ?? new Date().toISOString(),
    engine: 'service',
    note: 'Restored from your saved resume.',
    document,
    canvas: canvas ?? flowToCanvas(document!),
  };
}
