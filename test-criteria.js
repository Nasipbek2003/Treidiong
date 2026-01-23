// Тестирование критериев анализа
// Запуск: node test-criteria.js

console.log('🧪 Тестирование критериев анализа\n');

// Тест 1: Volume Spike
console.log('📊 Тест 1: Volume Spike');
const volumeSMA = 1000;
const testCases1 = [
  { volume: 1600, expected: 'Всплеск (1.6x)' },
  { volume: 800, expected: 'Низкий (0.8x)' },
  { volume: 1000, expected: 'Норма (1.0x)' }
];

testCases1.forEach(test => {
  const isSpike = test.volume > volumeSMA * 1.5;
  const ratio = (test.volume / volumeSMA).toFixed(1);
  console.log(`  Volume: ${test.volume}, Spike: ${isSpike}, Ratio: ${ratio}x → ${test.expected}`);
});

// Тест 2: CVD (Cumulative Volume Delta)
console.log('\n💰 Тест 2: CVD');
const priceData = [
  { close: 100, volume: 1000 },
  { close: 102, volume: 1200 }, // +2 → +1200
  { close: 101, volume: 800 },  // -1 → -800
  { close: 103, volume: 1500 }, // +2 → +1500
  { close: 102, volume: 900 }   // -1 → -900
];

let cvd = 0;
for (let i = 1; i < priceData.length; i++) {
  const priceChange = priceData[i].close - priceData[i - 1].close;
  const volumeDelta = priceChange > 0 ? priceData[i].volume : -priceData[i].volume;
  cvd += volumeDelta;
  console.log(`  Свеча ${i}: Цена ${priceChange > 0 ? '+' : ''}${priceChange}, Volume Delta: ${volumeDelta > 0 ? '+' : ''}${volumeDelta}, CVD: ${cvd}`);
}
console.log(`  Итоговый CVD: ${cvd} (${cvd > 0 ? 'Покупатели побеждают' : 'Продавцы побеждают'})`);

// Тест 3: Liquidity Sweep
console.log('\n🎯 Тест 3: Liquidity Sweep');
const candleData = [
  { high: 100, low: 95, close: 98 },
  { high: 102, low: 97, close: 100 },
  { high: 101, low: 96, close: 99 },
  { high: 103, low: 98, close: 101 }, // Пробой вверх
  { high: 102, low: 97, close: 99 }   // Возврат вниз
];

const prevHigh = Math.max(...candleData.slice(0, -1).map(d => d.high));
const lastCandle = candleData[candleData.length - 1];

console.log(`  Предыдущий максимум: ${prevHigh}`);
console.log(`  Последняя свеча: High=${lastCandle.high}, Close=${lastCandle.close}`);

if (lastCandle.high > prevHigh && lastCandle.close < prevHigh) {
  console.log(`  ✅ Liquidity Sweep вверх обнаружен! (пробой ${lastCandle.high} > ${prevHigh}, возврат ${lastCandle.close})`);
} else {
  console.log(`  ❌ Liquidity Sweep не обнаружен`);
}

// Тест 4: Market Structure
console.log('\n📈 Тест 4: Market Structure');
const structureTests = [
  { highs: [100, 105, 110], lows: [95, 98, 102], expected: 'HH (Higher High)' },
  { highs: [110, 105, 100], lows: [102, 98, 95], expected: 'LL (Lower Low)' },
  { highs: [100, 105, 103], lows: [95, 98, 96], expected: 'LH (Lower High)' }
];

structureTests.forEach((test, idx) => {
  const lastHigh = test.highs[test.highs.length - 1];
  const prevHigh = test.highs[test.highs.length - 2];
  const lastLow = test.lows[test.lows.length - 1];
  const prevLow = test.lows[test.lows.length - 2];
  
  let structure;
  if (lastHigh > prevHigh && lastLow > prevLow) {
    structure = 'HH';
  } else if (lastHigh < prevHigh && lastLow < prevLow) {
    structure = 'LL';
  } else if (lastHigh < prevHigh && lastLow > prevLow) {
    structure = 'LH';
  } else {
    structure = 'HL';
  }
  
  console.log(`  Тест ${idx + 1}: Highs=[${test.highs}], Lows=[${test.lows}] → ${structure} (ожидалось: ${test.expected})`);
});

// Тест 5: Multi-Timeframe
console.log('\n⏰ Тест 5: Multi-Timeframe');
const prices5m = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5); // Восходящий тренд на 5m
const prices1h = prices5m.filter((_, i) => i % 12 === 0); // Каждая 12-я свеча = 1H

console.log(`  5m свечей: ${prices5m.length}, последняя цена: ${prices5m[prices5m.length - 1]}`);
console.log(`  1H свечей: ${prices1h.length}, последняя цена: ${prices1h[prices1h.length - 1]}`);

const sma20_5m = prices5m.slice(-20).reduce((a, b) => a + b, 0) / 20;
const sma20_1h = prices1h.slice(-Math.min(20, prices1h.length)).reduce((a, b) => a + b, 0) / Math.min(20, prices1h.length);

const trend5m = prices5m[prices5m.length - 1] > sma20_5m ? 'BULLISH' : 'BEARISH';
const trend1h = prices1h[prices1h.length - 1] > sma20_1h ? 'BULLISH' : 'BEARISH';

console.log(`  5m тренд: ${trend5m} (цена ${prices5m[prices5m.length - 1].toFixed(2)} vs SMA20 ${sma20_5m.toFixed(2)})`);
console.log(`  1H тренд: ${trend1h} (цена ${prices1h[prices1h.length - 1].toFixed(2)} vs SMA20 ${sma20_1h.toFixed(2)})`);
console.log(`  Совпадение: ${trend5m === trend1h ? '✅ ДА (+10 баллов)' : '❌ НЕТ (-15 баллов)'}`);

// Тест 6: Полный расчет вероятности
console.log('\n🎲 Тест 6: Полный расчет вероятности');
const scores = {
  rsi: 28,        // < 30 → +15
  macd: 0.5,      // > 0 → +10
  trend: 'bull',  // → +20
  sma: true,      // SMA20 > SMA50 → +12
  volatility: 12, // < 15 → +5
  support: true,  // → +3
  volumeSpike: true, // → +10
  cvdGrowing: true,  // → +8
  liquiditySweep: true, // → +10
  breakStructure: 'UP', // → +15
  mtfMatch: true  // → +10
};

let totalScore = 0;
const factors = [];

if (scores.rsi < 30) { totalScore += 15; factors.push('RSI перепродан +15'); }
if (scores.macd > 0) { totalScore += 10; factors.push('MACD бычий +10'); }
if (scores.trend === 'bull') { totalScore += 20; factors.push('Восходящий тренд +20'); }
if (scores.sma) { totalScore += 12; factors.push('SMA20 > SMA50 +12'); }
if (scores.volatility < 15) { totalScore += 5; factors.push('Низкая волатильность +5'); }
if (scores.support) { totalScore += 3; factors.push('Есть поддержка +3'); }
if (scores.volumeSpike) { totalScore += 10; factors.push('Объем подтверждает +10'); }
if (scores.cvdGrowing) { totalScore += 8; factors.push('CVD растет +8'); }
if (scores.liquiditySweep) { totalScore += 10; factors.push('Сбор стопов +10'); }
if (scores.breakStructure === 'UP') { totalScore += 15; factors.push('Break of Structure +15'); }
if (scores.mtfMatch) { totalScore += 10; factors.push('MTF совпадают +10'); }

const normalizedScore = Math.max(0, Math.min(100, 50 + (totalScore * 0.87)));

console.log(`  Факторы:`);
factors.forEach(f => console.log(`    • ${f}`));
console.log(`  Сумма баллов: ${totalScore}`);
console.log(`  Нормализация: 50 + (${totalScore} × 0.87) = ${normalizedScore.toFixed(1)}%`);
console.log(`  Сигнал: ${normalizedScore >= 65 ? '🟢 BUY' : normalizedScore <= 35 ? '🔴 SELL' : '⚪ HOLD'}`);

// Тест 7: Фейковый рост (должен дать SELL)
console.log('\n⚠️ Тест 7: Фейковый рост (ожидается SELL)');
const fakeScores = {
  rsi: 72,        // > 70 → -15
  macd: -0.3,     // < 0 → -10
  trend: 'side',  // → 0
  sma: false,     // SMA20 < SMA50 → -12
  volatility: 25, // → 0
  support: false, // → 0
  volumeLow: true, // Рост без объема → -10
  cvdFalling: true, // CVD падает при росте → -12
  noSweep: true,  // → 0
  noBreak: true,  // → 0
  mtfConflict: true // 5m BUY, 1H SELL → -15
};

let fakeScore = 0;
const fakeFactors = [];

if (fakeScores.rsi > 70) { fakeScore -= 15; fakeFactors.push('RSI перекуплен -15'); }
if (fakeScores.macd < 0) { fakeScore -= 10; fakeFactors.push('MACD медвежий -10'); }
if (!fakeScores.sma) { fakeScore -= 12; fakeFactors.push('SMA20 < SMA50 -12'); }
if (fakeScores.volumeLow) { fakeScore -= 10; fakeFactors.push('Рост без объема -10'); }
if (fakeScores.cvdFalling) { fakeScore -= 12; fakeFactors.push('CVD падает (разгрузка) -12'); }
if (fakeScores.mtfConflict) { fakeScore -= 15; fakeFactors.push('MTF противоречат -15'); }

const fakeNormalized = Math.max(0, Math.min(100, 50 + (fakeScore * 0.87)));

console.log(`  Факторы:`);
fakeFactors.forEach(f => console.log(`    • ${f}`));
console.log(`  Сумма баллов: ${fakeScore}`);
console.log(`  Нормализация: 50 + (${fakeScore} × 0.87) = ${fakeNormalized.toFixed(1)}%`);
console.log(`  Сигнал: ${fakeNormalized >= 65 ? '🟢 BUY' : fakeNormalized <= 35 ? '🔴 SELL' : '⚪ HOLD'}`);
console.log(`  ${fakeNormalized <= 35 ? '✅ ПРАВИЛЬНО: Фейк распознан!' : '❌ ОШИБКА: Фейк не распознан!'}`);

console.log('\n✅ Все тесты завершены!');
