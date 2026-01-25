import { NextRequest, NextResponse } from 'next/server';
import { LiquidityEngine } from '@/lib/liquidity';
import { loadConfig } from '@/lib/liquidity/config';
import { Candlestick } from '@/lib/liquidity/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, candles, rsiData } = body;

    if (!symbol || !candles || !Array.isArray(candles)) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, candles' },
        { status: 400 }
      );
    }

    const config = loadConfig();
    const engine = new LiquidityEngine(config);

    const result = await engine.analyze(symbol, candles as Candlestick[], rsiData);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Liquidity analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
