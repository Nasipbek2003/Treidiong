'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { PriceData } from '@/types';
import { TrendLine } from '@/lib/chartAnalysis';
import { VisualizationData } from '@/lib/liquidity';
import LiquidityOverlay from './LiquidityOverlay';

interface Props {
  data: PriceData[];
  sma20?: number[];
  sma50?: number[];
  trendLines?: TrendLine[];
  showLines?: boolean;
  showLiquidity?: boolean;
  symbol?: string;
}

export default function CandlestickChartWithLiquidity({ 
  data, 
  sma20, 
  sma50, 
  trendLines, 
  showLines = false,
  showLiquidity = true,
  symbol = 'XAUUSD'
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [vizData, setVizData] = useState<VisualizationData | null>(null);

  // Создаем график
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const containerWidth = chartContainerRef.current.clientWidth;
    const isMobile = containerWidth < 768;
    const chartHeight = isMobile ? window.innerHeight - 150 : window.innerHeight - 150;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e222d' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      width: containerWidth,
      height: chartHeight,
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
    });

    chartRef.current = chart;

    // Добавляем свечи
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeriesRef.current = candlestickSeries;

    const chartData = data.map(d => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(chartData);

    // Добавляем SMA линии
    if (sma20 && sma20.length > 0) {
      const sma20Series = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: 'SMA 20',
      });

      const sma20Data = sma20.map((value, index) => ({
        time: Math.floor(new Date(data[index].date).getTime() / 1000) as any,
        value,
      }));

      sma20Series.setData(sma20Data);
    }

    if (sma50 && sma50.length > 0) {
      const sma50Series = chart.addLineSeries({
        color: '#FF6D00',
        lineWidth: 2,
        title: 'SMA 50',
      });

      const sma50Data = sma50.map((value, index) => ({
        time: Math.floor(new Date(data[index].date).getTime() / 1000) as any,
        value,
      }));

      sma50Series.setData(sma50Data);
    }

    chart.timeScale().fitContent();

    // Cleanup
    return () => {
      chart.remove();
    };
  }, [data, sma20, sma50]);

  // Отрисовка liquidity pools как горизонтальных линий
  useEffect(() => {
    if (!chartRef.current || !vizData) return;

    // Добавляем горизонтальные линии для активных pools
    vizData.pools
      .filter(p => p.status === 'active')
      .forEach(pool => {
        const priceLine = candlestickSeriesRef.current?.createPriceLine({
          price: pool.price,
          color: pool.color,
          lineWidth: 2,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: pool.label,
        });
      });

  }, [vizData]);

  // Отрисовка маркеров для sweeps и structures
  useEffect(() => {
    if (!candlestickSeriesRef.current || !vizData) return;

    const markers: any[] = [];

    // Маркеры для sweeps
    vizData.sweeps.forEach(sweep => {
      markers.push({
        time: sweep.timestamp / 1000,
        position: sweep.direction === 'up' ? 'aboveBar' : 'belowBar',
        color: sweep.color,
        shape: sweep.direction === 'up' ? 'arrowUp' : 'arrowDown',
        text: `Sweep ${(sweep.wickSize * 100).toFixed(0)}%`,
      });
    });

    // Маркеры для structure changes
    vizData.structures.forEach(structure => {
      markers.push({
        time: structure.timestamp / 1000,
        position: structure.direction === 'up' ? 'belowBar' : 'aboveBar',
        color: structure.color,
        shape: 'circle',
        text: structure.type,
      });
    });

    // Маркеры для signals
    vizData.signals.forEach(signal => {
      markers.push({
        time: signal.timestamp / 1000,
        position: signal.direction === 'BUY' ? 'belowBar' : 'aboveBar',
        color: signal.color,
        shape: signal.direction === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `${signal.direction} ${signal.score.toFixed(0)}`,
        size: 2,
      });
    });

    candlestickSeriesRef.current.setMarkers(markers);

  }, [vizData]);

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} className="w-full" />
      
      {showLiquidity && (
        <LiquidityOverlay 
          symbol={symbol}
          candles={data}
          onVisualizationData={setVizData}
        />
      )}
    </div>
  );
}
