import { NextRequest, NextResponse } from 'next/server';
import { LiquidityEngine } from '@/lib/liquidity';
import { loadConfig } from '@/lib/liquidity/config';

const engineInstance = new LiquidityEngine(loadConfig());

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const store = engineInstance.getStore();
    let pools = store.getState().pools;

    if (status === 'active') {
      pools = store.getActivePools();
    } else if (status === 'swept') {
      pools = store.getSweptPools();
    }

    return NextResponse.json({ pools });
  } catch (error) {
    console.error('Get pools error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
