import { NextRequest, NextResponse } from 'next/server';
import { LiquidityEngine } from '@/lib/liquidity';
import { loadConfig } from '@/lib/liquidity/config';

const engineInstance = new LiquidityEngine(loadConfig());

export async function GET(request: NextRequest) {
  try {
    const store = engineInstance.getStore();
    const signals = store.getRecentSignals(1);

    if (signals.length === 0) {
      return NextResponse.json({
        signal: null,
        message: 'No recent signals',
      });
    }

    const latestSignal = signals[0];

    return NextResponse.json({
      signal: latestSignal,
      score: latestSignal.score,
      reasoning: latestSignal.reasoning,
    });
  } catch (error) {
    console.error('Get signal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
