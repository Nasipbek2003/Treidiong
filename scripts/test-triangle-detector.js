/**
 * Тест детектора треугольников
 * 
 * Запуск: node scripts/test-triangle-detector.js
 */

const { TriangleDetector } = require('../lib/liquidity/triangle-detector');

// Генерируем тестовые данные с треугольником
function generateTriangleData() {
  const candles = [];
  const basePrice = 2650;
  const startTime = Date.now() - 50 * 15 * 60 * 1000; // 50 свечей по 15 минут
  
  // Создаём треугольник: сходящиеся линии
  for (let i = 0; i < 50; i++) {
    const timestamp = startTime + i * 15 * 60 * 1000;
    
    // Верхняя граница: нисходящая линия от 2670 до 2660
    const upperBound = 2670 - (i / 50) * 10;
    
    // Нижняя граница: восходящая линия от 2650 до 2655
    const lowerBound = 2650 + (i / 50) * 5;
    
    // Цена колеблется между границами
    const range = upperBound - lowerBound;
    const priceInRange = lowerBound + Math.random() * range;
    
    // Создаём свечу с уменьшающимся размером (сжатие)
    const candleSize = range * 0.3 * (1 - i / 100); // Свечи становятся меньше
    
    const open = priceInRange;
    const close = priceInRange + (Math.random() - 0.5) * candleSize;
    const high = Math.max(open, close) + Math.random() * candleSize * 0.3;
    const low = Math.min(open, close) - Math.random() * candleSize * 0.3;
    
    // Добавляем касания границ
    if (i % 10 === 0) {
      // Касание верхней границы
      candles.push({
        timestamp,
        open,
        high: upperBound + Math.random() * 0.5,
        low,
        close,
        volume: 1000 + Math.random() * 500,
      });
    } else if (i % 10 === 5) {
      // Касание нижней границы
      candles.push({
        timestamp,
        open,
        high,
        low: lowerBound - Math.random() * 0.5,
        close,
        volume: 1000 + Math.random() * 500,
      });
    } else {
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: 1000 + Math.random() * 500,
      });
    }
  }
  
  // Добавляем пробой вверх
  const breakoutCandle = {
    timestamp: startTime + 50 * 15 * 60 * 1000,
    open: 2660,
    high: 2672,
    low: 2659,
    close: 2671, // Закрытие за границей
    volume: 2500, // Повышенный объём
  };
  candles.push(breakoutCandle);
  
  // Добавляем ретест
  const retestCandle = {
    timestamp: startTime + 51 * 15 * 60 * 1000,
    open: 2671,
    high: 2672,
    low: 2669, // Касание линии
    close: 2670, // Линия держит
    volume: 800, // Слабый объём
  };
  candles.push(retestCandle);
  
  return candles;
}

// Генерируем данные с ложным пробоем
function generateFalseBreakoutData() {
  const candles = [];
  const basePrice = 2650;
  const startTime = Date.now() - 30 * 15 * 60 * 1000;
  
  // Создаём треугольник
  for (let i = 0; i < 30; i++) {
    const timestamp = startTime + i * 15 * 60 * 1000;
    
    const upperBound = 2670 - (i / 30) * 8;
    const lowerBound = 2650 + (i / 30) * 4;
    
    const range = upperBound - lowerBound;
    const priceInRange = lowerBound + Math.random() * range;
    
    const candleSize = range * 0.3 * (1 - i / 60);
    
    const open = priceInRange;
    const close = priceInRange + (Math.random() - 0.5) * candleSize;
    const high = Math.max(open, close) + Math.random() * candleSize * 0.3;
    const low = Math.min(open, close) - Math.random() * candleSize * 0.3;
    
    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: 1000 + Math.random() * 500,
    });
  }
  
  // Добавляем ложный пробой вниз
  const falseBreakoutCandle = {
    timestamp: startTime + 30 * 15 * 60 * 1000,
    open: 2655,
    high: 2656,
    low: 2648, // Пробой вниз тенью
    close: 2654, // Но закрытие внутри!
    volume: 1800,
  };
  candles.push(falseBreakoutCandle);
  
  return candles;
}

async function runTests() {
  console.log('=== ТЕСТ ДЕТЕКТОРА ТРЕУГОЛЬНИКОВ ===\n');
  
  const detector = new TriangleDetector();
  
  // ТЕСТ 1: Детекция треугольника
  console.log('ТЕСТ 1: Детекция треугольника');
  console.log('─'.repeat(50));
  
  const candles1 = generateTriangleData();
  const triangles = detector.detectTriangles(candles1);
  
  console.log(`Найдено треугольников: ${triangles.length}`);
  
  if (triangles.length > 0) {
    const triangle = triangles[0];
    console.log(`
Треугольник:
- ID: ${triangle.id.substring(0, 8)}...
- Период: ${triangle.startIndex} - ${triangle.endIndex}
- Высота: ${triangle.height.toFixed(2)}
- Сжатие: ${(triangle.compressionRatio * 100).toFixed(1)}%
- Валидность: ${triangle.isValid ? '✓' : '✗'}
- Сходимость: ${triangle.isConverging ? '✓' : '✗'}
    `);
    
    console.log('✓ ТЕСТ 1 ПРОЙДЕН\n');
  } else {
    console.log('✗ ТЕСТ 1 НЕ ПРОЙДЕН: Треугольник не обнаружен\n');
  }
  
  // ТЕСТ 2: Детекция пробоя
  console.log('ТЕСТ 2: Детекция пробоя');
  console.log('─'.repeat(50));
  
  if (triangles.length > 0) {
    const triangle = triangles[0];
    const breakoutIndex = candles1.length - 2; // Предпоследняя свеча
    
    const breakout = detector.detectBreakout(candles1, triangle, breakoutIndex);
    
    if (breakout) {
      console.log(`
Пробой обнаружен:
- Направление: ${breakout.direction}
- Цена: ${breakout.breakoutPrice.toFixed(2)}
- Индекс: ${breakout.breakoutIndex}
- Закрытие за границей: ${breakout.isClosed ? '✓' : '✗'}
- Тело за линией: ${breakout.isBodyBreakout ? '✓' : '✗'}
      `);
      
      console.log('✓ ТЕСТ 2 ПРОЙДЕН\n');
    } else {
      console.log('✗ ТЕСТ 2 НЕ ПРОЙДЕН: Пробой не обнаружен\n');
    }
  }
  
  // ТЕСТ 3: Детекция ретеста
  console.log('ТЕСТ 3: Детекция ретеста');
  console.log('─'.repeat(50));
  
  if (triangles.length > 0) {
    const triangle = triangles[0];
    const breakoutIndex = candles1.length - 2;
    const breakout = detector.detectBreakout(candles1, triangle, breakoutIndex);
    
    if (breakout) {
      const retestIndex = candles1.length - 1; // Последняя свеча
      const retest = detector.detectRetest(candles1, triangle, breakout, retestIndex);
      
      if (retest) {
        console.log(`
Ретест обнаружен:
- Цена: ${retest.retestPrice.toFixed(2)}
- Индекс: ${retest.retestIndex}
- Линия держит: ${retest.lineHolds ? '✓' : '✗'}
- Слабые свечи: ${retest.weakCandles ? '✓' : '✗'}
        `);
        
        console.log('✓ ТЕСТ 3 ПРОЙДЕН\n');
      } else {
        console.log('✗ ТЕСТ 3 НЕ ПРОЙДЕН: Ретест не обнаружен\n');
      }
    }
  }
  
  // ТЕСТ 4: Генерация сигнала (пробой + ретест)
  console.log('ТЕСТ 4: Генерация сигнала (пробой + ретест)');
  console.log('─'.repeat(50));
  
  if (triangles.length > 0) {
    const triangle = triangles[0];
    const breakoutIndex = candles1.length - 2;
    const breakout = detector.detectBreakout(candles1, triangle, breakoutIndex);
    
    if (breakout) {
      const retestIndex = candles1.length - 1;
      const retest = detector.detectRetest(candles1, triangle, breakout, retestIndex);
      
      if (retest) {
        const signal = detector.generateSignal(
          candles1,
          triangle,
          'breakout-retest',
          breakout,
          retest
        );
        
        if (signal) {
          const riskReward = Math.abs(signal.takeProfit - signal.entryPrice) / 
                            Math.abs(signal.entryPrice - signal.stopLoss);
          
          console.log(`
Сигнал сгенерирован:
- Тип: ${signal.type}
- Направление: ${signal.direction}
- Entry: ${signal.entryPrice.toFixed(2)}
- Stop Loss: ${signal.stopLoss.toFixed(2)} (${((signal.stopLoss - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)
- Take Profit: ${signal.takeProfit.toFixed(2)} (${((signal.takeProfit - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)
- R:R: 1:${riskReward.toFixed(2)}
- Confidence: ${(signal.confidence * 100).toFixed(0)}%
- Reasoning: ${signal.reasoning}
          `);
          
          // Валидация
          const validation = detector.validateSignal(candles1, signal, retestIndex);
          console.log(`
Валидация: ${validation.isValid ? '✓ ПРОЙДЕНА' : '✗ НЕ ПРОЙДЕНА'}
${validation.reasons.length > 0 ? 'Причины:\n- ' + validation.reasons.join('\n- ') : ''}
          `);
          
          if (validation.isValid) {
            console.log('✓ ТЕСТ 4 ПРОЙДЕН\n');
          } else {
            console.log('✗ ТЕСТ 4 НЕ ПРОЙДЕН: Валидация не прошла\n');
          }
        } else {
          console.log('✗ ТЕСТ 4 НЕ ПРОЙДЕН: Сигнал не сгенерирован\n');
        }
      }
    }
  }
  
  // ТЕСТ 5: Ложный пробой
  console.log('ТЕСТ 5: Ложный пробой');
  console.log('─'.repeat(50));
  
  const candles2 = generateFalseBreakoutData();
  const triangles2 = detector.detectTriangles(candles2);
  
  if (triangles2.length > 0) {
    const triangle = triangles2[0];
    const falseBreakoutIndex = candles2.length - 1;
    
    const falseBreakout = detector.detectFalseBreakout(candles2, triangle, falseBreakoutIndex);
    
    if (falseBreakout) {
      console.log(`
Ложный пробой обнаружен:
- Направление: ${falseBreakout.fakeDirection}
- Индекс: ${falseBreakout.fakeBreakoutIndex}
- Закрытие внутри: ${falseBreakout.closedInside ? '✓' : '✗'}
      `);
      
      // Генерируем сигнал
      const signal = detector.generateSignal(
        candles2,
        triangle,
        'false-breakout',
        undefined,
        undefined,
        falseBreakout
      );
      
      if (signal) {
        const riskReward = Math.abs(signal.takeProfit - signal.entryPrice) / 
                          Math.abs(signal.entryPrice - signal.stopLoss);
        
        console.log(`
Сигнал сгенерирован:
- Тип: ${signal.type}
- Направление: ${signal.direction} (противоположно ложному пробою)
- Entry: ${signal.entryPrice.toFixed(2)}
- Stop Loss: ${signal.stopLoss.toFixed(2)}
- Take Profit: ${signal.takeProfit.toFixed(2)}
- R:R: 1:${riskReward.toFixed(2)}
- Confidence: ${(signal.confidence * 100).toFixed(0)}%
- Reasoning: ${signal.reasoning}
        `);
        
        console.log('✓ ТЕСТ 5 ПРОЙДЕН\n');
      } else {
        console.log('✗ ТЕСТ 5 НЕ ПРОЙДЕН: Сигнал не сгенерирован\n');
      }
    } else {
      console.log('✗ ТЕСТ 5 НЕ ПРОЙДЕН: Ложный пробой не обнаружен\n');
    }
  } else {
    console.log('✗ ТЕСТ 5 НЕ ПРОЙДЕН: Треугольник не обнаружен\n');
  }
  
  console.log('=== ТЕСТЫ ЗАВЕРШЕНЫ ===');
}

// Запуск тестов
runTests().catch(console.error);
