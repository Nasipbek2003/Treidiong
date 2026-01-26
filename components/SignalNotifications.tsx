'use client';

/**
 * SignalNotifications - UI компонент для отображения уведомлений
 */

import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  urgency: 'warning' | 'urgent';
  score: number;
  explanation: string;
  timestamp: number;
  status: string;
}

export default function SignalNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState({
    enableWarning: true,
    enableUrgent: true,
    minScore: 60,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/signals/history');
      const data = await response.json();
      setNotifications(data.history || []);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await fetch('/api/signals/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, status: 'dismissed' } : n)
      );
    } catch (error) {
      console.error('Ошибка отклонения:', error);
    }
  };

  const updatePreferences = async () => {
    try {
      await fetch('/api/signals/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      alert('Настройки сохранены');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    return urgency === 'urgent' ? 'bg-red-500' : 'bg-yellow-500';
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'BUY' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Настройки */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-4">Настройки уведомлений</h2>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.enableWarning}
              onChange={(e) => setPreferences({ ...preferences, enableWarning: e.target.checked })}
              className="rounded"
            />
            <span>Включить Warning сигналы (60-79)</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.enableUrgent}
              onChange={(e) => setPreferences({ ...preferences, enableUrgent: e.target.checked })}
              className="rounded"
            />
            <span>Включить Urgent сигналы (80+)</span>
          </label>

          <div className="flex items-center space-x-2">
            <label>Минимальный score:</label>
            <input
              type="number"
              value={preferences.minScore}
              onChange={(e) => setPreferences({ ...preferences, minScore: parseInt(e.target.value) })}
              min="0"
              max="100"
              className="border rounded px-2 py-1 w-20"
            />
          </div>

          <button
            onClick={updatePreferences}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Сохранить настройки
          </button>
        </div>
      </div>

      {/* История уведомлений */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">История сигналов</h2>
          <button
            onClick={loadHistory}
            className="text-blue-500 hover:text-blue-700"
          >
            Обновить
          </button>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-gray-500">Нет уведомлений</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 ${
                  notification.status === 'dismissed' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-white text-xs ${getUrgencyColor(notification.urgency)}`}>
                      {notification.urgency.toUpperCase()}
                    </span>
                    <span className="font-bold">{notification.symbol}</span>
                    <span className={`font-bold ${getDirectionColor(notification.direction)}`}>
                      {notification.direction}
                    </span>
                    <span className="text-sm text-gray-600">
                      Score: {notification.score.toFixed(1)}
                    </span>
                  </div>
                  
                  {notification.status !== 'dismissed' && (
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-2">
                  {notification.explanation}
                </p>

                <p className="text-xs text-gray-500">
                  {new Date(notification.timestamp).toLocaleString('ru-RU')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
