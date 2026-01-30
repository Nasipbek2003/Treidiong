'use client';

import { TechnicalIndicators } from '@/types';
import { useState } from 'react';
import { formatPrice } from '@/lib/formatPrice';

interface Props {
  indicators: TechnicalIndicators;
  asset?: string;
}

export default function TechnicalIndicatorsCard({ indicators, asset = 'XAU/USD' }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Функция для форматирования цены с правильным количеством знаков
  const formatValue = (value: number) => {
    return formatPrice(value, asset);
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi < 30) return { text: 'Перепродан', class: 'bullish' };
    if (rsi > 70) return { text: 'Перекуплен', class: 'bearish' };
    return { text: 'Нейтрально', class: 'neutral' };
  };

  const getADXStatus = (adx: number) => {
    if (adx > 25) return { text: 'Сильный тренд', class: 'bullish' };
    if (adx > 20) return { text: 'Средний тренд', class: 'neutral' };
    return { text: 'Слабый тренд / Флет', class: 'bearish' };
  };

  const rsiStatus = getRSIStatus(indicators.rsi);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Технические индикаторы</h2>
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {showAdvanced ? 'Скрыть расширенные' : 'Показать все'}
        </button>
      </div>
      
      {/* Основные индикаторы (всегда видимые) */}
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
        <span className="metric-label">EMA 12/26/50</span>
        <span className="metric-value">
          {formatValue(indicators.ema12 || 0)} / {formatValue(indicators.ema26 || 0)} / {formatValue(indicators.ema50 || 0)}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">SMA 20/50/200</span>
        <span className="metric-value">
          {formatValue(indicators.sma20)} / {formatValue(indicators.sma50)} / {formatValue(indicators.sma200)}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">Bollinger Bands</span>
        <span className="metric-value">
          {formatValue(indicators.bollingerBands.lower)} - {formatValue(indicators.bollingerBands.upper)}
        </span>
      </div>

      {indicators.atr && (
        <div className="metric">
          <span className="metric-label">ATR (14)</span>
          <span className="metric-value">{indicators.atr.toFixed(5)}</span>
        </div>
      )}

      {/* Расширенные индикаторы (показываются по клику) */}
      {showAdvanced && (
        <>
          {indicators.adx && (
            <>
              <div className="metric">
                <span className="metric-label">ADX (14)</span>
                <span className={`metric-value ${getADXStatus(indicators.adx.adx).class}`}>
                  {indicators.adx.adx.toFixed(2)} - {getADXStatus(indicators.adx.adx).text}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">+DI / -DI</span>
                <span className="metric-value">
                  {indicators.adx.plusDI.toFixed(2)} / {indicators.adx.minusDI.toFixed(2)}
                </span>
              </div>
            </>
          )}

          {indicators.stochasticRSI && (
            <div className="metric">
              <span className="metric-label">Stochastic RSI</span>
              <span className={`metric-value ${
                indicators.stochasticRSI.k < 20 ? 'bullish' : 
                indicators.stochasticRSI.k > 80 ? 'bearish' : 'neutral'
              }`}>
                K: {indicators.stochasticRSI.k.toFixed(2)} / D: {indicators.stochasticRSI.d.toFixed(2)}
              </span>
            </div>
          )}

          {indicators.superTrend && (
            <div className="metric">
              <span className="metric-label">SuperTrend</span>
              <span className={`metric-value ${indicators.superTrend.direction === 'BUY' ? 'bullish' : 'bearish'}`}>
                {indicators.superTrend.direction} @ {formatValue(indicators.superTrend.value)}
              </span>
            </div>
          )}

          {indicators.ichimoku && (
            <>
              <div className="metric">
                <span className="metric-label">Ichimoku Signal</span>
                <span className={`metric-value ${
                  indicators.ichimoku.signal === 'bullish' ? 'bullish' : 
                  indicators.ichimoku.signal === 'bearish' ? 'bearish' : 'neutral'
                }`}>
                  {indicators.ichimoku.signal === 'bullish' ? 'Бычий' : 
                   indicators.ichimoku.signal === 'bearish' ? 'Медвежий' : 'Нейтральный'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Tenkan / Kijun</span>
                <span className="metric-value">
                  {formatValue(indicators.ichimoku.tenkan)} / {formatValue(indicators.ichimoku.kijun)}
                </span>
              </div>
            </>
          )}

          {indicators.obv !== undefined && (
            <div className="metric">
              <span className="metric-label">OBV</span>
              <span className="metric-value">
                {indicators.obv.toFixed(0)}
                {indicators.obvDivergence?.hasDivergence && (
                  <span className={indicators.obvDivergence.type === 'bullish' ? 'bullish' : 'bearish'}>
                    {' '}({indicators.obvDivergence.type === 'bullish' ? '↑ Бычья дивергенция' : '↓ Медвежья дивергенция'})
                  </span>
                )}
              </span>
            </div>
          )}

          {indicators.volumeSMA && (
            <div className="metric">
              <span className="metric-label">Volume SMA (20)</span>
              <span className="metric-value">{indicators.volumeSMA.toFixed(0)}</span>
            </div>
          )}

          {indicators.cvd !== undefined && (
            <div className="metric">
              <span className="metric-label">CVD (Cumulative Volume Delta)</span>
              <span className={`metric-value ${indicators.cvd > 0 ? 'bullish' : 'bearish'}`}>
                {indicators.cvd.toFixed(0)}
              </span>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .metric {
          margin-bottom: 0.75rem;
        }
        .bullish {
          color: #10b981;
        }
        .bearish {
          color: #ef4444;
        }
        .neutral {
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
}
