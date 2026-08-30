import { NextRequest, NextResponse } from 'next/server';
import { PathaoService } from '@/lib/courier/pathao/service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'cities';

  const service = new PathaoService({
    clientId: process.env.PATHAO_CLIENT_ID || 'demo_client_id',
    clientSecret: process.env.PATHAO_CLIENT_SECRET || 'demo_client_secret',
    username: process.env.PATHAO_USERNAME || 'demo@artisanbd.com',
    password: process.env.PATHAO_PASSWORD || 'demo_password',
  });

  try {
    if (type === 'stores') {
      const stores = await service.getStores();
      return NextResponse.json({ success: true, data: stores });
    }

    if (type === 'cities') {
      const cities = await service.getCities();
      return NextResponse.json({ success: true, data: cities });
    }

    if (type === 'zones') {
      const cityId = parseInt(searchParams.get('cityId') || '1', 10);
      const zones = await service.getZones(cityId);
      return NextResponse.json({ success: true, data: zones });
    }

    if (type === 'areas') {
      const zoneId = parseInt(searchParams.get('zoneId') || '14', 10);
      const areas = await service.getAreas(zoneId);
      return NextResponse.json({ success: true, data: areas });
    }

    return NextResponse.json({ error: 'Unknown geo query type' }, { status: 400 });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const service = new PathaoService({
      clientId: process.env.PATHAO_CLIENT_ID || 'demo_client_id',
      clientSecret: process.env.PATHAO_CLIENT_SECRET || 'demo_client_secret',
      username: process.env.PATHAO_USERNAME || 'demo@artisanbd.com',
      password: process.env.PATHAO_PASSWORD || 'demo_password',
    });

    const price = await service.calculatePrice(body);
    return NextResponse.json({ success: true, data: price });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
