/**
 * Тест загрузки данных золота через Twelve Data API
 */

const fs = require('fs');
const path = require('path');

// Читаем .env.local вручную
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

async function testGoldData() {
  console.log('🧪 Тест загрузки данных золота (XAU/USD)\n');

  if (!API_KEY) {
    console.error('❌ TWELVE_DATA_API_KEY не настроен в .env.local');
    return;
  }

  console.log(`✓ API Key найден: ${API_KEY.substring(0, 8)}...`);

  try {
    const symbol = 'XAU/USD';
    const interval = '15min';
    const limit = 10;

    console.log(`\n📊 Запрос данных: ${symbol} @ ${interval}`);
    
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

    // Показываем последние 3 свечи
    console.log('📈 Последние свечи:');
    data.values.slice(0, 3).forEach((candle, i) => {
      console.log(`\n${i + 1}. ${candle.datetime}`);
      console.log(`   Open:   $${parseFloat(candle.open).toFixed(2)}`);
      console.log(`   High:   $${parseFloat(candle.high).toFixed(2)}`);
      console.log(`   Low:    $${parseFloat(candle.low).toFixed(2)}`);
      console.log(`   Close:  $${parseFloat(candle.close).toFixed(2)}`);
      console.log(`   Volume: ${candle.volume || 'N/A'}`);
    });

    const latestPrice = parseFloat(data.values[0].close);
    console.log(`\n💰 Текущая цена золота: $${latestPrice.toFixed(2)}`);

    // Проверяем диапазон цен (золото обычно $1800-$6000)
    if (latestPrice < 1500 || latestPrice > 7000) {
      console.warn(`⚠️  Цена выглядит странно: $${latestPrice.toFixed(2)}`);
    } else {
      console.log('✓ Цена в нормальном диапазоне');
    }

    console.log('\n✅ Тест пройден! Данные золота загружаются корректно.');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testGoldData();
