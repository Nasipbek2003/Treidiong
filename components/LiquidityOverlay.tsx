'use client';

import { useEffect, useState } from 'react';
import { VisualizationData } from '@/lib/liquidity';

interface Props {
  symbol: string;
  candles: any[];
  onVisualizationData?: (data: VisualizationData) => void;
}

export default function LiquidityOverlay({ symbol, candles, onVisualizationData }: Props) {
  const [vizData, setVizData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);

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
          if (onVisualizationData) {
            onVisualizationData(data.visualization);
          }
        }
      } catch (error) {
        console.error('Failed to fetch visualization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisualization();
  }, [symbol, candles.length]);

  if (!vizData) return null;

  return (
    <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 max-w-xs z-10">
      <h3 className="text-sm font-semibold text-white mb-3">💧 Liquidity Zones</h3>
      
      {/* Active Pools */}
      {vizData.pools.filter(p => p.status === 'active').length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">Active Pools:</p>
          {vizData.pools
            .filter(p => p.status === 'active')
            .slice(0, 5)
            .map(pool => (
              <div key={pool.id} className="flex items-center gap-2 text-xs mb-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: pool.color }}
                />
                <span className="text-gray-300">
                  {pool.label}: ${pool.price.toFixed(2)}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Recent Sweeps */}
      {vizData.sweeps.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">Recent Sweeps:</p>
          {vizData.sweeps.slice(-3).map(sweep => (
            <div key={sweep.id} className="flex items-center gap-2 text-xs mb-1">
              <span className="text-xl">{sweep.direction === 'up' ? '⬆️' : '⬇️'}</span>
              <span className="text-gray-300">
                ${sweep.price.toFixed(2)} ({(sweep.wickSize * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Structure Changes */}
      {vizData.structures.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">Structure:</p>
          {vizData.structures.slice(-2).map(structure => (
            <div key={structure.id} className="flex items-center gap-2 text-xs mb-1">
              <span className="text-xl">{structure.icon}</span>
              <span className="text-gray-300">
                {structure.type} {structure.direction === 'up' ? '⬆️' : '⬇️'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Signals */}
      {vizData.signals.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Signal:</p>
          {vizData.signals.slice(-1).map(signal => (
            <div key={signal.id} className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className={signal.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                  {signal.direction}
                </span>
                <span className="text-gray-300">
                  Score: {signal.score.toFixed(0)}/100
                </span>
              </div>
              <div className="text-gray-400 text-[10px]">
                Entry: ${signal.entryPrice.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-xs text-gray-500 mt-2">
          Analyzing liquidity...
        </div>
      )}
    </div>
  );
}
