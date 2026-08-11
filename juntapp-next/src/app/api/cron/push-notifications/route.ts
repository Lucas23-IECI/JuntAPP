import { NextResponse } from 'next/server';
import { processPendingPushJobs } from '@/lib/web-push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const results = await processPendingPushJobs(50);
  return NextResponse.json({ processed: results.length, results });
}
