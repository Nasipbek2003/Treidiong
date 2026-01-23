'use client';

import { MarketAnalysis } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

interface Props {
  analysis: MarketAnalysis;
  currentPrice: number;
  asset: string;
}

export default function MarketAnalysisCard({ analysis, currentPrice, asset }: Props) {
  const trendText = {
    bullish: 'Восходящий',
    bearish: 'Нисходящий',
    sideways: 'Боковой'
  };

  const structureText = {
    HH: 'Higher High',
    HL: 'Higher Low',
    LH: 'Lower High',
    LL: 'Lower Low',
    RANGE: 'Диапазон'
  };

  return (
    <div className="card">
      <h2>Анализ рынка</h2>
      
      <div className="metric">
        <span className="metric-label">Тренд</span>
        <span className={`metric-value ${analysis.trend === 'sideways' ? 'neutral' : analysis.trend}`}>
          {trendText[analysis.trend]}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">Текущая цена</span>
        <span className="metric-value">${formatPrice(currentPrice, asset)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">Уровни поддержки</span>
        <span className="metric-value bullish">
          {analysis.support.map(s => `${formatPrice(s, asset)}`).join(', ') || 'Не найдено'}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">Уровни сопротивления</span>
        <span className="metric-value bearish">
          {analysis.resistance.map(r => `${formatPrice(r, asset)}`).join(', ') || 'Не найдено'}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">Волатильность (годовая)</span>
        <span className="metric-value">{analysis.volatility.toFixed(2)}%</span>
      </div>

      {analysis.marketStructure && (
        <>
          <div className="metric">
            <span className="metric-label">Структура рынка</span>
            <span className="metric-value">
              {structureText[analysis.marketStructure.type]}
            </span>
          </div>

          {analysis.marketStructure.breakOfStructure !== 'NONE' && (
            <div className="metric">
              <span className="metric-label">Break of Structure</span>
              <span className={`metric-value ${analysis.marketStructure.breakOfStructure === 'UP' ? 'bullish' : 'bearish'}`}>
                {analysis.marketStructure.breakOfStructure === 'UP' ? '↑ Вверх' : '↓ Вниз'}
              </span>
            </div>
          )}

          {analysis.marketStructure.liquiditySweep && (
            <div className="metric">
              <span className="metric-label">Liquidity Sweep</span>
              <span className="metric-value" style={{ color: '#ffa726' }}>
                {analysis.marketStructure.sweepDirection === 'UP' ? '↑ Вверх' : '↓ Вниз'}
              </span>
            </div>
          )}
        </>
      )}

      {analysis.volumeProfile && (
        <>
          <div className="metric">
            <span className="metric-label">Объем</span>
            <span className={`metric-value ${analysis.volumeProfile.isVolumeSpike ? 'bullish' : ''}`}>
              {analysis.volumeProfile.isVolumeSpike ? 'Всплеск' : 'Норма'} 
              {' '}({analysis.volumeProfile.volumeRatio.toFixed(1)}x)
            </span>
          </div>

          <div className="metric">
            <span className="metric-label">Цена-Объем</span>
            <span className={`metric-value ${analysis.volumeProfile.priceVolumeAlignment ? 'bullish' : 'bearish'}`}>
              {analysis.volumeProfile.priceVolumeAlignment ? 'Совпадают' : 'Расходятся'}
            </span>
          </div>
        </>
      )}

      <div className="metric">
        <span className="metric-label">Сигнал</span>
        <span className={`signal-badge signal-${analysis.signal}`}>
          {analysis.signal === 'buy' ? 'BUY' : analysis.signal === 'sell' ? 'SELL' : 'HOLD'}
        </span>
      </div>

      <div className="metric">
        <span className="metric-label">Уверенность</span>
        <span className="metric-value">{analysis.confidence.toFixed(0)}%</span>
      </div>
    </div>
  );
}
