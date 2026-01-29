/**
 * Утилита для определения текущей торговой сессии
 */

export interface TradingSession {
  name: string;
  displayName: string;
  startHour: number; // UTC
  endHour: number;   // UTC
  color: string;
  description: string;
}

export const TRADING_SESSIONS: TradingSession[] = [
  {
    name: 'sydney',
    displayName: 'Sydney',
    startHour: 22,
    endHour: 7,
    color: '#8BC34A',
    description: 'Азиатско-Тихоокеанская сессия (Сидней). Низкая волатильность, подходит для AUD пар.'
  },
  {
    name: 'tokyo',
    displayName: 'Tokyo',
    startHour: 0,
    endHour: 9,
    color: '#E91E63',
    description: 'Азиатская сессия (Токио). Активная торговля JPY парами, средняя волатильность.'
  },
  {
    name: 'london',
    displayName: 'London',
    startHour: 7,
    endHour: 16,
    color: '#673AB7',
    description: 'Европейская сессия (Лондон). Высокая волатильность, активная торговля EUR, GBP парами.'
  },
  {
    name: 'newyork',
    displayName: 'New York',
    startHour: 13,
    endHour: 22,
    color: '#795548',
    description: 'Американская сессия (Нью-Йорк). Высокая волатильность, активная торговля USD парами.'
  }
];

/**
 * Определяет текущую активную торговую сессию
 * @param date - Дата для проверки (по умолчанию текущее время)
 * @returns Массив активных сессий (может быть несколько одновременно)
 */
export function getCurrentTradingSessions(date: Date = new Date()): TradingSession[] {
  const hour = date.getUTCHours();
  const activeSessions: TradingSession[] = [];

  TRADING_SESSIONS.forEach(session => {
    let isActive = false;

    // Обработка сессий, которые переходят через полночь (Sydney)
    if (session.startHour > session.endHour) {
      isActive = hour >= session.startHour || hour < session.endHour;
    } else {
      isActive = hour >= session.startHour && hour < session.endHour;
    }

    if (isActive) {
      activeSessions.push(session);
    }
  });

  return activeSessions;
}

/**
 * Получает основную (наиболее важную) активную сессию
 * Приоритет: London > New York > Tokyo > Sydney
 */
export function getPrimarySession(date: Date = new Date()): TradingSession | null {
  const activeSessions = getCurrentTradingSessions(date);
  
  if (activeSessions.length === 0) return null;

  // Приоритет сессий по важности
  const priority = ['london', 'newyork', 'tokyo', 'sydney'];
  
  for (const sessionName of priority) {
    const session = activeSessions.find(s => s.name === sessionName);
    if (session) return session;
  }

  return activeSessions[0];
}

/**
 * Проверяет, является ли текущее время периодом перекрытия сессий
 * (когда активны две или более сессии одновременно)
 */
export function isSessionOverlap(date: Date = new Date()): boolean {
  return getCurrentTradingSessions(date).length > 1;
}

/**
 * Получает информацию о перекрытии сессий
 */
export function getSessionOverlapInfo(date: Date = new Date()): string | null {
  const sessions = getCurrentTradingSessions(date);
  
  if (sessions.length <= 1) return null;
  
  const names = sessions.map(s => s.displayName).join(' + ');
  return `Перекрытие сессий: ${names}. Повышенная волатильность и ликвидность.`;
}

/**
 * Форматирует информацию о текущей сессии для отображения
 */
export function formatCurrentSessionInfo(date: Date = new Date()): string {
  const sessions = getCurrentTradingSessions(date);
  
  if (sessions.length === 0) {
    return 'Рынок закрыт (выходные)';
  }

  if (sessions.length === 1) {
    const session = sessions[0];
    return `${session.displayName} сессия (${session.startHour}:00-${session.endHour}:00 UTC). ${session.description}`;
  }

  // Перекрытие сессий
  const names = sessions.map(s => s.displayName).join(' + ');
  return `Перекрытие: ${names}. Повышенная волатильность и ликвидность. Лучшее время для торговли.`;
}
