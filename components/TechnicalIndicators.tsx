'use client';

import { TechnicalIndicators } from '@/types';

interface Props {
  indicators: TechnicalIndicators;
}

export default function TechnicalIndicatorsCard({ indicators }: Props) {
  const getRSIStatus = (rsi: number) => {
    if (rsi < 30) return { text: 'Перепродан', class: 'bullish' };
    if (rsi > 70) return { text: 'Перекуплен', class: 'bearish' };
    return { text: 'Нейтрально', class: 'neutral' };
  };

  const rsiStatus = getRSIStatus(indicators.rsi);

  return (
    <div className="card">
      <h2>Технические индикаторы</h2>
      
      <div className="metric">
        <span className="metric-label">RSI (14)</span>
        <span className={`metric-value ${rsiStatus.class}`}>
          {indicators.rsi.toFixed(2)} - {rsiStatus.text}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">MACD</span>
        <span className={`metric-value ${indicators.macd.histogram > 0 ? 'bullish' : 'bearish'}`}>
          {indicators.macd.value.toFixed(2)} ({indicators.macd.histogram > 0 ? '↑' : '↓'})
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">SMA 20</span>
        <span className="metric-value">${indicators.sma20.toFixed(2)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">SMA 50</span>
        <span className="metric-value">${indicators.sma50.toFixed(2)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">SMA 200</span>
        <span className="metric-value">${indicators.sma200.toFixed(2)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">Bollinger Bands</span>
        <span className="metric-value">
          ${indicators.bollingerBands.lower.toFixed(2)} - ${indicators.bollingerBands.upper.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
