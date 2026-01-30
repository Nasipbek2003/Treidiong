'use client';

import { useEffect, useState } from 'react';
import { VisualizationData } from '@/lib/liquidity';
import { formatPrice } from '@/lib/formatPrice';

interface Props {
  symbol: string;
  candles: any[];
  currentPrice: number;
}

export default function LiquidityIndicators({ symbol, candles, currentPrice }: Props) {
  const [vizData, setVizData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Функция для форматирования цены с правильным количеством знаков
  const formatValue = (value: number) => {
    return formatPrice(value, symbol);
  };

  useEffect(() => {
    if (!candles || candles.length === 0) return;

    const fetchVisualization = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/liquidity/visualization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, candles }),
        });

        if (response.ok) {
          const data = await response.json();
          setVizData(data.visualization);
        }
      } catch (error) {
        console.error('Failed to fetch liquidity data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisualization();
  }, [symbol, candles.length]);

  if (loading) {
    return (
      <div className="card">
        <h2>💧 Liquidity Zones</h2>
        <div className="text-sm text-gray-400">Analyzing liquidity...</div>
      </div>
    );
  }

  if (!vizData) return null;

  // Находим ближайшие pools к текущей цене
  const nearbyPools = vizData.pools
    .filter(p => p.status === 'active')
    .map(p => ({
      ...p,
      distance: Math.abs(p.price - currentPrice),
      distancePercent: (Math.abs(p.price - currentPrice) / currentPrice) * 100,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  const recentSweeps = vizData.sweeps.slice(-3);
  const recentStructures = vizData.structures.slice(-2);
  const latestSignal = vizData.signals[vizData.signals.length - 1];

  return (
    <div className="card">
      <h2>💧 Liquidity Zones</h2>

      {/* Nearby Pools */}
      {nearbyPools.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Ближайшие зоны ликвидности:</div>
          {nearbyPools.map(pool => (
            <div key={pool.id} className="metric">
              <span className="metric-label flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: pool.color }}
                />
                {pool.type === 'equal_highs' && 'Equal Highs'}
                {pool.type === 'equal_lows' && 'Equal Lows'}
                {pool.type === 'pdh' && 'PDH'}
                {pool.type === 'pdl' && 'PDL'}
                {pool.type === 'asian_high' && 'Asian High'}
                {pool.type === 'asian_low' && 'Asian Low'}
                {pool.type === 'range_high' && 'Range High'}
                {pool.type === 'range_low' && 'Range Low'}
              </span>
              <span className="metric-value">
                {formatValue(pool.price)}
                <span className="text-xs text-gray-400 ml-2">
                  ({pool.distancePercent.toFixed(2)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Sweeps */}
      {recentSweeps.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">⚠️ Недавние Sweeps:</div>
          {recentSweeps.map(sweep => (
            <div key={sweep.id} className="metric">
              <span className="metric-label">
                {sweep.direction === 'up' ? '⬆️' : '⬇️'} Sweep
              </span>
              <span className="metric-value">
                {formatValue(sweep.price)}
                <span className="text-xs text-gray-400 ml-2">
                  (фитиль: {(sweep.wickSize * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
          ))}
          <div className="text-xs text-yellow-400 mt-2">
            💡 Smart Money собрал ликвидность! Возможен разворот.
          </div>
        </div>
      )}

      {/* Structure Changes */}
      {recentStructures.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">📊 Структура рынка:</div>
          {recentStructures.map(structure => (
            <div key={structure.id} className="metric">
              <span className="metric-label">
                {structure.icon} {structure.type}
              </span>
              <span className={`metric-value ${structure.direction === 'up' ? 'bullish' : 'bearish'}`}>
                {structure.direction === 'up' ? '⬆️' : '⬇️'} {formatValue(structure.price)}
                <span className="text-xs text-gray-400 ml-2">
                  ({(structure.significance * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Trading Signal */}
      {latestSignal && (
        <div className="mb-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="text-xs text-gray-400 mb-2">🎯 Liquidity Engine Signal:</div>
          <div className="metric">
            <span className="metric-label">Направление</span>
            <span className={`metric-value ${latestSignal.direction === 'BUY' ? 'bullish' : 'bearish'}`}>
              {latestSignal.direction}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Score</span>
            <span className="metric-value">
              {latestSignal.score.toFixed(0)}/100
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Entry</span>
            <span className="metric-value">{formatValue(latestSignal.entryPrice)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Stop Loss</span>
            <span className="metric-value">{formatValue(latestSignal.stopLoss)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Take Profit</span>
            <span className="metric-value">{formatValue(latestSignal.takeProfit)}</span>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-700">
        <div className="flex justify-between">
          <span>Всего pools:</span>
          <span>{vizData.pools.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Активных:</span>
          <span className="text-green-400">
            {vizData.pools.filter(p => p.status === 'active').length}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Swept:</span>
          <span className="text-gray-400">
            {vizData.pools.filter(p => p.status === 'swept').length}
          </span>
        </div>
      </div>
    </div>
  );
}
