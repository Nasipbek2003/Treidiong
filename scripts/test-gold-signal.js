/**
 * Полный тест системы сигналов для золота
 */

const fs = require('fs');
const path = require('path');

// Читаем .env.local
let API_KEY = '';
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/TWELVE_DATA_API_KEY=(.+)/);
  if (match) {
    API_KEY = match[1].trim();
  }
} catch (e) {
  console.error('Не удалось прочитать .env.local');
}

async function testGoldSignal() {
  console.log('🧪 Полный тест системы сигналов для золота\n');

  if (!API_KEY) {
    console.error('❌ TWELVE_DATA_API_KEY не настроен');
    return;
  }

  try {
    const symbol = 'XAU/USD';
    const interval = '15min';
    const limit = 100;

    console.log(`📊 Загрузка данных: ${symbol} @ ${interval}`);
    
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${limit}&apikey=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'error') {
      console.error('❌ Ошибка API:', data.message);
      return;
    }

    if (!data.values || data.values.length === 0) {
      console.error('❌ Нет данных');
      return;
    }

    console.log(`✓ Получено ${data.values.length} свечей\n`);

    // Конвертируем в формат Candlestick
    const candles = data.values
      .map(item => ({
        timestamp: new Date(item.datetime).getTime(),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume || '0'),
      }))
      .reverse();

    // Текущая цена
    const currentPrice = candles[candles.length - 1].close;
    console.log(`💰 Текущая цена: $${currentPrice.toFixed(2)}`);

    // Диапазон за последние 6 часов (24 свечи по 15 минут)
    const recent = candles.slice(-24);
    const prices = recent.map(c => c.close);
    const high6h = Math.max(...prices);
    const low6h = Math.min(...prices);

    console.log(`📈 Максимум за 6ч: $${high6h.toFixed(2)}`);
    console.log(`📉 Минимум за 6ч: $${low6h.toFixed(2)}`);
    console.log(`📊 Диапазон: $${(high6h - low6h).toFixed(2)} (${((high6h - low6h) / low6h * 100).toFixed(2)}%)`);

    // Простой расчет RSI
    const rsi = calculateSimpleRSI(candles.slice(-15));
    console.log(`📊 RSI(14): ${rsi.toFixed(1)}`);

    // Определяем тренд
    const sma20 = calculateSMA(candles.slice(-20));
    const sma50 = calculateSMA(candles.slice(-50));
    
    console.log(`📊 SMA20: $${sma20.toFixed(2)}`);
    console.log(`📊 SMA50: $${sma50.toFixed(2)}`);

    let trend = 'Боковой';
    if (currentPrice > sma20 && sma20 > sma50) {
      trend = 'Восходящий 📈';
    } else if (currentPrice < sma20 && sma20 < sma50) {
      trend = 'Нисходящий 📉';
    }

    console.log(`\n🎯 Тренд: ${trend}`);

    // Ключевые уровни
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);

    console.log(`\n🔴 Сопротивление: $${resistance.toFixed(2)}`);
    console.log(`🟢 Поддержка: $${support.toFixed(2)}`);

    // Расстояние до уровней
    const distToResistance = ((resistance - currentPrice) / currentPrice * 100);
    const distToSupport = ((currentPrice - support) / currentPrice * 100);

    console.log(`\n📏 До сопротивления: ${distToResistance.toFixed(2)}%`);
    console.log(`📏 До поддержки: ${distToSupport.toFixed(2)}%`);

    console.log('\n✅ Данные готовы для анализа Liquidity Engine!');
    console.log('\n💡 Запусти систему мониторинга: npm run signals:start');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

function calculateSimpleRSI(candles) {
  if (candles.length < 2) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / (candles.length - 1);
  const avgLoss = losses / (candles.length - 1);
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSMA(candles) {
  if (candles.length === 0) return 0;
  const sum = candles.reduce((acc, c) => acc + c.close, 0);
  return sum / candles.length;
}

testGoldSignal();
