/**
 * SessionManager - Управление торговыми сессиями
 * 
 * Определяет текущую торговую сессию и корректирует параметры анализа
 */

export type TradingSession = 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP';
export type Volatility = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface SessionConfig {
  session: TradingSession;
  volatility: Volatility;
  minScore: number;
  atrMultiplier: number;
  description: string;
  recommendation: string;
}

/**
 * Определяет текущую торговую сессию
 */
export function getTradingSession(date: Date = new Date()): SessionConfig {
  const utcHour = date.getUTCHours();
  
  // Overlap (Лондон + Нью-Йорк): 13:00-16:00 UTC
  // Самая волатильная сессия, лучшее время для торговли
  if (utcHour >= 13 && utcHour < 16) {
    return {
      session: 'OVERLAP',
      volatility: 'VERY_HIGH',
      minScore: 45, // Ниже порог - больше возможностей
      atrMultiplier: 1.2, // Уже стопы - движения быстрые
      description: 'Overlap (Лондон + Нью-Йорк)',
      recommendation: '🔥 ЛУЧШЕЕ ВРЕМЯ! Максимальная волатильность и ликвидность'
    };
  }
  
  // Лондон: 07:00-16:00 UTC
  // Высокая волатильность, хорошее время для торговли
  if (utcHour >= 7 && utcHour < 16) {
    return {
      session: 'LONDON',
      volatility: 'HIGH',
      minScore: 50,
      atrMultiplier: 1.5,
      description: 'Лондонская сессия',
      recommendation: '✅ Хорошее время для торговли'
    };
  }
  
  // Нью-Йорк: 13:00-22:00 UTC
  // Высокая волатильность, хорошее время для торговли
  if (utcHour >= 13 && utcHour < 22) {
    return {
      session: 'NEW_YORK',
      volatility: 'HIGH',
      minScore: 50,
      atrMultiplier: 1.5,
      description: 'Нью-Йоркская сессия',
      recommendation: '✅ Хорошее время для торговли'
    };
  }
  
  // Азиатская: 00:00-08:00 UTC
  // Низкая волатильность, много ложных пробоев
  return {
    session: 'ASIAN',
    volatility: 'LOW',
    minScore: 65, // Выше порог - меньше ложных сигналов
    atrMultiplier: 2.0, // Шире стопы - избегаем ложных срабатываний
    description: 'Азиатская сессия',
    recommendation: '⚠️ ОСТОРОЖНО! Низкая волатильность, много ложных пробоев. Уменьши размер позиции.'
  };
}

/**
 * Проверяет, подходит ли текущая сессия для торговли
 */
export function isGoodTradingTime(date: Date = new Date()): {
  isGood: boolean;
  reason: string;
  config: SessionConfig;
} {
  const config = getTradingSession(date);
  
  if (config.session === 'OVERLAP') {
    return {
      isGood: true,
      reason: 'Overlap - лучшее время для торговли',
      config
    };
  }
  
  if (config.session === 'LONDON' || config.session === 'NEW_YORK') {
    return {
      isGood: true,
      reason: 'Высокая волатильность - хорошее время',
      config
    };
  }
  
  return {
    isGood: false,
    reason: 'Азиатская сессия - низкая волатильность, много ложных пробоев',
    config
  };
}

/**
 * Форматирует информацию о сессии для AI промпта
 */
export function formatSessionInfo(config: SessionConfig): string {
  return `
⏰ ТОРГОВАЯ СЕССИЯ:
• Текущая сессия: ${config.description}
• Волатильность: ${config.volatility}
• Минимальный score: ${config.minScore}/100
• ${config.recommendation}

${config.session === 'ASIAN' ? `
⚠️ ПРАВИЛА ДЛЯ АЗИАТСКОЙ СЕССИИ:
• Избегай агрессивных входов
• Уменьши размер позиции на 50%
• Расширь стопы (ATR x 2.0)
• Требуй более сильное подтверждение (score >= 65)
• Много ложных пробоев - будь осторожен!
` : ''}

${config.session === 'OVERLAP' ? `
🔥 ПРАВИЛА ДЛЯ OVERLAP:
• Максимальная волатильность - лучшее время!
• Можно входить агрессивнее (score >= 45)
• Стопы уже (ATR x 1.2) - движения быстрые
• Высокая ликвидность - меньше проскальзывания
` : ''}
`.trim();
}

/**
 * Корректирует минимальный score на основе сессии
 */
export function adjustMinScore(baseScore: number, session: TradingSession): number {
  switch (session) {
    case 'OVERLAP':
      return Math.max(45, baseScore - 5);
    case 'LONDON':
    case 'NEW_YORK':
      return baseScore;
    case 'ASIAN':
      return Math.max(65, baseScore + 15);
  }
}

/**
 * Корректирует ATR множитель на основе сессии
 */
export function adjustATRMultiplier(baseMultiplier: number, session: TradingSession): number {
  switch (session) {
    case 'OVERLAP':
      return baseMultiplier * 0.8; // Уже стопы
    case 'LONDON':
    case 'NEW_YORK':
      return baseMultiplier;
    case 'ASIAN':
      return baseMultiplier * 1.3; // Шире стопы
  }
}

/**
 * Рекомендует размер позиции на основе сессии
 */
export function getPositionSizeMultiplier(session: TradingSession): number {
  switch (session) {
    case 'OVERLAP':
      return 1.0; // Полный размер
    case 'LONDON':
    case 'NEW_YORK':
      return 1.0; // Полный размер
    case 'ASIAN':
      return 0.5; // Половина размера
  }
}
