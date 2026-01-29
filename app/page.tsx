'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import TechnicalIndicatorsCard from '@/components/TechnicalIndicators';
import LiquidityIndicators from '@/components/LiquidityIndicators';
import MarketAnalysisCard from '@/components/MarketAnalysis';
import RiskCalculator from '@/components/RiskCalculator';
import CorrelationMatrix from '@/components/CorrelationMatrix';
import EconomicData from '@/components/EconomicData';
import AIChat from '@/components/AIChat';
import { PriceData, TechnicalIndicators, MarketAnalysis } from '@/types';
import { calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands } from '@/lib/indicators';
import { performFullAnalysis } from '@/lib/analysis';
import { fetchIntraday, fetchLatestPrice, assetSymbols, clearCache, isMarketOpen } from '@/lib/api';
import { formatPrice } from '@/lib/formatPrice';
import { analyzeChart, TrendLine, findSupportLevels, findResistanceLevels } from '@/lib/chartAnalysis';

const CandlestickChart = dynamic(() => import('@/components/CandlestickChart'), { ssr: false });

export default function Home() {
  // Инициализация из localStorage
  const [asset, setAsset] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedAsset') || 'GOLD';
    }
    return 'GOLD';
  });
  
  const [timeframe, setTimeframe] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTimeframe') || '15min';
    }
    return '15min';
  });
  
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showTrendLines, setShowTrendLines] = useState(false);
  const [levelsStrength, setLevelsStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [showLevelsMenu, setShowLevelsMenu] = useState(false);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [activePanel, setActivePanel] = useState<'market' | 'indicators' | 'risk' | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<'market' | 'indicators' | 'risk' | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const loadingRef = useRef(false);
  const levelsMenuRef = useRef<HTMLDivElement>(null);
  const indicatorsMenuRef = useRef<HTMLDivElement>(null);
  const indicatorsButtonRef = useRef<HTMLButtonElement>(null);
  const levelsButtonRef = useRef<HTMLButtonElement>(null);

  // Сохранение выбора в localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedAsset', asset);
    }
  }, [asset]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTimeframe', timeframe);
    }
  }, [timeframe]);

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (levelsMenuRef.current && !levelsMenuRef.current.contains(event.target as Node)) {
        setShowLevelsMenu(false);
      }
      if (indicatorsMenuRef.current && !indicatorsMenuRef.current.contains(event.target as Node)) {
        setShowIndicatorsMenu(false);
      }
    };

    if (showLevelsMenu || showIndicatorsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLevelsMenu, showIndicatorsMenu]);

  // Функция для расчета уровней в зависимости от силы
  const calculateLevels = useCallback((data: PriceData[], strength: 'weak' | 'medium' | 'strong', currentTimeframe: string) => {
    if (data.length === 0) {
      console.log('Нет данных для расчета уровней');
      return;
    }

    let periodData: PriceData[];
    let minTouches: number;
    
    // Рассчитываем количество свечей в зависимости от таймфрейма
    const getCandlesForPeriod = (period: 'day' | 'month' | 'sixMonths') => {
      const minutesPerCandle = currentTimeframe === '1min' ? 1 : 
                               currentTimeframe === '5min' ? 5 : 
                               currentTimeframe === '15min' ? 15 : 
                               currentTimeframe === '30min' ? 30 : 
                               currentTimeframe === '1h' ? 60 : 240; // 4h
      
      if (period === 'day') {
        return Math.floor((24 * 60) / minutesPerCandle); // 24 часа
      } else if (period === 'month') {
        return Math.floor((30 * 24 * 60) / minutesPerCandle); // 30 дней
      } else {
        return Math.floor((180 * 24 * 60) / minutesPerCandle); // 180 дней (6 месяцев)
      }
    };
    
    // Определяем период данных и минимальное количество касаний
    switch (strength) {
      case 'weak': // 24 часа - слабые уровни (меньше касаний)
        const weakCandles = getCandlesForPeriod('day');
        periodData = data.slice(-weakCandles);
        minTouches = 2; // Минимум 2 касания для слабых уровней
        break;
      case 'medium': // 1 месяц - средние уровни
        const mediumCandles = getCandlesForPeriod('month');
        periodData = data.slice(-mediumCandles);
        minTouches = 3; // Минимум 3 касания для средних уровней
        break;
      case 'strong': // 6 месяцев - сильные уровни (больше касаний)
        const strongCandles = getCandlesForPeriod('sixMonths');
        periodData = data.slice(-strongCandles);
        minTouches = 4; // Минимум 4 касания для сильных уровней
        break;
      default:
        periodData = data;
        minTouches = 2;
    }

    // Если данных меньше чем нужно, используем все доступные
    if (periodData.length === 0) {
      periodData = data;
      console.log(`Недостаточно данных для периода ${strength}, используем все доступные: ${data.length} свечей`);
    }

    // Рассчитываем уровни с учетом минимального количества касаний
    const supports = findSupportLevels(periodData, minTouches).slice(0, 3);
    const resistances = findResistanceLevels(periodData, minTouches).slice(0, 3);
    
    setTrendLines([...supports, ...resistances]);
    
    console.log(`Уровни обновлены (${strength}):`, {
      period: strength === 'weak' ? '24ч' : strength === 'medium' ? '1 месяц' : '6 месяцев',
      timeframe: currentTimeframe,
      totalCandles: data.length,
      usedCandles: periodData.length,
      minTouches: minTouches,
      supports: supports.length,
      resistances: resistances.length,
      supportLevels: supports.map(s => s.price.toFixed(2)),
      resistanceLevels: resistances.map(r => r.price.toFixed(2))
    });
  }, []);

  const handleLevelsSelect = (strength: 'weak' | 'medium' | 'strong') => {
    setLevelsStrength(strength);
    setShowTrendLines(true);
    setShowLevelsMenu(false);
    calculateLevels(priceData, strength, timeframe);
  };

  const toggleLevels = () => {
    if (showTrendLines) {
      // Если уровни включены, показываем меню для выбора другого уровня
      setShowLevelsMenu(!showLevelsMenu);
    } else {
      // Если уровни выключены, показываем меню выбора
      setShowLevelsMenu(!showLevelsMenu);
    }
    
    // Обновляем позицию меню
    if (levelsButtonRef.current && !showLevelsMenu) {
      const rect = levelsButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
  };

  const toggleIndicatorsMenu = () => {
    setShowIndicatorsMenu(!showIndicatorsMenu);
    
    // Обновляем позицию меню
    if (indicatorsButtonRef.current && !showIndicatorsMenu) {
      const rect = indicatorsButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
  };


  const loadData = useCallback(async (forceClear: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const symbol = assetSymbols[asset]?.twelve;
      if (!symbol) throw new Error('Символ не найден');

      console.log(`Loading ${symbol} with timeframe ${timeframe}`);

      // Очищаем кеш если требуется
      if (forceClear) {
        clearCache(`${symbol}_${timeframe}`);
      }

      const data = await fetchIntraday(symbol, timeframe);

      if (!data || data.length === 0) {
        throw new Error('Нет данных. API может быть перегружен.');
      }

      console.log(`Loaded ${data.length} candles, latest: ${formatPrice(data[data.length - 1]?.close, asset)}`);
      
      setPriceData(data);
      setLastUpdate(new Date()); // Обновляем время последнего обновления
      
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
      
      // Если уровни включены, пересчитываем их
      if (levelsStrength) {
        calculateLevels(data, levelsStrength, timeframe);
      }
      
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
  }, [asset, timeframe, levelsStrength, calculateLevels]);

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

    // Проверяем, работает ли рынок
    if (!isMarketOpen()) {
      console.log('Рынок закрыт (выходные). Автообновление приостановлено.');
      return;
    }

    // 💰 ТОЛЬКО ОБНОВЛЕНИЕ ЦЕНЫ: каждые 10 секунд обновляем последнюю цену
    const timer = setInterval(async () => {
      // Проверяем перед каждым обновлением
      if (!isMarketOpen()) {
        console.log('Рынок закрылся. Останавливаем обновления.');
        clearInterval(timer);
        return;
      }

      try {
        const symbol = assetSymbols[asset]?.twelve;
        if (!symbol) return;

        // Обновление только последней цены
        console.log('💰 Обновление цены...');
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
        
        setLastUpdate(new Date());
        
      } catch (err: any) {
        console.error('Auto-refresh error:', err);
        // Отключаем автообновление при критических ошибках
        if (err.message?.includes('API_LIMIT_EXCEEDED') || 
            err.message?.includes('run out of API credits')) {
          setAutoRefresh(false);
          console.log('Автообновление отключено из-за лимита API');
        }
      }
    }, 10000); // Каждые 10 секунд

    return () => clearInterval(timer);
  }, [autoRefresh, asset, timeframe, loading]);

  if (loading) {
    return (
      <div className="loading">
        <svg width="80" height="50" viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(5 5)">
            <rect x="0" y="0" width="6" height="30" fill="#22D3EE">
              <animate attributeName="height" values="10;30;15" dur="1s" repeatCount="indefinite"/>
            </rect>
            <rect x="14" y="5" width="6" height="20" fill="#3B82F6">
              <animate attributeName="height" values="25;10;25" dur="1s" repeatCount="indefinite"/>
            </rect>
            <rect x="28" y="10" width="6" height="15" fill="#22D3EE">
              <animate attributeName="height" values="15;30;15" dur="1s" repeatCount="indefinite"/>
            </rect>
            <rect x="42" y="2" width="6" height="28" fill="#3B82F6">
              <animate attributeName="height" values="28;10;28" dur="1s" repeatCount="indefinite"/>
            </rect>
          </g>
        </svg>
        <p style={{ marginTop: '15px', color: '#787b86' }}>Загрузка данных...</p>
      </div>
    );
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
  const marketOpen = isMarketOpen();
  
  const prices = priceData.map(d => d.close);
  const sma20Array = prices.map((_, i) => calculateSMA(prices.slice(0, i + 1), 20));
  const sma50Array = prices.map((_, i) => calculateSMA(prices.slice(0, i + 1), 50));

  return (
    <>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21H4.6C4.03995 21 3.75992 21 3.54601 20.891C3.35785 20.7951 3.20487 20.6422 3.10899 20.454C3 20.2401 3 19.9601 3 19.4V3M21 7L15.5657 12.4343C15.3677 12.6323 15.2687 12.7313 15.1545 12.7684C15.0541 12.8011 14.9459 12.8011 14.8455 12.7684C14.7313 12.7313 14.6323 12.6323 14.4343 12.4343L12.5657 10.5657C12.3677 10.3677 12.2687 10.2687 12.1545 10.2316C12.0541 10.1989 11.9459 10.1989 11.8455 10.2316C11.7313 10.2687 11.6323 10.3677 11.4343 10.5657L7 15" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>TradingView Pro</h1>
        </div>
        <div className="toolbar">
          <select value={asset} onChange={(e) => setAsset(e.target.value)} title="Выбор актива">
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
          
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} title="Таймфрейм">
            <option value="1min">1m</option>
            <option value="5min">5m</option>
            <option value="15min">15m</option>
            <option value="30min">30m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
          </select>

          <button className="btn btn-primary" onClick={() => loadData()} title="Обновить данные">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9C19.9828 7.56678 19.1209 6.28536 17.9845 5.27541C16.8482 4.26546 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7345 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Индикатор последнего обновления */}
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              clearCache();
              loadData(true);
            }}
            title="Очистить кеш и загрузить новые данные"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div ref={levelsMenuRef} style={{ position: 'relative' }}>
            <button 
              ref={levelsButtonRef}
              className="btn btn-secondary" 
              onClick={toggleLevels}
              title={showTrendLines ? `Уровни (${levelsStrength === 'weak' ? 'Слабый' : levelsStrength === 'medium' ? 'Средний' : 'Сильный'})` : 'Показать уровни'}
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
              <span className="btn-text">{showTrendLines ? `Уровни (${levelsStrength === 'weak' ? 'Слабый' : levelsStrength === 'medium' ? 'Средний' : 'Сильный'})` : 'Уровни'}</span>
            </button>
          </div>

          <div ref={indicatorsMenuRef} style={{ position: 'relative' }}>
            <button 
              ref={indicatorsButtonRef}
              className="btn btn-secondary" 
              onClick={toggleIndicatorsMenu}
              title="Индикаторы"
              style={{
                background: (showSMA20 || showSMA50) ? '#2962ff' : '#2a2e39',
                color: (showSMA20 || showSMA50) ? '#fff' : '#787b86',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3V21M21 21H3M7 13L12 8L16 12L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="btn-text">Индикаторы</span>
            </button>
            
            {showIndicatorsMenu && typeof window !== 'undefined' && createPortal(
              <div 
                ref={indicatorsMenuRef}
                style={{
                  position: 'fixed',
                  top: `${menuPosition.top}px`,
                  right: `${menuPosition.right}px`,
                  background: '#1e222d',
                  border: '1px solid #2a2e39',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 999999,
                  minWidth: '160px',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => setShowSMA20(!showSMA20)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    color: showSMA20 ? '#2962ff' : '#787b86',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'background 0.2s',
                    fontWeight: showSMA20 ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2a2e39'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${showSMA20 ? '#2962ff' : '#787b86'}`,
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: showSMA20 ? '#2962ff' : 'transparent'
                  }}>
                    {showSMA20 && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  SMA 20
                </button>
                <button
                  onClick={() => setShowSMA50(!showSMA50)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    color: showSMA50 ? '#ff6d00' : '#787b86',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'background 0.2s',
                    fontWeight: showSMA50 ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2a2e39'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${showSMA50 ? '#ff6d00' : '#787b86'}`,
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: showSMA50 ? '#ff6d00' : 'transparent'
                  }}>
                    {showSMA50 && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  SMA 50
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {showLevelsMenu && typeof window !== 'undefined' && createPortal(
        <div 
          ref={levelsMenuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            background: '#1e222d',
            border: '1px solid #2a2e39',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 999999,
            minWidth: '160px',
            overflow: 'hidden'
          }}
        >
          <button
            onClick={() => handleLevelsSelect('weak')}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: levelsStrength === 'weak' ? '#2a2e39' : 'transparent',
              border: 'none',
              color: levelsStrength === 'weak' ? '#FF6D00' : '#d1d4dc',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s',
              fontWeight: levelsStrength === 'weak' ? '600' : '400'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2a2e39'}
            onMouseLeave={(e) => e.currentTarget.style.background = levelsStrength === 'weak' ? '#2a2e39' : 'transparent'}
          >
            {levelsStrength === 'weak' ? '✓ ' : ''}Слабый (24ч)
          </button>
          <button
            onClick={() => handleLevelsSelect('medium')}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: levelsStrength === 'medium' ? '#2a2e39' : 'transparent',
              border: 'none',
              color: levelsStrength === 'medium' ? '#FF6D00' : '#d1d4dc',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s',
              fontWeight: levelsStrength === 'medium' ? '600' : '400'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2a2e39'}
            onMouseLeave={(e) => e.currentTarget.style.background = levelsStrength === 'medium' ? '#2a2e39' : 'transparent'}
          >
            {levelsStrength === 'medium' ? '✓ ' : ''}Средний (1 месяц)
          </button>
          <button
            onClick={() => handleLevelsSelect('strong')}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: levelsStrength === 'strong' ? '#2a2e39' : 'transparent',
              border: 'none',
              color: levelsStrength === 'strong' ? '#FF6D00' : '#d1d4dc',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s',
              fontWeight: levelsStrength === 'strong' ? '600' : '400'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2a2e39'}
            onMouseLeave={(e) => e.currentTarget.style.background = levelsStrength === 'strong' ? '#2a2e39' : 'transparent'}
          >
            {levelsStrength === 'strong' ? '✓ ' : ''}Сильный (6 месяцев)
          </button>
          {showTrendLines && (
            <>
              <div style={{
                height: '1px',
                background: '#2a2e39',
                margin: '4px 0'
              }} />
              <button
                onClick={() => {
                  setShowTrendLines(false);
                  setLevelsStrength(null);
                  setShowLevelsMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ef5350',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2a2e39'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Выключить
              </button>
            </>
          )}
        </div>,
        document.body
      )}

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
        {/* Левая боковая панель с иконками */}
        <div className="left-sidebar">
          <div 
            className={`sidebar-icon ${activePanel === 'market' ? 'active' : ''}`}
            onMouseEnter={() => setHoveredPanel('market')}
            onMouseLeave={() => setHoveredPanel(null)}
            onClick={() => setActivePanel(activePanel === 'market' ? null : 'market')}
            title="Анализ рынка"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21H4.6C4.03995 21 3.75992 21 3.54601 20.891C3.35785 20.7951 3.20487 20.6422 3.10899 20.454C3 20.2401 3 19.9601 3 19.4V3M21 7L15.5657 12.4343C15.3677 12.6323 15.2687 12.7313 15.1545 12.7684C15.0541 12.8011 14.9459 12.8011 14.8455 12.7684C14.7313 12.7313 14.6323 12.6323 14.4343 12.4343L12.5657 10.5657C12.3677 10.3677 12.2687 10.2687 12.1545 10.2316C12.0541 10.1989 11.9459 10.1989 11.8455 10.2316C11.7313 10.2687 11.6323 10.3677 11.4343 10.5657L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div 
            className={`sidebar-icon ${activePanel === 'indicators' ? 'active' : ''}`}
            onMouseEnter={() => setHoveredPanel('indicators')}
            onMouseLeave={() => setHoveredPanel(null)}
            onClick={() => setActivePanel(activePanel === 'indicators' ? null : 'indicators')}
            title="Технические индикаторы"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3V21M21 21H3M7 13L12 8L16 12L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div 
            className={`sidebar-icon ${activePanel === 'risk' ? 'active' : ''}`}
            onMouseEnter={() => setHoveredPanel('risk')}
            onMouseLeave={() => setHoveredPanel(null)}
            onClick={() => setActivePanel(activePanel === 'risk' ? null : 'risk')}
            title="Риск-менеджмент"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Панели при наведении/клике */}
        {(hoveredPanel === 'market' || activePanel === 'market') && (
          <div className="side-panel">
            <div className="side-panel-header">
              <h3>Анализ рынка</h3>
              {activePanel === 'market' && (
                <button onClick={() => setActivePanel(null)} className="close-panel-btn">×</button>
              )}
            </div>
            <div className="side-panel-content">
              <MarketAnalysisCard analysis={analysis} currentPrice={currentPrice} asset={asset} />
            </div>
          </div>
        )}

        {(hoveredPanel === 'indicators' || activePanel === 'indicators') && (
          <div className="side-panel">
            <div className="side-panel-header">
              <h3>Технические индикаторы</h3>
              {activePanel === 'indicators' && (
                <button onClick={() => setActivePanel(null)} className="close-panel-btn">×</button>
              )}
            </div>
            <div className="side-panel-content">
              <TechnicalIndicatorsCard indicators={indicators} />
              <LiquidityIndicators 
                symbol={asset}
                candles={priceData}
                currentPrice={currentPrice}
              />
            </div>
          </div>
        )}

        {(hoveredPanel === 'risk' || activePanel === 'risk') && (
          <div className="side-panel">
            <div className="side-panel-header">
              <h3>Риск-менеджмент</h3>
              {activePanel === 'risk' && (
                <button onClick={() => setActivePanel(null)} className="close-panel-btn">×</button>
              )}
            </div>
            <div className="side-panel-content">
              <RiskCalculator 
                currentPrice={currentPrice}
                support={analysis.support}
                resistance={analysis.resistance}
              />
            </div>
          </div>
        )}

        <div className="chart-section">
          <div className="chart-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', color: '#d1d4dc' }}>
                  {assetSymbols[asset]?.displayName || asset}
                </h2>
                <span style={{ fontSize: '0.7rem', color: '#787b86' }}>
                  {timeframe === '1min' ? '1m' : timeframe === '5min' ? '5m' : timeframe === '15min' ? '15m' : timeframe === '30min' ? '30m' : timeframe === '1h' ? '1h' : '4h'}
                </span>
              </div>
              <div className="price-display">
                <span className="current-price" style={{ fontSize: '1.3rem' }}>${formatPrice(currentPrice, asset)}</span>
                <span className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.85rem' }}>
                  {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange, asset)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '3px', 
                  marginTop: '1px',
                  fontSize: '0.7rem'
                }}>
                  <span style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: marketOpen ? '#26a69a' : '#ef5350',
                    display: 'inline-block'
                  }} />
                  <span style={{ color: marketOpen ? '#26a69a' : '#ef5350' }}>
                    {marketOpen ? 'Открыт' : 'Закрыт'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CandlestickChart 
                data={priceData} 
                sma20={showSMA20 ? sma20Array : undefined} 
                sma50={showSMA50 ? sma50Array : undefined} 
                trendLines={trendLines}
                showLines={showTrendLines}
                symbol={asset}
              />
            </div>
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

      {/* Плавающая кнопка чата для мобильных */}
      <button 
        className="mobile-chat-button"
        onClick={() => setShowMobileChat(!showMobileChat)}
        aria-label="Открыть чат"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Мобильная панель чата */}
      {showMobileChat && (
        <>
          <div className="mobile-chat-overlay" onClick={() => setShowMobileChat(false)} />
          <div className="mobile-chat-panel">
            <div className="mobile-chat-header">
              <h3>AI Чат</h3>
              <button onClick={() => setShowMobileChat(false)} className="close-chat-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <AIChat 
              priceData={priceData}
              indicators={indicators}
              analysis={analysis}
              currentPrice={currentPrice}
              asset={assetSymbols[asset]?.displayName || asset}
            />
          </div>
        </>
      )}
    </>
  );
}

