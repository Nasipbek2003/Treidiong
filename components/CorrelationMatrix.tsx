'use client';

import { useEffect, useState } from 'react';
import { fetchDollarIndex, fetchCommodityData, calculateCorrelation } from '@/lib/api';
import { PriceData } from '@/types';

interface Props {
  goldPrices: number[];
}

export default function CorrelationMatrix({ goldPrices }: Props) {
  const [correlations, setCorrelations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCorrelations();
  }, [goldPrices]);

  const loadCorrelations = async () => {
    try {
      const [dollarData, oilData] = await Promise.all([
        fetchDollarIndex().catch(() => null),
        fetchCommodityData('USOIL').catch(() => null)
      ]);

      const newCorrelations: Record<string, number> = {};

      if (dollarData) {
        const dollarPrices = dollarData.map(d => d.close);
        newCorrelations['Индекс доллара'] = await calculateCorrelation(goldPrices, dollarPrices);
      }

      if (oilData) {
        const oilPrices = oilData.map(d => d.close);
        newCorrelations['Нефть WTI'] = await calculateCorrelation(goldPrices, oilPrices);
      }

      setCorrelations(newCorrelations);
    } catch (error) {
      console.error('Correlation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCorrelationColor = (corr: number) => {
    if (corr > 0.5) return 'bullish';
    if (corr < -0.5) return 'bearish';
    return 'neutral';
  };

  const getCorrelationText = (corr: number) => {
    const abs = Math.abs(corr);
    if (abs > 0.7) return 'Сильная';
    if (abs > 0.4) return 'Средняя';
    return 'Слабая';
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Корреляции</h2>
        <p style={{ color: '#787b86', fontSize: '0.9rem' }}>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Корреляции</h2>
      
      {Object.entries(correlations).map(([asset, corr]) => (
        <div key={asset} className="metric">
          <span className="metric-label">{asset}</span>
          <span className={`metric-value ${getCorrelationColor(corr)}`}>
            {corr.toFixed(3)} ({getCorrelationText(corr)})
          </span>
        </div>
      ))}

      {Object.keys(correlations).length === 0 && (
        <p style={{ color: '#787b86', fontSize: '0.9rem' }}>Нет данных</p>
      )}

      <p style={{ color: '#787b86', fontSize: '0.85rem', marginTop: '12px', lineHeight: '1.5' }}>
        Корреляция от -1 до 1. Отрицательная с долларом означает обратную связь.
      </p>
    </div>
  );
}
