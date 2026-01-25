import { NextRequest, NextResponse } from 'next/server';
import { LiquidityEngine, Visualization } from '@/lib/liquidity';
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
    const visualization = new Visualization();

    // Полный анализ
    const analysis = await engine.analyze(symbol, candles as Candlestick[], rsiData);

    // Генерация данных для визуализации
    const vizData = visualization.generateVisualizationData(
      analysis.pools,
      analysis.sweeps,
      analysis.structures,
      analysis.signal ? [analysis.signal] : [],
      candles
    );

    return NextResponse.json({
      visualization: vizData,
      analysis: {
        hasValidSetup: analysis.hasValidSetup,
        blockingReasons: analysis.blockingReasons,
      },
    });
  } catch (error) {
    console.error('Visualization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
