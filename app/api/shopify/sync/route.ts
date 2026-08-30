import { NextResponse } from 'next/server';
import { syncHistoricalOrdersAction } from '@/lib/actions/sync-actions';

export async function POST() {
  const result = await syncHistoricalOrdersAction();
  return NextResponse.json(result);
}
