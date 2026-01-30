'use client';

import { useState } from 'react';
import { MarketAnalysis, PriceData, TechnicalIndicators } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

interface Props {
  analysis: MarketAnalysis;
  currentPrice: number;
  asset: string;
  priceData: PriceData[];
  indicators: TechnicalIndicators;
}

interface MTFAnalysis {
  d1Trend: 'bullish' | 'bearish' | 'sideways';
  d1Structure: string;
  h4Phase: 'impulse' | 'correction' | 'consolidation';
  h4Zone: string;
  h1Structure: string;
  h1Confirmation: boolean;
  m15Entry: string;
  recommendation: 'BUY' | 'SELL' | 'WAIT';
  reasoning: string[];
}

export default function MarketAnalysisCard({ analysis, currentPrice, asset, priceData, indicators }: Props) {
  const [loading, setLoading] = useState(false);
  const [mtfAnalysis, setMtfAnalysis] = useState<MTFAnalysis | null>(null);

  const analyzeMarket = async () => {
    setLoading(true);
    try {
      // Получаем canvas графика для анализа
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('График не найден');
      }

      // Конвертируем canvas в base64
      const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

      const response = await fetch('/api/mtf-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          context: {
            asset,
            currentPrice,
            indicators,
            analysis,
            priceData
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMtfAnalysis(data.analysis);
    } catch (error: any) {
      console.error('MTF Analysis error:', error);
      alert(`Ошибка анализа: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    if (rec === 'BUY') return '#10b981';
    if (rec === 'SELL') return '#ef4444';
    return '#fbbf24';
  };

  const getRecommendationIcon = (rec: string) => {
    if (rec === 'BUY') return '📈';
    if (rec === 'SELL') return '📉';
    return '⏸';
  };

  return (
    <div className="card">
      <h2>Анализ рынка (Мульти-таймфрейм)</h2>
      
      <div className="metric">
        <span className="metric-label">Текущая цена</span>
        <span className="metric-value">{formatPrice(currentPrice, asset)}</span>
      </div>

      <button
        onClick={analyzeMarket}
        disabled={loading}
        style={{
          width: '100%',
          padding: '1rem',
          marginTop: '1rem',
          background: loading ? '#4b5563' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {loading ? '⏳ Анализирую...' : '🔍 Анализ рынка'}
      </button>

      {mtfAnalysis && (
        <div style={{ marginTop: '1.5rem' }}>
          {/* Рекомендация */}
          <div style={{
            padding: '1.5rem',
            background: `linear-gradient(135deg, ${getRecommendationColor(mtfAnalysis.recommendation)}22 0%, ${getRecommendationColor(mtfAnalysis.recommendation)}11 100%)`,
            border: `2px solid ${getRecommendationColor(mtfAnalysis.recommendation)}`,
            borderRadius: '12px',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {getRecommendationIcon(mtfAnalysis.recommendation)}
            </div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              color: getRecommendationColor(mtfAnalysis.recommendation),
              marginBottom: '0.5rem'
            }}>
              {mtfAnalysis.recommendation}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
              Рекомендация по всем таймфреймам
            </div>
          </div>

          {/* Анализ по таймфреймам */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 'bold', 
              color: '#9ca3af',
              marginBottom: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '0.5rem'
            }}>
              1️⃣ Глобальный тренд (D1)
            </div>
            <div className="metric">
              <span className="metric-label">Направление</span>
              <span className={`metric-value ${mtfAnalysis.d1Trend}`}>
                {mtfAnalysis.d1Trend === 'bullish' ? '📈 Восходящий' : 
                 mtfAnalysis.d1Trend === 'bearish' ? '📉 Нисходящий' : '↔️ Флет'}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Структура</span>
              <span className="metric-value">{mtfAnalysis.d1Structure}</span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 'bold', 
              color: '#9ca3af',
              marginBottom: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '0.5rem'
            }}>
              2️⃣ Фаза рынка (H4)
            </div>
            <div className="metric">
              <span className="metric-label">Фаза</span>
              <span className="metric-value">
                {mtfAnalysis.h4Phase === 'impulse' ? '⚡ Импульс' :
                 mtfAnalysis.h4Phase === 'correction' ? '🔄 Коррекция' : '📊 Консолидация'}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Зона</span>
              <span className="metric-value">{mtfAnalysis.h4Zone}</span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 'bold', 
              color: '#9ca3af',
              marginBottom: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '0.5rem'
            }}>
              3️⃣ Структура рынка (H1)
            </div>
            <div className="metric">
              <span className="metric-label">Локальная структура</span>
              <span className="metric-value">{mtfAnalysis.h1Structure}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Подтверждение D1</span>
              <span className={`metric-value ${mtfAnalysis.h1Confirmation ? 'bullish' : 'bearish'}`}>
                {mtfAnalysis.h1Confirmation ? '✅ Да' : '❌ Нет'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 'bold', 
              color: '#9ca3af',
              marginBottom: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '0.5rem'
            }}>
              4️⃣ Точка входа (M15/M5)
            </div>
            <div className="metric">
              <span className="metric-label">Условия входа</span>
              <span className="metric-value" style={{ fontSize: '0.85rem' }}>
                {mtfAnalysis.m15Entry}
              </span>
            </div>
          </div>

          {/* Обоснование */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 'bold', 
              color: '#9ca3af',
              marginBottom: '0.75rem'
            }}>
              5️⃣ Обоснование решения:
            </div>
            {mtfAnalysis.reasoning.map((reason, index) => (
              <div key={index} style={{ 
                fontSize: '0.85rem', 
                color: '#d1d5db',
                marginBottom: '0.5rem',
                paddingLeft: '1rem',
                position: 'relative'
              }}>
                <span style={{ 
                  position: 'absolute', 
                  left: 0,
                  color: getRecommendationColor(mtfAnalysis.recommendation)
                }}>
                  •
                </span>
                {reason}
              </div>
            ))}
          </div>
        </div>
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
        .sideways {
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
}
