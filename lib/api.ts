import axios from 'axios';
import { PriceData } from '@/types';

const TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || '';
const ALPHA_VANTAGE_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
const FRED_API_KEY = process.env.FRED_API_KEY || '';

// Кеш для данных с использованием localStorage
const CACHE_DURATION = 3600000; // 1 час

// Проверка, работает ли рынок (для форекса - 24/5, закрыт в выходные)
export function isMarketOpen(): boolean {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Воскресенье, 6 = Суббота
  const utcHour = now.getUTCHours();
  
  // Рынок форекс закрыт с пятницы 22:00 UTC до воскресенья 22:00 UTC
  if (utcDay === 6) {
    // Суббота - рынок закрыт весь день
    return false;
  }
  
  if (utcDay === 0 && utcHour < 22) {
    // Воскресенье до 22:00 UTC - рынок закрыт
    return false;
  }
  
  if (utcDay === 5 && utcHour >= 22) {
    // Пятница после 22:00 UTC - рынок закрыт
    return false;
  }
  
  // В остальное время рынок открыт
  return true;
}

function getCachedData(key: string): { data: any; timestamp: number } | null {
  try {
    const cached = localStorage.getItem(`api_cache_${key}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }
  return null;
}

function setCachedData(key: string, data: any): void {
  try {
    localStorage.setItem(`api_cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

// Функция для очистки кеша
export function clearCache(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(`api_cache_${key}`);
      console.log(`[API] Cache cleared for ${key}`);
    } else {
      // Очищаем весь кеш API
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('api_cache_')) {
          localStorage.removeItem(k);
        }
      });
      console.log('[API] All API cache cleared');
    }
  } catch (e) {
    console.error('Cache clear error:', e);
  }
}

// Проверка ключа
if (!TWELVE_DATA_KEY || TWELVE_DATA_KEY.includes('your_key_here')) {
  console.error('[API] Invalid Twelve Data API key!');
}

export async function fetchGoldPrice(): Promise<PriceData[]> {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=GLD&apikey=${ALPHA_VANTAGE_KEY}&outputsize=full`
    );

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) throw new Error('No data received');

    const data: PriceData[] = Object.entries(timeSeries)
      .slice(0, 100)
      .map(([date, values]: [string, any]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      }))
      .reverse();

    return data;
  } catch (error) {
    console.error('Alpha Vantage error:', error);
    throw error;
  }
}

export async function fetchForexData(pair: string = 'USD/EUR'): Promise<PriceData[]> {
  try {
    const [from, to] = pair.split('/');
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&apikey=${ALPHA_VANTAGE_KEY}&outputsize=full`
    );

    const timeSeries = response.data['Time Series FX (Daily)'];
    if (!timeSeries) throw new Error('No forex data');

    const data: PriceData[] = Object.entries(timeSeries)
      .slice(0, 100)
      .map(([date, values]: [string, any]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: 0
      }))
      .reverse();

    return data;
  } catch (error) {
    console.error('Forex data error:', error);
    throw error;
  }
}

export async function fetchCommodityData(symbol: string): Promise<PriceData[]> {
  try {
    console.log(`Fetching daily data for ${symbol}`);
    
    const response = await axios.get(
      `https://api.twelvedata.com/time_series`, {
        params: {
          symbol: symbol,
          interval: '1day',
          outputsize: 100,
          apikey: TWELVE_DATA_KEY,
          format: 'JSON'
        },
        timeout: 10000
      }
    );

    console.log('API Response:', response.data);

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'API Error');
    }

    if (!response.data.values || response.data.values.length === 0) {
      throw new Error('No data returned from API');
    }

    const data: PriceData[] = response.data.values
      .map((item: any) => {
        // Извлекаем только дату без времени (yyyy-mm-dd)
        const dateOnly = item.datetime.includes(' ') 
          ? item.datetime.split(' ')[0] 
          : item.datetime.split('T')[0];
        
        return {
          date: dateOnly,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseInt(item.volume || '0')
        };
      })
      .reverse();

    return data;
  } catch (error: any) {
    console.error('Twelve Data error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      throw new Error('API limit exceeded (429)');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch data');
  }
}

export async function fetchEconomicData(seriesId: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&limit=100`
    );

    return response.data.observations;
  } catch (error) {
    console.error('FRED API error:', error);
    throw error;
  }
}

export async function fetchInterestRates(): Promise<number> {
  try {
    const data = await fetchEconomicData('DFF'); // Federal Funds Rate
    const latest = data[data.length - 1];
    return parseFloat(latest.value);
  } catch (error) {
    console.error('Interest rate error:', error);
    return 0;
  }
}

export async function fetchInflationRate(): Promise<number> {
  try {
    const data = await fetchEconomicData('CPIAUCSL'); // Consumer Price Index
    if (data.length < 2) return 0;
    
    const current = parseFloat(data[data.length - 1].value);
    const previous = parseFloat(data[data.length - 13].value); // 12 months ago
    const inflation = ((current - previous) / previous) * 100;
    
    return inflation;
  } catch (error) {
    console.error('Inflation error:', error);
    return 0;
  }
}

export async function fetchDollarIndex(): Promise<PriceData[]> {
  try {
    return await fetchCommodityData('DXY');
  } catch (error) {
    console.error('Dollar index error:', error);
    throw error;
  }
}

export async function calculateCorrelation(data1: number[], data2: number[]): Promise<number> {
  const n = Math.min(data1.length, data2.length);
  if (n < 2) return 0;

  const mean1 = data1.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const mean2 = data2.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sum1 = 0;
  let sum2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = data1[i] - mean1;
    const diff2 = data2[i] - mean2;
    numerator += diff1 * diff2;
    sum1 += diff1 * diff1;
    sum2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sum1 * sum2);
  return denominator === 0 ? 0 : numerator / denominator;
}

export const assetSymbols: Record<string, { alpha?: string; twelve?: string; name: string; displayName: string }> = {
  GOLD: { twelve: 'XAU/USD', name: 'Золото', displayName: 'XAU/USD' },
  SILVER: { twelve: 'XAG/USD', name: 'Серебро', displayName: 'XAG/USD' },
  OIL: { twelve: 'CL', name: 'Нефть WTI', displayName: 'USOIL' },
  BITCOIN: { twelve: 'BTC/USD', name: 'Bitcoin', displayName: 'BTC/USD' },
  SP500: { twelve: 'SPX', name: 'S&P 500', displayName: 'SPX' },
  
  // Валютные пары
  EURUSD: { twelve: 'EUR/USD', name: 'Евро/Доллар', displayName: 'EUR/USD' },
  GBPUSD: { twelve: 'GBP/USD', name: 'Фунт/Доллар', displayName: 'GBP/USD' },
  USDJPY: { twelve: 'USD/JPY', name: 'Доллар/Йена', displayName: 'USD/JPY' },
  USDCHF: { twelve: 'USD/CHF', name: 'Доллар/Франк', displayName: 'USD/CHF' },
  AUDUSD: { twelve: 'AUD/USD', name: 'Австралийский доллар', displayName: 'AUD/USD' },
  USDCAD: { twelve: 'USD/CAD', name: 'Доллар/Канадский доллар', displayName: 'USD/CAD' },
  NZDUSD: { twelve: 'NZD/USD', name: 'Новозеландский доллар', displayName: 'NZD/USD' },
  EURGBP: { twelve: 'EUR/GBP', name: 'Евро/Фунт', displayName: 'EUR/GBP' },
  EURJPY: { twelve: 'EUR/JPY', name: 'Евро/Йена', displayName: 'EUR/JPY' },
  GBPJPY: { twelve: 'GBP/JPY', name: 'Фунт/Йена', displayName: 'GBP/JPY' }
};

export async function fetchIntraday(symbol: string, interval: string = '5min'): Promise<PriceData[]> {
  const cacheKey = `${symbol}_${interval}`;
  
  try {
    // Проверяем кеш в localStorage
    const cached = getCachedData(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`[API] Using cached data for ${cacheKey} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
      return cached.data;
    }

    console.log(`[API] Fetching intraday: ${symbol} @ ${interval}`);
    console.log(`[API] Using key: ${TWELVE_DATA_KEY.substring(0, 8)}...`);
    
    // Определяем outputsize в зависимости от устройства
    // На мобильных загружаем меньше данных для ускорения
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const outputsize = isMobile ? 500 : 5000; // Для мобильных - 500 свечей
    
    console.log(`[API] Device: ${isMobile ? 'Mobile' : 'Desktop'}, outputsize: ${outputsize}`);
    
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_KEY}`;
    console.log(`[API] Request URL: ${url.replace(TWELVE_DATA_KEY, 'KEY_HIDDEN')}`);
    
    const response = await axios.get(url, { timeout: 10000 });

    console.log(`[API] Response status: ${response.status}`);
    console.log(`[API] Response data:`, response.data);

    if (response.data.status === 'error') {
      console.error(`[API] Error from API:`, response.data);
      
      // Если лимит исчерпан и есть кеш - возвращаем кеш (даже старый)
      if (response.data.message?.includes('run out of API credits')) {
        if (cached) {
          console.log(`[API] Limit exceeded, returning cached data (any age)`);
          return cached.data;
        }
        throw new Error('API_LIMIT_EXCEEDED');
      }
      
      throw new Error(response.data.message || 'API Error');
    }

    if (!response.data.values || response.data.values.length === 0) {
      console.error(`[API] No values in response`);
      
      // Если нет данных но есть кеш - возвращаем кеш
      if (cached) {
        console.log(`[API] No data, returning cached data`);
        return cached.data;
      }
      
      throw new Error('No intraday data returned');
    }

    const data: PriceData[] = response.data.values
      .map((item: any) => ({
        date: item.datetime,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume || '0')
      }))
      .reverse();

    console.log(`[API] Success! Got ${data.length} candles`);
    console.log(`[API] First candle:`, data[0]);
    console.log(`[API] Last candle:`, data[data.length - 1]);

    // Сохраняем в кеш
    setCachedData(cacheKey, data);

    return data;
  } catch (error: any) {
    console.error('[API] Error:', error);
    console.error('[API] Error response:', error.response?.data);
    
    // Проверяем кеш при любой ошибке
    const cached = getCachedData(cacheKey);
    
    if (error.response?.status === 429 || error.message?.includes('run out of API credits')) {
      // Если есть кеш - возвращаем его (любого возраста), иначе выбрасываем ошибку
      if (cached) {
        console.log(`[API] Limit exceeded, returning cached data (any age)`);
        return cached.data;
      }
      throw new Error('API_LIMIT_EXCEEDED');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Неверный API ключ');
    }
    
    // При любой другой ошибке пытаемся вернуть кеш
    if (cached) {
      console.log(`[API] Error occurred, returning cached data`);
      return cached.data;
    }
    
    throw new Error(error.response?.data?.message || error.message || 'Ошибка загрузки данных');
  }
}

export async function fetchLatestPrice(symbol: string): Promise<number> {
  try {
    const response = await axios.get(
      `https://api.twelvedata.com/price`, {
        params: {
          symbol: symbol,
          apikey: TWELVE_DATA_KEY
        }
      }
    );

    if (response.data.price) {
      return parseFloat(response.data.price);
    }
    throw new Error('No price data');
  } catch (error) {
    console.error('Latest price error:', error);
    throw error;
  }
}
