import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { calculateProbability } from '@/lib/probability';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { message, action, context } = await request.json();

    // Анализируем последние 6 часов данных
    const recentData = context.priceData.slice(-72);
    const prices = recentData.map((d: any) => d.close);
    const highs = recentData.map((d: any) => d.high);
    const lows = recentData.map((d: any) => d.low);

    // Находим 3 уровня сопротивления и поддержки
    const resistanceLevels = findTopLevels(highs, 3);
    const supportLevels = findTopLevels(lows.map((l: number) => -l), 3).map((l: number) => -l);

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

    if (action === 'BUY') {
      const entryPointsText = probabilityScore.entryPoints.map(ep => 
        `${ep.type === 'Агрессивный' ? '🔥' : ep.type === 'Умеренный' ? '⚖️' : '🛡️'} ${ep.type}: Вход $${ep.entryPrice.toFixed(2)}, Стоп $${ep.stopLoss.toFixed(2)}, Цель $${ep.takeProfit.toFixed(2)}, Вероятность ${ep.probability}%, RR 1:${ep.riskReward.toFixed(2)}`
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

ТВОЯ ЗАДАЧА:
Используй рассчитанные точки входа и объясни их трейдеру простым языком.

ФОРМАТ ОТВЕТА:
**Сигнал:** ПОКУПКА 🟢
**Общая вероятность:** ${probabilityScore.probability}%

**📍 ТОЧКИ ВХОДА:**

🔥 **Агрессивный** (${probabilityScore.entryPoints[0]?.probability}%)
• Вход: $${probabilityScore.entryPoints[0]?.entryPrice.toFixed(2)}
• Стоп: $${probabilityScore.entryPoints[0]?.stopLoss.toFixed(2)}
• Цель: $${probabilityScore.entryPoints[0]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[0]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[0]?.description}

⚖️ **Умеренный** (${probabilityScore.entryPoints[1]?.probability}%)
• Вход: $${probabilityScore.entryPoints[1]?.entryPrice.toFixed(2)}
• Стоп: $${probabilityScore.entryPoints[1]?.stopLoss.toFixed(2)}
• Цель: $${probabilityScore.entryPoints[1]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[1]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[1]?.description}

🛡️ **Консервативный** (${probabilityScore.entryPoints[2]?.probability}%)
• Вход: $${probabilityScore.entryPoints[2]?.entryPrice.toFixed(2)}
• Стоп: $${probabilityScore.entryPoints[2]?.stopLoss.toFixed(2)}
• Цель: $${probabilityScore.entryPoints[2]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[2]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[2]?.description}

**Почему:** ${probabilityScore.prediction.reason}`;
    } else {
      const entryPointsText = probabilityScore.entryPoints.map(ep => 
        `${ep.type === 'Агрессивный' ? '🔥' : ep.type === 'Умеренный' ? '⚖️' : '🛡️'} ${ep.type}: Вход $${ep.entryPrice.toFixed(2)}, Стоп $${ep.stopLoss.toFixed(2)}, Цель $${ep.takeProfit.toFixed(2)}, Вероятность ${ep.probability}%, RR 1:${ep.riskReward.toFixed(2)}`
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

ТВОЯ ЗАДАЧА:
Используй рассчитанные точки входа и объясни их трейдеру простым языком.

ФОРМАТ ОТВЕТА:
**Сигнал:** ПРОДАЖА 🔴
**Общая вероятность:** ${probabilityScore.probability}%

**📍 ТОЧКИ ВХОДА:**

🔥 **Агрессивный** (${probabilityScore.entryPoints[0]?.probability}%)
• Вход: $${probabilityScore.entryPoints[0]?.entryPrice.toFixed(2)}
• Стоп: $${probabilityScore.entryPoints[0]?.stopLoss.toFixed(2)}
• Цель: $${probabilityScore.entryPoints[0]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[0]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[0]?.description}

⚖️ **Умеренный** (${probabilityScore.entryPoints[1]?.probability}%)
• Вход: $${probabilityScore.entryPoints[1]?.entryPrice.toFixed(2)}
• Стоп: $${probabilityScore.entryPoints[1]?.stopLoss.toFixed(2)}
• Цель: $${probabilityScore.entryPoints[1]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[1]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[1]?.description}

🛡️ **Консервативный** (${probabilityScore.entryPoints[2]?.probability}%)
• Вход: $${probabilityScore.entryPoints[2]?.entryPrice.toFixed(2)}
• Стоп: $${probabilityScore.entryPoints[2]?.stopLoss.toFixed(2)}
• Цель: $${probabilityScore.entryPoints[2]?.takeProfit.toFixed(2)}
• Risk/Reward: 1:${probabilityScore.entryPoints[2]?.riskReward.toFixed(2)}
• ${probabilityScore.entryPoints[2]?.description}

**Почему:** ${probabilityScore.prediction.reason}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      temperature: 0.3,
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
