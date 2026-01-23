'use client';

import { useState } from 'react';

interface Props {
  currentPrice: number;
  support: number[];
  resistance: number[];
}

export default function RiskCalculator({ currentPrice, support, resistance }: Props) {
  const [capital, setCapital] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(2);

  const stopLoss = support[0] || currentPrice * 0.95;
  const takeProfit = resistance[0] || currentPrice * 1.05;
  
  const riskAmount = capital * (riskPercent / 100);
  const priceRisk = currentPrice - stopLoss;
  const positionSize = priceRisk > 0 ? riskAmount / priceRisk : 0;
  const potentialProfit = (takeProfit - currentPrice) * positionSize;
  const riskRewardRatio = priceRisk > 0 ? (takeProfit - currentPrice) / priceRisk : 0;

  return (
    <div className="card">
      <h2>Риск-менеджмент</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '6px', color: '#787b86', fontSize: '0.9rem' }}>
          Капитал: ${capital}
        </label>
        <input 
          type="range" 
          min="1000" 
          max="100000" 
          step="1000"
          value={capital}
          onChange={(e) => setCapital(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '6px', color: '#787b86', fontSize: '0.9rem' }}>
          Риск на сделку: {riskPercent}%
        </label>
        <input 
          type="range" 
          min="0.5" 
          max="5" 
          step="0.5"
          value={riskPercent}
          onChange={(e) => setRiskPercent(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div className="metric">
        <span className="metric-label">Размер позиции</span>
        <span className="metric-value">{positionSize.toFixed(2)} унций</span>
      </div>

      <div className="metric">
        <span className="metric-label">Стоп-лосс</span>
        <span className="metric-value bearish">${stopLoss.toFixed(2)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">Тейк-профит</span>
        <span className="metric-value bullish">${takeProfit.toFixed(2)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">Риск на сделку</span>
        <span className="metric-value bearish">${riskAmount.toFixed(2)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">Потенциальная прибыль</span>
        <span className="metric-value bullish">${potentialProfit.toFixed(2)}</span>
      </div>

      <div className="metric">
        <span className="metric-label">Risk/Reward</span>
        <span className={`metric-value ${riskRewardRatio >= 2 ? 'bullish' : 'bearish'}`}>
          1:{riskRewardRatio.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
