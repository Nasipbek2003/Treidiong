'use client';

/**
 * TelegramSettings - Настройка Telegram уведомлений
 */

import { useState } from 'react';

export default function TelegramSettings() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const configureTelegram = async () => {
    if (!botToken || !chatId) {
      setStatus('error');
      setMessage('Заполни все поля');
      return;
    }

    setStatus('loading');
    setMessage('Настройка...');

    try {
      const response = await fetch('/api/signals/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure',
          botToken,
          chatId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Telegram настроен успешно!');
      } else {
        setStatus('error');
        setMessage(data.error || 'Ошибка настройки');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Ошибка подключения');
    }
  };

  const testConnection = async () => {
    setStatus('loading');
    setMessage('Проверка подключения...');

    try {
      const response = await fetch('/api/signals/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('Подключение успешно!');
      } else {
        setStatus('error');
        setMessage('Ошибка подключения');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Ошибка проверки');
    }
  };

  const sendTestMessage = async () => {
    setStatus('loading');
    setMessage('Отправка тестового сообщения...');

    try {
      const response = await fetch('/api/signals/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-message' }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('Тестовое сообщение отправлено! Проверь Telegram');
      } else {
        setStatus('error');
        setMessage('Ошибка отправки');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Ошибка отправки');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'loading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">⚙️ Настройки Telegram</h2>

      <div className="space-y-4">
        {/* Bot Token */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Bot Token
          </label>
          <input
            type="text"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w"
            className="w-full border rounded px-3 py-2 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Получи у @BotFather в Telegram
          </p>
        </div>

        {/* Chat ID */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Chat ID
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="6254307002"
            className="w-full border rounded px-3 py-2 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Отправь /start боту, затем запусти: node scripts/get-telegram-chat-id.js
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={configureTelegram}
            disabled={status === 'loading'}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Настроить
          </button>

          <button
            onClick={testConnection}
            disabled={status === 'loading'}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Проверить подключение
          </button>

          <button
            onClick={sendTestMessage}
            disabled={status === 'loading'}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Тестовое сообщение
          </button>
        </div>

        {/* Статус */}
        {message && (
          <div className={`p-3 rounded border ${getStatusColor()}`}>
            {status === 'loading' && '⏳ '}
            {status === 'success' && '✅ '}
            {status === 'error' && '❌ '}
            {message}
          </div>
        )}

        {/* Инструкция */}
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-2">📝 Быстрая настройка:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Найди @BotFather в Telegram и создай бота</li>
            <li>Скопируй Bot Token и вставь выше</li>
            <li>Отправь /start своему боту</li>
            <li>Запусти: <code className="bg-gray-200 px-1 rounded">node scripts/get-telegram-chat-id.js</code></li>
            <li>Скопируй Chat ID и вставь выше</li>
            <li>Нажми "Настроить"</li>
            <li>Нажми "Тестовое сообщение" для проверки</li>
          </ol>
        </div>

        {/* Пример сообщения */}
        <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-bold mb-2">📱 Пример уведомления:</h3>
          <div className="text-sm whitespace-pre-line font-mono bg-white p-3 rounded">
            {`🚨 URGENT СИГНАЛ

🟢 BUY BTCUSDT
📊 Score: 85.5/100

💡 Обнаружен сигнал на покупку BTCUSDT. Liquidity Sweep на 50000.00 (фитиль 65%). CHOCH вверх.

🕐 26.01.2026, 01:45 (МСК)`}
          </div>
        </div>
      </div>
    </div>
  );
}
