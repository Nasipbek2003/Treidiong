'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import TechnicalIndicatorsCard from '@/components/TechnicalIndicators';
import MarketAnalysisCard from '@/components/MarketAnalysis';
import RiskCalculator from '@/components/RiskCalculator';
import CorrelationMatrix from '@/components/CorrelationMatrix';
import EconomicData from '@/components/EconomicData';
import AIChat from '@/components/AIChat';
import { PriceData, TechnicalIndicators, MarketAnalysis } from '@/types';
import { calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands } from '@/lib/indicators';
import { performFullAnalysis } from '@/lib/analysis';
import { fetchIntraday, fetchLatestPrice, assetSymbols } from '@/lib/api';
import { formatPrice } from '@/lib/formatPrice';
import { analyzeChart, TrendLine } from '@/lib/chartAnalysis';

const CandlestickChart = dynamic(() => import('@/components/CandlestickChart'), { ssr: false });

export default function Home() {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState('GOLD');
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('15min');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showTrendLines, setShowTrendLines] = useState(true);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const loadingRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const symbol = assetSymbols[asset]?.twelve;
      if (!symbol) throw new Error('Символ не найден');

      console.log(`Loading ${symbol} with timeframe ${timeframe}`);

      const data = await fetchIntraday(symbol, timeframe);

      if (!data || data.length === 0) {
        throw new Error('Нет данных. API может быть перегружен.');
      }

      console.log(`Loaded ${data.length} candles, latest: ${formatPrice(data[data.length - 1]?.close, asset)}`);
      
      setPriceData(data);
      
      const prices = data.map(d => d.close);
      const calculatedIndicators: TechnicalIndicators = {
        rsi: calculateRSI(prices),
        macd: calculateMACD(prices),
        sma20: calculateSMA(prices, 20),
        sma50: calculateSMA(prices, 50),
        sma200: calculateSMA(prices, 200),
        bollingerBands: calculateBollingerBands(prices)
      };
      setIndicators(calculatedIndicators);
      
      const marketAnalysis = performFullAnalysis(data, calculatedIndicators);
      setAnalysis(marketAnalysis);
      
      // Анализируем линии тренда и уровни
      const chartAnalysis = analyzeChart(data);
      const allLines = [
        ...chartAnalysis.supports,
        ...chartAnalysis.resistances,
        ...chartAnalysis.trendLines
      ];
      setTrendLines(allLines);
      
    } catch (err: any) {
      console.error('Load data error:', err);
      const errorMsg = err.message || 'Неизвестная ошибка';
      
      if (errorMsg === 'API_LIMIT_EXCEEDED' || errorMsg.includes('run out of API credits')) {
        setError('⚠️ Лимит API исчерпан. Используются кешированные данные.');
        setAutoRefresh(false);
        // Не выбрасываем ошибку - данные уже загружены из кеша в fetchIntraday
      } else if (errorMsg.includes('429') || errorMsg.includes('limit')) {
        setError('Превышен лимит API. Подожди 1 минуту.');
        setAutoRefresh(false);
      } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
        setError('Ошибка API ключа. Проверь .env.local');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [asset, timeframe]);

  useEffect(() => {
    // Предотвращаем двойную загрузку в React Strict Mode
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    loadData().finally(() => {
      loadingRef.current = false;
    });
  }, [asset, timeframe, loadData]);

  useEffect(() => {
    if (!autoRefresh || loading) return;

    // Обновление цены каждые 5-15 секунд
    const interval = timeframe === '5min' ? 5000 : timeframe === '15min' ? 10000 : 15000;
    
    const timer = setInterval(async () => {
      try {
        const symbol = assetSymbols[asset]?.twelve;
        if (!symbol) return;

        const latestPrice = await fetchLatestPrice(symbol);
        
        setPriceData(prev => {
          if (prev.length === 0) return prev;
          
          const lastCandle = prev[prev.length - 1];
          
          // Обновляем последнюю свечу с новой ценой
          const updatedCandle = {
            ...lastCandle,
            close: latestPrice,
            high: Math.max(lastCandle.high, latestPrice),
            low: Math.min(lastCandle.low, latestPrice)
          };
          
          return [...prev.slice(0, -1), updatedCandle];
        });
      } catch (err: any) {
        console.error('Price update error:', err);
        // Отключаем автообновление при ошибке лимита
        if (err.message?.includes('API_LIMIT_EXCEEDED') || err.message?.includes('run out of API credits')) {
          setAutoRefresh(false);
          setError('⚠️ Лимит API исчерпан. Автообновление отключено.');
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [autoRefresh, asset, timeframe, loading]);

  if (loading) {
    return <div className="loading">⏳ Загрузка данных...</div>;
  }

  if (error) {
    return <div className="loading">❌ {error}</div>;
  }

  if (!indicators || !analysis || priceData.length === 0) {
    return <div className="loading">❌ Нет данных для отображения. Попробуйте перезагрузить страницу.</div>;
  }

  const currentPrice = priceData[priceData.length - 1].close;
  const prevPrice = priceData[priceData.length - 2]?.close || currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePercent = (priceChange / prevPrice) * 100;
  
  const prices = priceData.map(d => d.close);
  const sma20Array = prices.map((_, i) => calculateSMA(prices.slice(0, i + 1), 20));
  const sma50Array = prices.map((_, i) => calculateSMA(prices.slice(0, i + 1), 50));

  return (
    <>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21H4.6C4.03995 21 3.75992 21 3.54601 20.891C3.35785 20.7951 3.20487 20.6422 3.10899 20.454C3 20.2401 3 19.9601 3 19.4V3M21 7L15.5657 12.4343C15.3677 12.6323 15.2687 12.7313 15.1545 12.7684C15.0541 12.8011 14.9459 12.8011 14.8455 12.7684C14.7313 12.7313 14.6323 12.6323 14.4343 12.4343L12.5657 10.5657C12.3677 10.3677 12.2687 10.2687 12.1545 10.2316C12.0541 10.1989 11.9459 10.1989 11.8455 10.2316C11.7313 10.2687 11.6323 10.3677 11.4343 10.5657L7 15" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>TradingView Pro</h1>
        </div>
        <div className="toolbar">
          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            <optgroup label="Металлы">
              <option value="GOLD">XAU/USD - Золото</option>
              <option value="SILVER">XAG/USD - Серебро</option>
            </optgroup>
            
            <optgroup label="Сырье">
              <option value="OIL">USOIL - Нефть WTI</option>
            </optgroup>
            
            <optgroup label="Криптовалюты">
              <option value="BITCOIN">BTC/USD - Bitcoin</option>
            </optgroup>
            
            <optgroup label="Индексы">
              <option value="SP500">SPX - S&P 500</option>
            </optgroup>
            
            <optgroup label="Основные валютные пары">
              <option value="EURUSD">EUR/USD - Евро/Доллар</option>
              <option value="GBPUSD">GBP/USD - Фунт/Доллар</option>
              <option value="USDJPY">USD/JPY - Доллар/Йена</option>
              <option value="USDCHF">USD/CHF - Доллар/Франк</option>
            </optgroup>
            
            <optgroup label="Кросс-курсы">
              <option value="AUDUSD">AUD/USD - Австралийский доллар</option>
              <option value="USDCAD">USD/CAD - Канадский доллар</option>
              <option value="NZDUSD">NZD/USD - Новозеландский доллар</option>
              <option value="EURGBP">EUR/GBP - Евро/Фунт</option>
              <option value="EURJPY">EUR/JPY - Евро/Йена</option>
              <option value="GBPJPY">GBP/JPY - Фунт/Йена</option>
            </optgroup>
          </select>
          
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="1min">1m</option>
            <option value="5min">5m</option>
            <option value="15min">15m</option>
            <option value="30min">30m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
          </select>

          <button className="btn btn-primary" onClick={loadData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9C19.9828 7.56678 19.1209 6.28536 17.9845 5.27541C16.8482 4.26546 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7345 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              if (priceData.length > 0) {
                // Пересчитываем линии при каждом нажатии
                const chartAnalysis = analyzeChart(priceData);
                const allLines = [
                  ...chartAnalysis.supports,
                  ...chartAnalysis.resistances,
                  ...chartAnalysis.trendLines
                ];
                setTrendLines(allLines);
                console.log('Линии обновлены:', {
                  supports: chartAnalysis.supports.length,
                  resistances: chartAnalysis.resistances.length,
                  trendLines: chartAnalysis.trendLines.length
                });
              }
              setShowTrendLines(!showTrendLines);
            }}
            style={{
              background: showTrendLines ? '#FF6D00' : '#2a2e39',
              color: showTrendLines ? '#fff' : '#787b86',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21H4.6C4.03995 21 3.75992 21 3.54601 20.891C3.35785 20.7951 3.20487 20.6422 3.10899 20.454C3 20.2401 3 19.9601 3 19.4V3M21 7L15.5657 12.4343C15.3677 12.6323 15.2687 12.7313 15.1545 12.7684C15.0541 12.8011 14.9459 12.8011 14.8455 12.7684C14.7313 12.7313 14.6323 12.6323 14.4343 12.4343L12.5657 10.5657C12.3677 10.3677 12.2687 10.2687 12.1545 10.2316C12.0541 10.1989 11.9459 10.1989 11.8455 10.2316C11.7313 10.2687 11.6323 10.3677 11.4343 10.5657L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {showTrendLines ? 'Линии ВКЛ' : 'Линии ВЫКЛ'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: '#ef535022', 
          border: '1px solid #ef5350', 
          padding: '12px 20px', 
          color: '#ef5350',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className="main-layout">
        <div className="chart-section">
          <div className="chart-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#d1d4dc' }}>
                  {assetSymbols[asset]?.displayName || asset}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#787b86' }}>
                  {timeframe === '1min' ? '1m' : timeframe === '5min' ? '5m' : timeframe === '15min' ? '15m' : timeframe === '30min' ? '30m' : timeframe === '1h' ? '1h' : '4h'}
                </span>
              </div>
              <div className="price-display">
                <span className="current-price">${formatPrice(currentPrice, asset)}</span>
                <span className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                  {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange, asset)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <CandlestickChart 
              data={priceData} 
              sma20={sma20Array} 
              sma50={sma50Array} 
              trendLines={trendLines}
              showLines={showTrendLines}
            />
          </div>

          <div className="indicators-grid">
            <MarketAnalysisCard analysis={analysis} currentPrice={currentPrice} asset={asset} />
            <TechnicalIndicatorsCard indicators={indicators} />
            <RiskCalculator 
              currentPrice={currentPrice}
              support={analysis.support}
              resistance={analysis.resistance}
            />
          </div>
        </div>

        <div className="sidebar">
          <AIChat 
            priceData={priceData}
            indicators={indicators}
            analysis={analysis}
            currentPrice={currentPrice}
            asset={assetSymbols[asset]?.displayName || asset}
          />
        </div>
      </div>
    </>
  );
}

