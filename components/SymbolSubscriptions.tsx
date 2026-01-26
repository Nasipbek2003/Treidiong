'use client';

/**
 * SymbolSubscriptions - Управление подписками на торговые пары
 */

import { useState, useEffect } from 'react';
import { AVAILABLE_SYMBOLS } from '@/lib/signals/config';

export default function SymbolSubscriptions() {
  const [activeSymbols, setActiveSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActiveSymbols();
  }, []);

  const loadActiveSymbols = async () => {
    try {
      const response = await fetch('/api/signals/bot');
      const data = await response.json();
      setActiveSymbols(data.activeSymbols || []);
    } catch (error) {
      console.error('Ошибка загрузки подписок:', error);
    }
  };

  const toggleSymbol = async (symbol: string) => {
    setLoading(true);

    try {
      const isActive = activeSymbols.includes(symbol);
      const command = isActive ? `/unsubscribe ${symbol}` : `/subscribe ${symbol}`;

      const response = await fetch('/api/signals/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();
      setActiveSymbols(data.activeSymbols || []);
    } catch (error) {
      console.error('Ошибка переключения подписки:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeAll = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/signals/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: '/all' }),
      });

      const data = await response.json();
      setActiveSymbols(data.activeSymbols || []);
    } catch (error) {
      console.error('Ошибка подписки на все:', error);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeAll = async () => {
    setLoading(false);

    try {
      const response = await fetch('/api/signals/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: '/none' }),
      });

      const data = await response.json();
      setActiveSymbols(data.activeSymbols || []);
    } catch (error) {
      console.error('Ошибка отписки от всех:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📊 Подписки на торговые пары</h2>
        <div className="text-sm text-gray-600">
          Активно: {activeSymbols.length} из {AVAILABLE_SYMBOLS.length}
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={subscribeAll}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          ✅ Подписаться на все
        </button>

        <button
          onClick={unsubscribeAll}
          disabled={loading}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          ❌ Отписаться от всех
        </button>

        <button
          onClick={loadActiveSymbols}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          🔄 Обновить
        </button>
      </div>

      {/* Список пар */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE_SYMBOLS.map((config) => {
          const isActive = activeSymbols.includes(config.symbol);

          return (
            <div
              key={config.symbol}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => toggleSymbol(config.symbol)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {isActive ? '✅' : '⭕'}
                  </span>
                  <div>
                    <div className="font-bold">{config.symbol}</div>
                    <div className="text-sm text-gray-600">{config.displayName}</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Интервал: {config.interval}
              </div>

              {isActive && (
                <div className="mt-2 text-xs text-green-600 font-medium">
                  🔔 Уведомления включены
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Инструкция */}
      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <h3 className="font-bold mb-2">💡 Как это работает:</h3>
        <ul className="text-sm space-y-1">
          <li>• Нажми на пару чтобы включить/выключить уведомления</li>
          <li>• Зелёная рамка = уведомления включены</li>
          <li>• Серая рамка = уведомления выключены</li>
          <li>• Система мониторит только активные пары</li>
          <li>• Изменения применяются мгновенно</li>
        </ul>
      </div>

      {/* Telegram команды */}
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h3 className="font-bold mb-2">🤖 Telegram команды:</h3>
        <div className="text-sm space-y-1 font-mono">
          <div>/list - список всех пар</div>
          <div>/active - твои подписки</div>
          <div>/subscribe BTCUSDT - подписаться</div>
          <div>/unsubscribe ETHUSDT - отписаться</div>
          <div>/all - подписаться на все</div>
          <div>/none - отписаться от всех</div>
        </div>
      </div>
    </div>
  );
}
