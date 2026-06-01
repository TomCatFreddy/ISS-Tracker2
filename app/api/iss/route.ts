import { NextResponse } from 'next/server';
import type { IssPosition } from '@/lib/iss';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPSTREAM_URL = 'https://api.wheretheiss.at/v1/satellites/25544';

export async function GET() {
  try {
    const res = await fetch(UPSTREAM_URL, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as Record<string, unknown>;

    const position: IssPosition = {
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      altitude: Number(data.altitude),
      velocity: Number(data.velocity),
      timestamp: Number(data.timestamp),
    };

    if (
      !Number.isFinite(position.latitude) ||
      !Number.isFinite(position.longitude) ||
      !Number.isFinite(position.altitude) ||
      !Number.isFinite(position.velocity) ||
      !Number.isFinite(position.timestamp)
    ) {
      return NextResponse.json(
        { error: 'Upstream returned malformed data' },
        { status: 502 },
      );
    }

    return NextResponse.json(position);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to reach upstream: ${message}` },
      { status: 502 },
    );
  }
}
