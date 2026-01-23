'use client';

import { useEffect, useState } from 'react';
import { fetchInterestRates, fetchInflationRate } from '@/lib/api';

export default function EconomicData() {
  const [interestRate, setInterestRate] = useState<number | null>(null);
  const [inflation, setInflation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEconomicData();
  }, []);

  const loadEconomicData = async () => {
    try {
      const [rate, infl] = await Promise.all([
        fetchInterestRates(),
        fetchInflationRate()
      ]);
      setInterestRate(rate);
      setInflation(infl);
    } catch (error) {
      console.error('Economic data error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Макроэкономика</h2>
        <p style={{ color: '#787b86', fontSize: '0.9rem' }}>Загрузка данных ФРС...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Макроэкономика (США)</h2>
      
      <div className="metric">
        <span className="metric-label">Процентная ставка ФРС</span>
        <span className="metric-value">
          {interestRate !== null ? `${interestRate.toFixed(2)}%` : 'Н/Д'}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">Инфляция (годовая)</span>
        <span className={`metric-value ${inflation && inflation > 3 ? 'bearish' : 'bullish'}`}>
          {inflation !== null ? `${inflation.toFixed(2)}%` : 'Н/Д'}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">Влияние на золото</span>
        <span className="metric-value neutral">
          {interestRate && interestRate > 4 ? 'Негативное' : 'Позитивное'}
        </span>
      </div>

      <p style={{ color: '#787b86', fontSize: '0.85rem', marginTop: '12px', lineHeight: '1.5' }}>
        Высокие ставки снижают привлекательность золота. 
        Высокая инфляция поддерживает цены.
      </p>
    </div>
  );
}
