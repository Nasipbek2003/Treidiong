/**
 * TrailingStopManager - Управление trailing stop для защиты прибыли
 */

export interface TrailingStopConfig {
  signalId: string;
  initialStop: number;
  currentStop: number;
  entryPrice: number;
  direction: 'BUY' | 'SELL';
  atr: number;
  targetPrice: number;
}

export class TrailingStopManager {
  private stops: Map<string, TrailingStopConfig> = new Map();

  /**
   * Инициализирует trailing stop для сигнала
   */
  initStop(
    signalId: string,
    entryPrice: number,
    initialStop: number,
    targetPrice: number,
    direction: 'BUY' | 'SELL',
    atr: number
  ): void {
    this.stops.set(signalId, {
      signalId,
      initialStop,
      currentStop: initialStop,
      entryPrice,
      direction,
      atr,
      targetPrice,
    });
  }

  /**
   * Обновляет trailing stop на основе текущей цены
   */
  updateStop(signalId: string, currentPrice: number): {
    newStop: number;
    moved: boolean;
    profitPercent: number;
    status: 'active' | 'breakeven' | 'trailing';
  } {
    const config = this.stops.get(signalId);
    if (!config) {
      return { newStop: 0, moved: false, profitPercent: 0, status: 'active' };
    }

    const { entryPrice, direction, atr, targetPrice, currentStop } = config;
    
    // Рассчитываем прибыль
    const profitDistance = direction === 'BUY' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    const targetDistance = direction === 'BUY'
      ? targetPrice - entryPrice
      : entryPrice - targetPrice;
    
    const profitPercent = (profitDistance / targetDistance) * 100;

    let newStop = currentStop;
    let status: 'active' | 'breakeven' | 'trailing' = 'active';

    if (direction === 'BUY') {
      // Прошли 30% к цели - двигаем стоп в безубыток
      if (profitPercent >= 30 && currentStop < entryPrice) {
        newStop = entryPrice;
        status = 'breakeven';
      }
      
      // Прошли 50% к цели - двигаем стоп на 25% прибыли
      else if (profitPercent >= 50 && currentStop < entryPrice + profitDistance * 0.25) {
        newStop = entryPrice + profitDistance * 0.25;
        status = 'trailing';
      }
      
      // Прошли 75% к цели - двигаем стоп на 50% прибыли
      else if (profitPercent >= 75 && currentStop < entryPrice + profitDistance * 0.5) {
        newStop = entryPrice + profitDistance * 0.5;
        status = 'trailing';
      }
      
      // Достигли цели - двигаем стоп на 75% прибыли
      else if (profitPercent >= 100 && currentStop < entryPrice + profitDistance * 0.75) {
        newStop = entryPrice + profitDistance * 0.75;
        status = 'trailing';
      }
      
      // Альтернативный метод: двигаем стоп если цена выросла на 1.5 ATR
      else if (currentPrice > entryPrice + atr * 1.5 && currentStop < currentPrice - atr * 1.5) {
        newStop = currentPrice - atr * 1.5;
        status = 'trailing';
      }
    } else {
      // Для SELL - зеркально
      if (profitPercent >= 30 && currentStop > entryPrice) {
        newStop = entryPrice;
        status = 'breakeven';
      }
      
      else if (profitPercent >= 50 && currentStop > entryPrice - profitDistance * 0.25) {
        newStop = entryPrice - profitDistance * 0.25;
        status = 'trailing';
      }
      
      else if (profitPercent >= 75 && currentStop > entryPrice - profitDistance * 0.5) {
        newStop = entryPrice - profitDistance * 0.5;
        status = 'trailing';
      }
      
      else if (profitPercent >= 100 && currentStop > entryPrice - profitDistance * 0.75) {
        newStop = entryPrice - profitDistance * 0.75;
        status = 'trailing';
      }
      
      else if (currentPrice < entryPrice - atr * 1.5 && currentStop > currentPrice + atr * 1.5) {
        newStop = currentPrice + atr * 1.5;
        status = 'trailing';
      }
    }

    const moved = newStop !== currentStop;
    
    if (moved) {
      config.currentStop = newStop;
      this.stops.set(signalId, config);
    }

    return { newStop, moved, profitPercent, status };
  }

  /**
   * Получает текущий стоп для сигнала
   */
  getStop(signalId: string): number | null {
    const config = this.stops.get(signalId);
    return config ? config.currentStop : null;
  }

  /**
   * Удаляет trailing stop (когда сигнал закрыт)
   */
  removeStop(signalId: string): void {
    this.stops.delete(signalId);
  }

  /**
   * Получает все активные trailing stops
   */
  getAllStops(): TrailingStopConfig[] {
    return Array.from(this.stops.values());
  }

  /**
   * Очищает все trailing stops
   */
  clear(): void {
    this.stops.clear();
  }
}
