import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { calculateProbability } from '@/lib/probability';
import { 
  LiquidityEngine,
  loadConfig,
  Candlestick,
} from '@/lib/liquidity';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { message, action, context, version = 'market-analysis' } = await request.json();

    // 🔍 ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
    console.log('\n=== AI CHAT REQUEST ===');
    console.log('Asset:', context.asset);
    console.log('Current Price:', context.currentPrice);
    console.log('Price Data Length:', context.priceData?.length);
    if (context.priceData && context.priceData.length > 0) {
      const latest = context.priceData[context.priceData.length - 1];
      const first = context.priceData[0];
      console.log('Latest Candle:', {
        date: latest.date,
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close
      });
      console.log('First Candle:', {
        date: first.date,
        close: first.close
      });
      console.log('Price Range:', {
        min: Math.min(...context.priceData.map((d: any) => d.low)),
        max: Math.max(...context.priceData.map((d: any) => d.high))
      });
    }
    console.log('======================\n');

    // Анализируем последние 6 часов данных
    const recentData = context.priceData.slice(-72);
    const prices = recentData.map((d: any) => d.close);
    const highs = recentData.map((d: any) => d.high);
    const lows = recentData.map((d: any) => d.low);

    // Находим 3 уровня сопротивления и поддержки
    const resistanceLevels = findTopLevels(highs, 3);
    const supportLevels = findTopLevels(lows.map((l: number) => -l), 3).map((l: number) => -l);

    // 🔥 LIQUIDITY ENGINE - Полный анализ ликвидности
    const liquidityConfig = loadConfig();
    const liquidityEngine = new LiquidityEngine(liquidityConfig);
    
    // Конвертируем данные в формат Candlestick
    const candles: Candlestick[] = context.priceData.map((d: any) => ({
      timestamp: d.timestamp || Date.now(),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 0,
    }));

    // Полный анализ через Engine
    const rsiData = context.priceData.slice(-14).map(() => context.indicators.rsi);
    const liquidityAnalysis = await liquidityEngine.analyze(context.asset, candles, rsiData);
    
    // Группируем pools по типам
    const equalHighs = liquidityAnalysis.pools.filter(p => p.type === 'equal_highs');
    const equalLows = liquidityAnalysis.pools.filter(p => p.type === 'equal_lows');
    const pdh = liquidityAnalysis.pools.find(p => p.type === 'pdh');
    const pdl = liquidityAnalysis.pools.find(p => p.type === 'pdl');
    const asianHigh = liquidityAnalysis.pools.find(p => p.type === 'asian_high');
    const asianLow = liquidityAnalysis.pools.find(p => p.type === 'asian_low');
    const rangeHighs = liquidityAnalysis.pools.filter(p => p.type === 'range_high');
    const rangeLows = liquidityAnalysis.pools.filter(p => p.type === 'range_low');
    
    // Sweeps и структура уже детектированы Engine
    const recentSweeps = liquidityAnalysis.sweeps.slice(-5);
    const recentStructures = liquidityAnalysis.structures.slice(-5);
    
    // Breakout analysis
    let breakoutAnalysis = '';
    if (!liquidityAnalysis.hasValidSetup && liquidityAnalysis.blockingReasons.length > 0) {
      breakoutAnalysis = `\n⚠️ БЛОКИРОВКА СИГНАЛА:\n${liquidityAnalysis.blockingReasons.map((r: string) => `  • ${r}`).join('\n')}`;
    } else if (liquidityAnalysis.signal) {
      breakoutAnalysis = `\n✅ ВАЛИДНЫЙ СИГНАЛ: ${liquidityAnalysis.signal.direction} (Score: ${liquidityAnalysis.signal.score.totalScore.toFixed(1)}/100)`;
    }
    
    // Формируем текст для ИИ
    const liquidityText = `
🎯 LIQUIDITY POOLS (Зоны концентрации стоп-лоссов):

${equalHighs.length > 0 ? `• Equal Highs: ${equalHighs.map(p => `$${p.price.toFixed(2)} (сила: ${p.strength})`).join(', ')}` : ''}
${equalLows.length > 0 ? `• Equal Lows: ${equalLows.map(p => `$${p.price.toFixed(2)} (сила: ${p.strength})`).join(', ')}` : ''}
${pdh ? `• Previous Day High: $${pdh.price.toFixed(2)}` : ''}
${pdl ? `• Previous Day Low: $${pdl.price.toFixed(2)}` : ''}
${asianHigh ? `• Asian High: $${asianHigh.price.toFixed(2)}` : ''}
${asianLow ? `• Asian Low: $${asianLow.price.toFixed(2)}` : ''}
${rangeHighs.length > 0 ? `• Range Highs: ${rangeHighs.map(p => `$${p.price.toFixed(2)}`).join(', ')}` : ''}
${rangeLows.length > 0 ? `• Range Lows: ${rangeLows.map(p => `$${p.price.toFixed(2)}`).join(', ')}` : ''}

⚠️ ВАЖНО: Эти уровни - зоны где сконцентрированы стопы толпы. Smart Money часто собирает ликвидность на этих уровнях перед реальным движением.

${recentSweeps.length > 0 ? `\n🎯 LIQUIDITY SWEEPS (Сбор ликвидности обнаружен!):\n${recentSweeps.map(s => {
  const pool = liquidityAnalysis.pools.find(p => p.id === s.poolId);
  return `• ${s.direction === 'up' ? '⬆️' : '⬇️'} Sweep ${pool?.type} на ${s.sweepPrice.toFixed(2)} (фитиль: ${(s.wickSize * 100).toFixed(0)}%, откат: ${(s.rejectionStrength * 100).toFixed(0)}%)`;
}).join('\n')}\n⚠️ ВАЖНО: Smart Money собрал ликвидность! Возможен разворот или продолжение после ретеста.` : ''}

${recentStructures.length > 0 ? `\n📊 СТРУКТУРА РЫНКА:\n${recentStructures.map(s => 
  `• ${s.type} ${s.direction === 'up' ? '⬆️' : '⬇️'} на ${s.price.toFixed(2)} (значимость: ${(s.significance * 100).toFixed(0)}%)`
).join('\n')}` : ''}

${liquidityAnalysis.signal ? `\n🎯 LIQUIDITY ENGINE SIGNAL:\n• Направление: ${liquidityAnalysis.signal.direction}\n• Score: ${liquidityAnalysis.signal.score.totalScore.toFixed(1)}/100\n• Entry: ${liquidityAnalysis.signal.entryPrice.toFixed(2)}\n• Stop Loss: ${liquidityAnalysis.signal.stopLoss.toFixed(2)}\n• Take Profit: ${liquidityAnalysis.signal.takeProfit.toFixed(2)}\n• Обоснование: ${liquidityAnalysis.signal.reasoning}` : ''}
${breakoutAnalysis}
`.trim();

    // Рассчитываем вероятность и 3 точки входа
    const probabilityScore = calculateProbability(
      context.indicators,
      context.analysis,
      context.currentPrice,
      supportLevels,
      resistanceLevels,
      context.priceData
    );

    let systemPrompt = '';

    // Версия signal-generator - профессиональный формат
    if (version === 'signal-generator' && action) {
      const isBullish = context.analysis.trend === 'Восходящий';
      const isBearish = context.analysis.trend === 'Нисходящий';
      const entryPointsText = probabilityScore.entryPoints.map(ep => 
        `${ep.type === 'Агрессивный' ? '🔥' : ep.type === 'Умеренный' ? '⚖️' : '🛡️'} ${ep.type}: Вход ${ep.entryPrice.toFixed(2)}, Стоп ${ep.stopLoss.toFixed(2)}, Цель ${ep.takeProfit.toFixed(2)}, Вероятность ${ep.probability}%, RR 1:${ep.riskReward.toFixed(2)}`
      ).join('\n');

      if (action === 'BUY') {
        systemPrompt = `Ты профессиональный трейдер. Анализируешь возможность ПОКУПКИ в профессиональном формате.

ДАННЫЕ ЗА ПОСЛЕДНИЕ 6 ЧАСОВ:
- Актив: ${context.asset}
- Текущая цена: ${context.currentPrice.toFixed(2)}
- Минимум за 6ч: ${Math.min(...prices).toFixed(2)}
- Максимум за 6ч: ${Math.max(...prices).toFixed(2)}
- Тренд: ${context.analysis.trend}
- RSI: ${context.indicators.rsi.toFixed(1)}
- MACD: ${context.indicators.macd.histogram > 0 ? 'бычий' : 'медвежий'}
- Волатильность: ${context.analysis.volatility.toFixed(1)}%

${liquidityText}

УРОВНИ СОПРОТИВЛЕНИЯ:
1. ${resistanceLevels[0]?.toFixed(2) || 'N/A'}
2. ${resistanceLevels[1]?.toFixed(2) || 'N/A'}
3. ${resistanceLevels[2]?.toFixed(2) || 'N/A'}

УРОВНИ ПОДДЕРЖКИ:
1. ${supportLevels[0]?.toFixed(2) || 'N/A'}
2. ${supportLevels[1]?.toFixed(2) || 'N/A'}
3. ${supportLevels[2]?.toFixed(2) || 'N/A'}

РАССЧИТАННЫЕ ТОЧКИ ВХОДА:
${entryPointsText}

ФАКТОРЫ АНАЛИЗА:
${probabilityScore.factors.join('\n')}

🎯 КРИТИЧЕСКИЕ ПРАВИЛА ОТВЕТА:

1. НЕ ОБЕЩАЙ — ОЦЕНИВАЙ СЦЕНАРИИ
   ❌ "Цена пойдет вверх"
   ✅ "Базовый сценарий — продолжение восходящего движения"

2. ВСЕГДА ДВА СЦЕНАРИЯ (базовый + альтернативный)
   Профессионал видит оба варианта развития событий

3. РИСКИ — НЕ ФОРМАЛЬНОСТЬ
   Конкретные уровни отмены, что может пойти не так

4. БЕЗ МАГИЧЕСКИХ ПРОЦЕНТОВ
   ❌ "вероятность 80%"
   ✅ "оценка сигнала: высокая" + объяснение почему

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ОТВЕТА:

**📊 Торговый сценарий (BUY)**

• Тип сделки: [покупка на откате / пробой / разворот]
• Зона интереса: $[цена1]–$[цена2]
• Стоп-лосс: $[цена] (отмена сценария)
• Цели:
  - TP1: $[цена] (RR 1:[X])
  - TP2: $[цена] (RR 1:[X])
  - TP3: $[цена] (RR 1:[X])

**✅ Условия входа**

• [Условие 1 - конкретное, проверяемое]
• [Условие 2 - упомяни Liquidity Pools если есть]
• [Условие 3 - структура/индикаторы]

**⚠️ Риски и контроль**

• Основной риск: [конкретный сценарий что может пойти не так]
• Критический уровень отмены: $[цена] - [что произойдет если пробьет]
• Liquidity риск: [если есть sweep/pool рядом - опиши ловушку]
• [Дополнительный риск если есть]

**🔄 Альтернативный сценарий (медвежий)**

При закреплении ниже $[критический уровень]:
• сценарий покупки отменяется
• вероятен импульс к $[цена]
• структура становится медвежьей

**📈 Оценка сигнала**

Сила: [высокая / средняя / низкая]
Обоснование: [почему такая оценка - RSI, структура, ликвидность]
Таймфрейм: M15
Время реализации: [1-4 часа / 4-8 часов]

${!isBullish ? '\n⚠️ ВНИМАНИЕ: Текущая структура не поддерживает покупки. Базовый сценарий — медвежий. Покупка возможна только при изменении структуры (пробой трендовой, формирование поддержки).' : ''}`;

      } else {
        systemPrompt = `Ты профессиональный трейдер. Анализируешь возможность ПРОДАЖИ в профессиональном формате.

ДАННЫЕ ЗА ПОСЛЕДНИЕ 6 ЧАСОВ:
- Актив: ${context.asset}
- Текущая цена: ${context.currentPrice.toFixed(2)}
- Минимум за 6ч: ${Math.min(...prices).toFixed(2)}
- Максимум за 6ч: ${Math.max(...prices).toFixed(2)}
- Тренд: ${context.analysis.trend}
- RSI: ${context.indicators.rsi.toFixed(1)}
- MACD: ${context.indicators.macd.histogram > 0 ? 'бычий' : 'медвежий'}
- Волатильность: ${context.analysis.volatility.toFixed(1)}%

${liquidityText}

УРОВНИ ПОДДЕРЖКИ:
1. ${supportLevels[0]?.toFixed(2) || 'N/A'}
2. ${supportLevels[1]?.toFixed(2) || 'N/A'}
3. ${supportLevels[2]?.toFixed(2) || 'N/A'}

УРОВНИ СОПРОТИВЛЕНИЯ:
1. ${resistanceLevels[0]?.toFixed(2) || 'N/A'}
2. ${resistanceLevels[1]?.toFixed(2) || 'N/A'}
3. ${resistanceLevels[2]?.toFixed(2) || 'N/A'}

РАССЧИТАННЫЕ ТОЧКИ ВХОДА:
${entryPointsText}

ФАКТОРЫ АНАЛИЗА:
${probabilityScore.factors.join('\n')}

🎯 КРИТИЧЕСКИЕ ПРАВИЛА ОТВЕТА:

1. НЕ ОБЕЩАЙ — ОЦЕНИВАЙ СЦЕНАРИИ
   ❌ "Цена пойдет вниз"
   ✅ "Базовый сценарий — продолжение нисходящего движения"

2. ВСЕГДА ДВА СЦЕНАРИЯ (базовый + альтернативный)
   Профессионал видит оба варианта развития событий

3. РИСКИ — НЕ ФОРМАЛЬНОСТЬ
   Конкретные уровни отмены, что может пойти не так

4. БЕЗ МАГИЧЕСКИХ ПРОЦЕНТОВ
   ❌ "вероятность 80%"
   ✅ "оценка сигнала: высокая" + объяснение почему

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ОТВЕТА:

**📊 Торговый сценарий (SELL)**

• Тип сделки: [продажа на откате / пробой / разворот]
• Зона интереса: $[цена1]–$[цена2]
• Стоп-лосс: $[цена] (отмена сценария)
• Цели:
  - TP1: $[цена] (RR 1:[X])
  - TP2: $[цена] (RR 1:[X])
  - TP3: $[цена] (RR 1:[X])

**✅ Условия входа**

• [Условие 1 - конкретное, проверяемое]
• [Условие 2 - упомяни Liquidity Pools если есть]
• [Условие 3 - структура/индикаторы]

**⚠️ Риски и контроль**

• Основной риск: [конкретный сценарий что может пойти не так]
• Критический уровень отмены: $[цена] - [что произойдет если пробьет]
• Liquidity риск: [если есть sweep/pool рядом - опиши ловушку]
• [Дополнительный риск если есть]

**🔄 Альтернативный сценарий (бычий)**

При закреплении выше $[критический уровень]:
• сценарий продажи отменяется
• вероятен импульс к $[цена]
• структура становится бычьей

**📈 Оценка сигнала**

Сила: [высокая / средняя / низкая]
Обоснование: [почему такая оценка - RSI, структура, ликвидность]
Таймфрейм: M15
Время реализации: [1-4 часа / 4-8 часов]

${!isBearish ? '\n⚠️ ВНИМАНИЕ: Текущая структура не поддерживает продажи. Базовый сценарий — бычий. Продажа возможна только при изменении структуры (пробой трендовой, формирование сопротивления).' : ''}`;
      }
    }
    // Версия market-analysis - оригинальный формат
    else if (action === 'BUY') {
      const entryPointsText = probabilityScore.entryPoints.map(ep => 
        `${ep.type === 'Агрессивный' ? '🔥' : ep.type === 'Умеренный' ? '⚖️' : '🛡️'} ${ep.type}: Вход ${ep.entryPrice.toFixed(2)}, Стоп ${ep.stopLoss.toFixed(2)}, Цель ${ep.takeProfit.toFixed(2)}, Вероятность ${ep.probability}%, RR 1:${ep.riskReward.toFixed(2)}`
      ).join('\n');

      systemPrompt = `Ты профессиональный трейдер. Анализируешь возможность ПОКУПКИ.

ДАННЫЕ ЗА ПОСЛЕДНИЕ 6 ЧАСОВ:
- Актив: ${context.asset}
- Текущая цена: ${context.currentPrice.toFixed(2)}
- Минимум за 6ч: ${Math.min(...prices).toFixed(2)}
- Максимум за 6ч: ${Math.max(...prices).toFixed(2)}
- Тренд: ${context.analysis.trend}
- RSI: ${context.indicators.rsi.toFixed(1)}
- MACD: ${context.indicators.macd.histogram > 0 ? 'бычий' : 'медвежий'}
- Волатильность: ${context.analysis.volatility.toFixed(1)}%

${liquidityText}

УРОВНИ СОПРОТИВЛЕНИЯ:
1. ${resistanceLevels[0]?.toFixed(2) || 'N/A'}
2. ${resistanceLevels[1]?.toFixed(2) || 'N/A'}
3. ${resistanceLevels[2]?.toFixed(2) || 'N/A'}

УРОВНИ ПОДДЕРЖКИ:
1. ${supportLevels[0]?.toFixed(2) || 'N/A'}
2. ${supportLevels[1]?.toFixed(2) || 'N/A'}
3. ${supportLevels[2]?.toFixed(2) || 'N/A'}

РАССЧИТАННЫЕ ТОЧКИ ВХОДА:
${entryPointsText}

ФАКТОРЫ АНАЛИЗА:
${probabilityScore.factors.join('\n')}

КРИТИЧЕСКИЕ ПРАВИЛА АНАЛИЗА:

🎯 ОСНОВНЫЕ ПРИНЦИПЫ:
1. ЦЕНА — ГЛАВНЫЙ ИНДИКАТОР. Если цена говорит одно, а индикатор другое — верь цене.
2. ТРЕНД ВАЖНЕЕ ТОЧКИ ВХОДА. Покупай только в восходящем рынке. Даже плохой вход по тренду лучше идеального против него.
3. УРОВНИ — ЭТО ЗОНЫ ДЕНЕГ. Поддержка и сопротивление — не линии, а области где стояли большие ордера.
4. ПРОБОЙ БЕЗ ОБЪЁМА — ЛОЖНЫЙ. Настоящий пробой всегда идёт с объёмом.
5. РЫНОК ОХОТИТСЯ ЗА СТОПАМИ. Крупные игроки сначала идут против толпы, потом в реальном направлении.
6. СТРУКТУРА ВАЖНЕЕ НОВОСТЕЙ. Если структура бычья — плохие новости игнорируются.
7. НЕ ВСЕ РЫНКИ ОДИНАКОВЫ. Есть тренд, боковик и хаос. То что работает в боковике, убивает в тренде.
8. ЧЕМ ОЧЕВИДНЕЕ ВХОД — ТЕМ ОПАСНЕЕ. Где толпа — там стопы, манипуляция, разворот.
9. НЕ УГАДЫВАЙ — ИЩИ ПЕРЕВЕС. 55-65% вероятность с правильным риском достаточно.
10. БЕЗ УПРАВЛЕНИЯ РИСКОМ АНАЛИЗА НЕ СУЩЕСТВУЕТ.

💧 ПРАВИЛА АНАЛИЗА ЛИКВИДНОСТИ (LIQUIDITY ENGINE):
• Equal Highs/Lows - зоны где стопы толпы. Smart Money часто собирает их перед реальным движением
• PDH/PDL (Previous Day High/Low) - вчерашние экстремумы, магниты для цены
• Asian High/Low - границы азиатской сессии, часто тестируются в европейскую/американскую сессию
• Range High/Low - границы бокового движения, сильные зоны сопротивления/поддержки
• Если цена подходит к liquidity pool - жди возможный сбор ликвидности (sweep) с разворотом
• Пробой liquidity pool с длинным фитилём (>50%) = stop hunt, возможен разворот
• НЕ входи на пробое liquidity pool без подтверждения - это может быть ловушка

⚠️ ОШИБКИ ТОЛПЫ (НЕ ДЕЛАЙ ТАК):
• Не торгуй в середине диапазона — жди цену у поддержки/сопротивления
• Не входи в конце движения когда RSI уже 70
• Не ставь стопы в очевидных местах (под минимумом/над максимумом) - там liquidity pools!
• Не торгуй против структуры ("RSI перепродан" не значит покупать в нисходящем тренде)
• Не верь сигналам без контекста — учитывай структуру, ликвидность, уровни
• Помни что рынок манипулирует — показывает ложные пробои, заманивает в FOMO, выбивает стопы
• НЕ ВХОДИ на пробое Equal Highs/Lows без подтверждения - это зоны сбора ликвидности!

ТВОЯ ЗАДАЧА:
Используй рассчитанные точки входа и объясни их трейдеру простым языком, ОБЯЗАТЕЛЬНО учитывая все правила выше.

ФОРМАТ ОТВЕТА:
**Сигнал:** ПОКУПКА 🟢
**Общая вероятность:** ${probabilityScore.probability}%

**📍 ТОЧКИ ВХОДА:**

🔥 **Агрессивный** (${probabilityScore.entryPoints[0]?.probability}%)
• Вход: ${probabilityScore.entryPoints[0]?.entryPrice.toFixed(2)}
• Стоп: ${probabilityScore.entryPoints[0]?.stopLoss.toFixed(2)}
• Цель: ${probabilityScore.entryPoints[0]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[0]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[0]?.description}

⚖️ **Умеренный** (${probabilityScore.entryPoints[1]?.probability}%)
• Вход: ${probabilityScore.entryPoints[1]?.entryPrice.toFixed(2)}
• Стоп: ${probabilityScore.entryPoints[1]?.stopLoss.toFixed(2)}
• Цель: ${probabilityScore.entryPoints[1]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[1]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[1]?.description}

🛡️ **Консервативный** (${probabilityScore.entryPoints[2]?.probability}%)
• Вход: ${probabilityScore.entryPoints[2]?.entryPrice.toFixed(2)}
• Стоп: ${probabilityScore.entryPoints[2]?.stopLoss.toFixed(2)}
• Цель: ${probabilityScore.entryPoints[2]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[2]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[2]?.description}

**Почему:** ${probabilityScore.prediction.reason}`;
    } else {
      const entryPointsText = probabilityScore.entryPoints.map(ep => 
        `${ep.type === 'Агрессивный' ? '🔥' : ep.type === 'Умеренный' ? '⚖️' : '🛡️'} ${ep.type}: Вход ${ep.entryPrice.toFixed(2)}, Стоп ${ep.stopLoss.toFixed(2)}, Цель ${ep.takeProfit.toFixed(2)}, Вероятность ${ep.probability}%, RR 1:${ep.riskReward.toFixed(2)}`
      ).join('\n');

      systemPrompt = `Ты профессиональный трейдер. Анализируешь возможность ПРОДАЖИ.

ДАННЫЕ ЗА ПОСЛЕДНИЕ 6 ЧАСОВ:
- Актив: ${context.asset}
- Текущая цена: ${context.currentPrice.toFixed(2)}
- Минимум за 6ч: ${Math.min(...prices).toFixed(2)}
- Максимум за 6ч: ${Math.max(...prices).toFixed(2)}
- Тренд: ${context.analysis.trend}
- RSI: ${context.indicators.rsi.toFixed(1)}
- MACD: ${context.indicators.macd.histogram > 0 ? 'бычий' : 'медвежий'}
- Волатильность: ${context.analysis.volatility.toFixed(1)}%

${liquidityText}

УРОВНИ ПОДДЕРЖКИ:
1. ${supportLevels[0]?.toFixed(2) || 'N/A'}
2. ${supportLevels[1]?.toFixed(2) || 'N/A'}
3. ${supportLevels[2]?.toFixed(2) || 'N/A'}

УРОВНИ СОПРОТИВЛЕНИЯ:
1. ${resistanceLevels[0]?.toFixed(2) || 'N/A'}
2. ${resistanceLevels[1]?.toFixed(2) || 'N/A'}
3. ${resistanceLevels[2]?.toFixed(2) || 'N/A'}

РАССЧИТАННЫЕ ТОЧКИ ВХОДА:
${entryPointsText}

ФАКТОРЫ АНАЛИЗА:
${probabilityScore.factors.join('\n')}

КРИТИЧЕСКИЕ ПРАВИЛА АНАЛИЗА:

🎯 ОСНОВНЫЕ ПРИНЦИПЫ:
1. ЦЕНА — ГЛАВНЫЙ ИНДИКАТОР. Если цена говорит одно, а индикатор другое — верь цене.
2. ТРЕНД ВАЖНЕЕ ТОЧКИ ВХОДА. Продавай только в нисходящем рынке. Даже плохой вход по тренду лучше идеального против него.
3. УРОВНИ — ЭТО ЗОНЫ ДЕНЕГ. Поддержка и сопротивление — не линии, а области где стояли большие ордера.
4. ПРОБОЙ БЕЗ ОБЪЁМА — ЛОЖНЫЙ. Настоящий пробой всегда идёт с объёмом.
5. РЫНОК ОХОТИТСЯ ЗА СТОПАМИ. Крупные игроки сначала идут против толпы, потом в реальном направлении.
6. СТРУКТУРА ВАЖНЕЕ НОВОСТЕЙ. Если структура медвежья — хорошие новости не спасают.
7. НЕ ВСЕ РЫНКИ ОДИНАКОВЫ. Есть тренд, боковик и хаос. То что работает в боковике, убивает в тренде.
8. ЧЕМ ОЧЕВИДНЕЕ ВХОД — ТЕМ ОПАСНЕЕ. Где толпа — там стопы, манипуляция, разворот.
9. НЕ УГАДЫВАЙ — ИЩИ ПЕРЕВЕС. 55-65% вероятность с правильным риском достаточно.
10. БЕЗ УПРАВЛЕНИЯ РИСКОМ АНАЛИЗА НЕ СУЩЕСТВУЕТ.

💧 ПРАВИЛА АНАЛИЗА ЛИКВИДНОСТИ (LIQUIDITY ENGINE):
• Equal Highs/Lows - зоны где стопы толпы. Smart Money часто собирает их перед реальным движением
• PDH/PDL (Previous Day High/Low) - вчерашние экстремумы, магниты для цены
• Asian High/Low - границы азиатской сессии, часто тестируются в европейскую/американскую сессию
• Range High/Low - границы бокового движения, сильные зоны сопротивления/поддержки
• Если цена подходит к liquidity pool - жди возможный сбор ликвидности (sweep) с разворотом
• Пробой liquidity pool с длинным фитилём (>50%) = stop hunt, возможен разворот
• НЕ входи на пробое liquidity pool без подтверждения - это может быть ловушка

⚠️ ОШИБКИ ТОЛПЫ (НЕ ДЕЛАЙ ТАК):
• Не торгуй в середине диапазона — жди цену у поддержки/сопротивления
• Не входи в конце движения когда RSI уже 30
• Не ставь стопы в очевидных местах (под минимумом/над максимумом) - там liquidity pools!
• Не торгуй против структуры ("RSI перекуплен" не значит продавать в восходящем тренде)
• Не верь сигналам без контекста — учитывай структуру, ликвидность, уровни
• Помни что рынок манипулирует — показывает ложные пробои, заманивает в FOMO, выбивает стопы
• НЕ ВХОДИ на пробое Equal Highs/Lows без подтверждения - это зоны сбора ликвидности!

ТВОЯ ЗАДАЧА:
Используй рассчитанные точки входа и объясни их трейдеру простым языком, ОБЯЗАТЕЛЬНО учитывая все правила выше.

ФОРМАТ ОТВЕТА:
**Сигнал:** ПРОДАЖА 🔴
**Общая вероятность:** ${probabilityScore.probability}%

**📍 ТОЧКИ ВХОДА:**

🔥 **Агрессивный** (${probabilityScore.entryPoints[0]?.probability}%)
• Вход: ${probabilityScore.entryPoints[0]?.entryPrice.toFixed(2)}
• Стоп: ${probabilityScore.entryPoints[0]?.stopLoss.toFixed(2)}
• Цель: ${probabilityScore.entryPoints[0]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[0]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[0]?.description}

⚖️ **Умеренный** (${probabilityScore.entryPoints[1]?.probability}%)
• Вход: ${probabilityScore.entryPoints[1]?.entryPrice.toFixed(2)}
• Стоп: ${probabilityScore.entryPoints[1]?.stopLoss.toFixed(2)}
• Цель: ${probabilityScore.entryPoints[1]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[1]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[1]?.description}

🛡️ **Консервативный** (${probabilityScore.entryPoints[2]?.probability}%)
• Вход: ${probabilityScore.entryPoints[2]?.entryPrice.toFixed(2)}
• Стоп: ${probabilityScore.entryPoints[2]?.stopLoss.toFixed(2)}
• Цель: ${probabilityScore.entryPoints[2]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[2]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[2]?.description}

**Почему:** ${probabilityScore.prediction.reason}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500, // Увеличено с 600 для полных ответов
      temperature: 0.1, // Уменьшено с 0.3 для более стабильных ответов
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      system: systemPrompt
    });

    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Не могу обработать запрос';

    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка API' },
      { status: 500 }
    );
  }
}

// Функция для поиска ключевых уровней
function findTopLevels(data: number[], count: number): number[] {
  const peaks: number[] = [];
  
  for (let i = 2; i < data.length - 2; i++) {
    if (data[i] > data[i-1] && data[i] > data[i-2] && 
        data[i] > data[i+1] && data[i] > data[i+2]) {
      peaks.push(data[i]);
    }
  }
  
  return peaks.sort((a, b) => b - a).slice(0, count);
}
