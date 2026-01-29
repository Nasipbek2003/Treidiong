/**
 * Пример использования TriangleDetector
 * 
 * Демонстрирует как интегрировать детекцию треугольников
 * в существующую систему анализа
 */

import { TriangleDetector } from './triangle-detector';
import { Candlestick } from './types';

/**
 * Пример 1: Базовая детекция треугольников
 */
export function exampleBasicDetection(candles: Candlestick[]) {
  const detector = new TriangleDetector();
  
  // Находим все треугольники
  const triangles = detector.detectTriangles(candles);
  
  console.log(`Найдено треугольников: ${triangles.length}`);
  
  for (const triangle of triangles) {
    console.log(`
Треугольник #${triangle.id}:
- Период: ${triangle.startIndex} - ${triangle.endIndex}
- Высота: ${triangle.height.toFixed(2)}
- Сжатие: ${(triangle.compressionRatio * 100).toFixed(1)}%
- Валидность: ${triangle.isValid ? '✓' : '✗'}
    `);
  }
  
  return triangles;
}

/**
 * Пример 2: Детекция пробоя с ретестом
 */
export function exampleBreakoutRetest(candles: Candlestick[]) {
  const detector = new TriangleDetector();
  const triangles = detector.detectTriangles(candles);
  
  if (triangles.length === 0) {
    console.log('Треугольники не найдены');
    return null;
  }
  
  const triangle = triangles[0];
  const currentIndex = candles.length - 1;
  
  // Проверяем пробой
  const breakout = detector.detectBreakout(candles, triangle, currentIndex);
  
  if (!breakout) {
    console.log('Пробой не обнаружен');
    return null;
  }
  
  console.log(`
Пробой обнаружен:
- Направление: ${breakout.direction}
- Цена: ${breakout.breakoutPrice.toFixed(2)}
- Индекс: ${breakout.breakoutIndex}
- Тело за линией: ${breakout.isBodyBreakout ? '✓' : '✗'}
  `);
  
  // Ждём ретест (проверяем следующие 10 свечей)
  for (let i = breakout.breakoutIndex + 1; i < Math.min(candles.length, breakout.breakoutIndex + 11); i++) {
    const retest = detector.detectRetest(candles, triangle, breakout, i);
    
    if (retest) {
      console.log(`
Ретест обнаружен:
- Цена: ${retest.retestPrice.toFixed(2)}
- Индекс: ${retest.retestIndex}
- Линия держит: ${retest.lineHolds ? '✓' : '✗'}
- Слабые свечи: ${retest.weakCandles ? '✓' : '✗'}
      `);
      
      // Генерируем сигнал
      const signal = detector.generateSignal(
        candles,
        triangle,
        'breakout-retest',
        breakout,
        retest
      );
      
      if (signal) {
        console.log(`
СИГНАЛ СГЕНЕРИРОВАН:
- Направление: ${signal.direction}
- Entry: ${signal.entryPrice.toFixed(2)}
- Stop: ${signal.stopLoss.toFixed(2)}
- Target: ${signal.takeProfit.toFixed(2)}
- R:R: ${((signal.takeProfit - signal.entryPrice) / (signal.entryPrice - signal.stopLoss)).toFixed(2)}
- Confidence: ${(signal.confidence * 100).toFixed(0)}%
- Reasoning: ${signal.reasoning}
        `);
        
        // Валидация
        const validation = detector.validateSignal(candles, signal, i);
        console.log(`
Валидация: ${validation.isValid ? '✓ ПРОЙДЕНА' : '✗ НЕ ПРОЙДЕНА'}
${validation.reasons.length > 0 ? 'Причины:\n- ' + validation.reasons.join('\n- ') : ''}
        `);
        
        return signal;
      }
    }
  }
  
  console.log('Ретест не обнаружен');
  return null;
}

/**
 * Пример 3: Детекция ложного пробоя
 */
export function exampleFalseBreakout(candles: Candlestick[]) {
  const detector = new TriangleDetector();
  const triangles = detector.detectTriangles(candles);
  
  if (triangles.length === 0) {
    console.log('Треугольники не найдены');
    return null;
  }
  
  const triangle = triangles[0];
  
  // Проверяем последние 10 свечей на ложный пробой
  for (let i = Math.max(triangle.startIndex, candles.length - 10); i < candles.length; i++) {
    const falseBreakout = detector.detectFalseBreakout(candles, triangle, i);
    
    if (falseBreakout) {
      console.log(`
Ложный пробой обнаружен:
- Направление: ${falseBreakout.fakeDirection}
- Индекс: ${falseBreakout.fakeBreakoutIndex}
- Закрытие внутри: ${falseBreakout.closedInside ? '✓' : '✗'}
      `);
      
      // Генерируем сигнал
      const signal = detector.generateSignal(
        candles,
        triangle,
        'false-breakout',
        undefined,
        undefined,
        falseBreakout
      );
      
      if (signal) {
        console.log(`
СИГНАЛ СГЕНЕРИРОВАН:
- Направление: ${signal.direction} (противоположно ложному пробою)
- Entry: ${signal.entryPrice.toFixed(2)}
- Stop: ${signal.stopLoss.toFixed(2)}
- Target: ${signal.takeProfit.toFixed(2)}
- R:R: ${((signal.takeProfit - signal.entryPrice) / (signal.entryPrice - signal.stopLoss)).toFixed(2)}
- Confidence: ${(signal.confidence * 100).toFixed(0)}%
- Reasoning: ${signal.reasoning}
        `);
        
        // Валидация
        const validation = detector.validateSignal(candles, signal, i);
        console.log(`
Валидация: ${validation.isValid ? '✓ ПРОЙДЕНА' : '✗ НЕ ПРОЙДЕНА'}
${validation.reasons.length > 0 ? 'Причины:\n- ' + validation.reasons.join('\n- ') : ''}
        `);
        
        return signal;
      }
    }
  }
  
  console.log('Ложный пробой не обнаружен');
  return null;
}

/**
 * Пример 4: Полный цикл анализа
 */
export function exampleFullAnalysis(candles: Candlestick[]) {
  console.log('=== ПОЛНЫЙ АНАЛИЗ ТРЕУГОЛЬНИКОВ ===\n');
  
  const detector = new TriangleDetector();
  
  // 1. Детекция треугольников
  console.log('ШАГ 1: Детекция треугольников...');
  const triangles = detector.detectTriangles(candles);
  console.log(`Найдено: ${triangles.length}\n`);
  
  if (triangles.length === 0) {
    return { triangles: [], signals: [] };
  }
  
  const signals = [];
  
  // 2. Анализ каждого треугольника
  for (const triangle of triangles) {
    console.log(`\nАнализ треугольника #${triangle.id.substring(0, 8)}...`);
    
    const currentIndex = candles.length - 1;
    
    // 2a. Проверка пробоя
    const breakout = detector.detectBreakout(candles, triangle, currentIndex);
    
    if (breakout) {
      console.log(`✓ Пробой ${breakout.direction}`);
      
      // 2b. Проверка ретеста
      for (let i = breakout.breakoutIndex + 1; i < Math.min(candles.length, breakout.breakoutIndex + 11); i++) {
        const retest = detector.detectRetest(candles, triangle, breakout, i);
        
        if (retest) {
          console.log(`✓ Ретест обнаружен`);
          
          const signal = detector.generateSignal(
            candles,
            triangle,
            'breakout-retest',
            breakout,
            retest
          );
          
          if (signal) {
            const validation = detector.validateSignal(candles, signal, i);
            
            if (validation.isValid) {
              console.log(`✓ Сигнал валиден: ${signal.direction} @ ${signal.entryPrice.toFixed(2)}`);
              signals.push(signal);
            } else {
              console.log(`✗ Сигнал отклонён: ${validation.reasons.join(', ')}`);
            }
          }
          
          break;
        }
      }
    }
    
    // 2c. Проверка ложного пробоя
    for (let i = Math.max(triangle.startIndex, candles.length - 10); i < candles.length; i++) {
      const falseBreakout = detector.detectFalseBreakout(candles, triangle, i);
      
      if (falseBreakout) {
        console.log(`✓ Ложный пробой ${falseBreakout.fakeDirection}`);
        
        const signal = detector.generateSignal(
          candles,
          triangle,
          'false-breakout',
          undefined,
          undefined,
          falseBreakout
        );
        
        if (signal) {
          const validation = detector.validateSignal(candles, signal, i);
          
          if (validation.isValid) {
            console.log(`✓ Сигнал валиден: ${signal.direction} @ ${signal.entryPrice.toFixed(2)}`);
            signals.push(signal);
          } else {
            console.log(`✗ Сигнал отклонён: ${validation.reasons.join(', ')}`);
          }
        }
        
        break;
      }
    }
  }
  
  console.log(`\n=== ИТОГО: ${signals.length} валидных сигналов ===\n`);
  
  return { triangles, signals };
}

/**
 * Пример 5: Интеграция с LiquidityEngine
 */
export function exampleIntegrationWithEngine(candles: Candlestick[]) {
  const detector = new TriangleDetector();
  
  // Это можно добавить в LiquidityEngine.analyze()
  const triangles = detector.detectTriangles(candles);
  const currentIndex = candles.length - 1;
  
  const triangleSignals = [];
  
  for (const triangle of triangles) {
    // Проверка пробоя + ретест
    const breakout = detector.detectBreakout(candles, triangle, currentIndex);
    
    if (breakout) {
      for (let i = breakout.breakoutIndex + 1; i < Math.min(candles.length, breakout.breakoutIndex + 11); i++) {
        const retest = detector.detectRetest(candles, triangle, breakout, i);
        
        if (retest) {
          const signal = detector.generateSignal(
            candles,
            triangle,
            'breakout-retest',
            breakout,
            retest
          );
          
          if (signal) {
            const validation = detector.validateSignal(candles, signal, i);
            
            if (validation.isValid) {
              triangleSignals.push({
                ...signal,
                source: 'triangle',
                score: calculateTriangleScore(signal),
              });
            }
          }
          
          break;
        }
      }
    }
    
    // Проверка ложного пробоя
    const falseBreakout = detector.detectFalseBreakout(candles, triangle, currentIndex);
    
    if (falseBreakout) {
      const signal = detector.generateSignal(
        candles,
        triangle,
        'false-breakout',
        undefined,
        undefined,
        falseBreakout
      );
      
      if (signal) {
        const validation = detector.validateSignal(candles, signal, currentIndex);
        
        if (validation.isValid) {
          triangleSignals.push({
            ...signal,
            source: 'triangle',
            score: calculateTriangleScore(signal),
          });
        }
      }
    }
  }
  
  return triangleSignals;
}

/**
 * Рассчитать score для треугольного сигнала
 */
function calculateTriangleScore(signal: any): number {
  let score = 0;
  
  // Качество треугольника (0-10)
  score += signal.triangle.compressionRatio * 10;
  
  // Тип сигнала (0-10)
  if (signal.type === 'breakout-retest') {
    score += 10; // Самый надёжный
  } else if (signal.type === 'false-breakout') {
    score += 7; // Менее надёжный
  }
  
  // Confidence (0-5)
  score += signal.confidence * 5;
  
  return Math.min(score, 20); // Максимум 20 баллов
}
