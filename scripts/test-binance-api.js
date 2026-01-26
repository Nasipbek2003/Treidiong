/**
 * Тест Binance API
 */

async function testBinanceAPI() {
  console.log('🧪 Тест Binance API\n');

  try {
    console.log('📊 Получение данных BTCUSDT...');
    
    const response = await fetch(
      'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=5'
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ Данные получены!\n');
    console.log('Последние 5 свечей:');
    
    data.forEach((candle, i) => {
      const time = new Date(candle[0]).toLocaleString('ru-RU');
      const open = parseFloat(candle[1]);
      const high = parseFloat(candle[2]);
      const low = parseFloat(candle[3]);
      const close = parseFloat(candle[4]);
      const volume = parseFloat(candle[5]);

      console.log(`\n${i + 1}. ${time}`);
      console.log(`   Open:   $${open.toFixed(2)}`);
      console.log(`   High:   $${high.toFixed(2)}`);
      console.log(`   Low:    $${low.toFixed(2)}`);
      console.log(`   Close:  $${close.toFixed(2)}`);
      console.log(`   Volume: ${volume.toFixed(2)}`);
    });

    console.log('\n✅ Binance API работает!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testBinanceAPI();
