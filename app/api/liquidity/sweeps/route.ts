import { NextRequest, NextResponse } from 'next/server';
import { LiquidityEngine } from '@/lib/liquidity';
import { loadConfig } from '@/lib/liquidity/config';

const engineInstance = new LiquidityEngine(loadConfig());

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const store = engineInstance.getStore();
    let sweeps = store.getState().sweeps;

    if (startTime && endTime) {
      sweeps = store.getSweepsInRange(
        parseInt(startTime),
        parseInt(endTime)
      );
    }

    return NextResponse.json({ sweeps });
  } catch (error) {
    console.error('Get sweeps error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
