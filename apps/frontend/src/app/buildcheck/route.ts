import { BUILD_ID } from '@/lib/build-id';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ id: BUILD_ID });
}
