/**
 * Тест API получения текущей цены
 * 
 * Проверяет разные endpoints для получения актуальной цены
 * Запуск: node scripts/test-price-api.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Читаем .env.local вручную
const envPath = path.join(__dirname, '..', '.env.local');
let API_KEY = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('TWELVE_DATA_API_KEY=') || line.startsWith('NEXT_PUBLIC_TWELVE_DATA_API_KEY=')) {
      API_KEY = line.split('=')[1].trim();
      break;
    }
  }
} catch (error) {
  console.error('Не удалось прочитать .env.local');
}

async function testPriceEndpoint(symbol) {
  console.log(`\n=== Тест /price endpoint для ${symbol} ===`);
  
  try {
    const response = await axios.get('https://api.twelvedata.com/price', {
      params: {
        symbol: symbol,
        apikey: API_KEY
      },
      timeout: 5000
    });
    
    console.log('Response:', response.data);
    
    if (response.data.price) {
      const price = parseFloat(response.data.price);
      console.log(`✓ Цена: $${price.toFixed(2)}`);
      return price;
    } else {
      console.log('✗ Нет данных о цене');
      return null;
    }
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
    return null;
  }
}

async function testQuoteEndpoint(symbol) {
  console.log(`\n=== Тест /quote endpoint для ${symbol} ===`);
  
  try {
    const response = await axios.get('https://api.twelvedata.com/quote', {
      params: {
        symbol: symbol,
        apikey: API_KEY
      },
      timeout: 5000
    });
    
    console.log('Response:', response.data);
    
    if (response.data.close) {
      const price = parseFloat(response.data.close);
      console.log(`✓ Цена закрытия: $${price.toFixed(2)}`);
      console.log(`  Open: $${parseFloat(response.data.open).toFixed(2)}`);
      console.log(`  High: $${parseFloat(response.data.high).toFixed(2)}`);
      console.log(`  Low: $${parseFloat(response.data.low).toFixed(2)}`);
      console.log(`  Volume: ${response.data.volume}`);
      console.log(`  Timestamp: ${response.data.datetime}`);
      return price;
    } else {
      console.log('✗ Нет данных о цене');
      return null;
    }
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
    return null;
  }
}

async function testTimeSeriesEndpoint(symbol) {
  console.log(`\n=== Тест /time_series endpoint (последняя свеча) для ${symbol} ===`);
  
  try {
    const response = await axios.get('https://api.twelvedata.com/time_series', {
      params: {
        symbol: symbol,
        interval: '1min',
        outputsize: 1,
        apikey: API_KEY
      },
      timeout: 5000
    });
    
    console.log('Response:', response.data);
    
    if (response.data.values && response.data.values.length > 0) {
      const lastCandle = response.data.values[0];
      const price = parseFloat(lastCandle.close);
      console.log(`✓ Последняя цена: $${price.toFixed(2)}`);
      console.log(`  Open: $${parseFloat(lastCandle.open).toFixed(2)}`);
      console.log(`  High: $${parseFloat(lastCandle.high).toFixed(2)}`);
      console.log(`  Low: $${parseFloat(lastCandle.low).toFixed(2)}`);
      console.log(`  Volume: ${lastCandle.volume}`);
      console.log(`  Datetime: ${lastCandle.datetime}`);
      return price;
    } else {
      console.log('✗ Нет данных');
      return null;
    }
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
    return null;
  }
}

async function runTests() {
  if (!API_KEY) {
    console.error('❌ API ключ не найден! Проверьте .env.local');
    return;
  }
  
  console.log('API Key:', API_KEY.substring(0, 8) + '...');
  
  const symbols = ['XAU/USD', 'GBP/USD', 'EUR/USD', 'BTC/USD'];
  
  for (const symbol of symbols) {
    console.log('\n' + '='.repeat(60));
    console.log(`ТЕСТИРОВАНИЕ: ${symbol}`);
    console.log('='.repeat(60));
    
    const priceResult = await testPriceEndpoint(symbol);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Задержка между запросами
    
    const quoteResult = await testQuoteEndpoint(symbol);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const timeSeriesResult = await testTimeSeriesEndpoint(symbol);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`\n📊 Сравнение результатов для ${symbol}:`);
    console.log(`  /price:       ${priceResult ? '$' + priceResult.toFixed(2) : 'N/A'}`);
    console.log(`  /quote:       ${quoteResult ? '$' + quoteResult.toFixed(2) : 'N/A'}`);
    console.log(`  /time_series: ${timeSeriesResult ? '$' + timeSeriesResult.toFixed(2) : 'N/A'}`);
    
    if (priceResult && quoteResult) {
      const diff = Math.abs(priceResult - quoteResult);
      const diffPercent = (diff / priceResult * 100).toFixed(2);
      console.log(`  Разница: $${diff.toFixed(2)} (${diffPercent}%)`);
      
      if (diff > priceResult * 0.01) {
        console.log(`  ⚠️  ВНИМАНИЕ: Большая разница между endpoints!`);
      }
    }
    
    console.log('\n' + '─'.repeat(60));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('РЕКОМЕНДАЦИИ:');
  console.log('='.repeat(60));
  console.log('1. Используйте /quote для получения актуальной цены');
  console.log('2. Fallback на /time_series (последняя свеча)');
  console.log('3. /price может показывать устаревшие данные');
  console.log('4. Всегда проверяйте timestamp в ответе');
}

runTests().catch(console.error);
