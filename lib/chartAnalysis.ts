import { PriceData } from '@/types';

export interface TrendLine {
  type: 'support' | 'resistance' | 'trendline';
  points: { x: number; y: number }[];
  price: number;
  strength: number; // 1-5, количество касаний
  color: string;
  label: string;
}

export interface ChartPattern {
  type: 'triangle' | 'channel' | 'double-top' | 'double-bottom' | 'head-shoulders';
  lines: TrendLine[];
  description: string;
}

// Находит уровни поддержки (горизонтальные линии)
export function findSupportLevels(data: PriceData[], minTouches: number = 2): TrendLine[] {
  const levels: TrendLine[] = [];
  const lows = data.map((d, i) => ({ price: d.low, index: i }));
  
  // Группируем близкие минимумы
  const avgPrice = lows.reduce((sum, l) => sum + l.price, 0) / lows.length;
  const tolerance = avgPrice * 0.005; // 0.5% от средней цены (абсолютное значение)
  const groups: { price: number; indices: number[] }[] = [];
  
  lows.forEach(low => {
    let found = false;
    for (const group of groups) {
      if (Math.abs(low.price - group.price) < tolerance) {
        group.indices.push(low.index);
        group.price = (group.price * (group.indices.length - 1) + low.price) / group.indices.length;
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({ price: low.price, indices: [low.index] });
    }
  });
  
  // Фильтруем группы с минимальным количеством касаний
  groups
    .filter(g => g.indices.length >= minTouches)
    .sort((a, b) => b.indices.length - a.indices.length)
    .slice(0, 5) // Увеличено до 5 уровней
    .forEach(group => {
      levels.push({
        type: 'support',
        points: group.indices.map(i => ({ x: i, y: group.price })),
        price: group.price,
        strength: group.indices.length,
        color: '#26a69a',
        label: `Поддержка: ${group.price.toFixed(2)} (${group.indices.length} касаний)`
      });
    });
  
  return levels;
}

// Находит уровни сопротивления (горизонтальные линии)
export function findResistanceLevels(data: PriceData[], minTouches: number = 2): TrendLine[] {
  const levels: TrendLine[] = [];
  const highs = data.map((d, i) => ({ price: d.high, index: i }));
  
  // Группируем близкие максимумы
  const avgPrice = highs.reduce((sum, h) => sum + h.price, 0) / highs.length;
  const tolerance = avgPrice * 0.005; // 0.5% от средней цены (абсолютное значение)
  const groups: { price: number; indices: number[] }[] = [];
  
  highs.forEach(high => {
    let found = false;
    for (const group of groups) {
      if (Math.abs(high.price - group.price) < tolerance) {
        group.indices.push(high.index);
        group.price = (group.price * (group.indices.length - 1) + high.price) / group.indices.length;
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({ price: high.price, indices: [high.index] });
    }
  });
  
  // Фильтруем группы
  groups
    .filter(g => g.indices.length >= minTouches)
    .sort((a, b) => b.indices.length - a.indices.length)
    .slice(0, 5) // Увеличено до 5 уровней
    .forEach(group => {
      levels.push({
        type: 'resistance',
        points: group.indices.map(i => ({ x: i, y: group.price })),
        price: group.price,
        strength: group.indices.length,
        color: '#ef5350',
        label: `Сопротивление: ${group.price.toFixed(2)} (${group.indices.length} касаний)`
      });
    });
  
  return levels;
}

// Находит линию восходящего тренда
export function findUpTrendLine(data: PriceData[]): TrendLine | null {
  if (data.length < 20) return null;
  
  const lows: { index: number; price: number }[] = [];
  
  // Находим локальные минимумы
  for (let i = 2; i < data.length - 2; i++) {
    if (data[i].low < data[i-1].low && data[i].low < data[i-2].low &&
        data[i].low < data[i+1].low && data[i].low < data[i+2].low) {
      lows.push({ index: i, price: data[i].low });
    }
  }
  
  if (lows.length < 2) return null;
  
  // Находим лучшую линию тренда через минимумы
  let bestLine: { start: number; end: number; slope: number; touches: number } | null = null;
  
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const slope = (lows[j].price - lows[i].price) / (lows[j].index - lows[i].index);
      
      // Только восходящие линии
      if (slope <= 0) continue;
      
      // Считаем касания
      let touches = 2;
      for (let k = 0; k < lows.length; k++) {
        if (k === i || k === j) continue;
        const expectedPrice = lows[i].price + slope * (lows[k].index - lows[i].index);
        if (Math.abs(lows[k].price - expectedPrice) / expectedPrice < 0.005) {
          touches++;
        }
      }
      
      if (!bestLine || touches > bestLine.touches) {
        bestLine = { start: i, end: j, slope, touches };
      }
    }
  }
  
  if (!bestLine) return null;
  
  const startPoint = lows[bestLine.start];
  const endPoint = lows[bestLine.end];
  
  return {
    type: 'trendline',
    points: [
      { x: startPoint.index, y: startPoint.price },
      { x: data.length - 1, y: startPoint.price + bestLine.slope * (data.length - 1 - startPoint.index) }
    ],
    price: startPoint.price,
    strength: bestLine.touches,
    color: '#2196f3',
    label: `Восходящий тренд (${bestLine.touches} касаний)`
  };
}

// Находит линию нисходящего тренда
export function findDownTrendLine(data: PriceData[]): TrendLine | null {
  if (data.length < 20) return null;
  
  const highs: { index: number; price: number }[] = [];
  
  // Находим локальные максимумы
  for (let i = 2; i < data.length - 2; i++) {
    if (data[i].high > data[i-1].high && data[i].high > data[i-2].high &&
        data[i].high > data[i+1].high && data[i].high > data[i+2].high) {
      highs.push({ index: i, price: data[i].high });
    }
  }
  
  if (highs.length < 2) return null;
  
  // Находим лучшую линию тренда
  let bestLine: { start: number; end: number; slope: number; touches: number } | null = null;
  
  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const slope = (highs[j].price - highs[i].price) / (highs[j].index - highs[i].index);
      
      // Только нисходящие линии
      if (slope >= 0) continue;
      
      // Считаем касания
      let touches = 2;
      for (let k = 0; k < highs.length; k++) {
        if (k === i || k === j) continue;
        const expectedPrice = highs[i].price + slope * (highs[k].index - highs[i].index);
        if (Math.abs(highs[k].price - expectedPrice) / expectedPrice < 0.005) {
          touches++;
        }
      }
      
      if (!bestLine || touches > bestLine.touches) {
        bestLine = { start: i, end: j, slope, touches };
      }
    }
  }
  
  if (!bestLine) return null;
  
  const startPoint = highs[bestLine.start];
  
  return {
    type: 'trendline',
    points: [
      { x: startPoint.index, y: startPoint.price },
      { x: data.length - 1, y: startPoint.price + bestLine.slope * (data.length - 1 - startPoint.index) }
    ],
    price: startPoint.price,
    strength: bestLine.touches,
    color: '#ff9800',
    label: `Нисходящий тренд (${bestLine.touches} касаний)`
  };
}

// Определяет паттерн "канал"
export function findChannel(data: PriceData[]): ChartPattern | null {
  const upTrend = findUpTrendLine(data);
  const downTrend = findDownTrendLine(data);
  
  if (!upTrend || !downTrend) return null;
  
  // Проверяем параллельность
  const upSlope = (upTrend.points[1].y - upTrend.points[0].y) / (upTrend.points[1].x - upTrend.points[0].x);
  const downSlope = (downTrend.points[1].y - downTrend.points[0].y) / (downTrend.points[1].x - downTrend.points[0].x);
  
  if (Math.abs(upSlope - downSlope) / Math.abs(upSlope) > 0.3) return null;
  
  return {
    type: 'channel',
    lines: [upTrend, downTrend],
    description: 'Канал - цена движется между двумя параллельными линиями'
  };
}

// Главная функция анализа
export function analyzeChart(data: PriceData[]): {
  supports: TrendLine[];
  resistances: TrendLine[];
  trendLines: TrendLine[];
  patterns: ChartPattern[];
} {
  const supports = findSupportLevels(data);
  const resistances = findResistanceLevels(data);
  const trendLines: TrendLine[] = [];
  const patterns: ChartPattern[] = [];
  
  const upTrend = findUpTrendLine(data);
  const downTrend = findDownTrendLine(data);
  
  if (upTrend) trendLines.push(upTrend);
  if (downTrend) trendLines.push(downTrend);
  
  const channel = findChannel(data);
  if (channel) patterns.push(channel);
  
  return { supports, resistances, trendLines, patterns };
}
