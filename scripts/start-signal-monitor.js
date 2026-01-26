/**
 * Запуск системы мониторинга торговых сигналов с Telegram
 * 
 * Использование:
 * node scripts/start-signal-monitor.js
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6254307002';

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ Не установлены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID в .env.local');
  process.exit(1);
}

console.log('🚀 Запуск системы мониторинга торговых сигналов...\n');

// Импорт модулей (требует сборки TypeScript)
// Для демонстрации покажем как это будет работать

console.log('📋 Конфигурация:');
console.log(`  Bot: @My_SignalPro_bot`);
console.log(`  Chat ID: ${CHAT_ID}`);
console.log(`  Интервал мониторинга: 10 минут`);
console.log(`  Warning threshold: 60`);
console.log(`  Urgent threshold: 80`);
console.log('');

console.log('✅ Система готова к запуску!');
console.log('');
console.log('📝 Для запуска в production:');
console.log('1. Собери проект: npm run build');
console.log('2. Запусти сервер: npm start');
console.log('3. Инициализируй систему через API:');
console.log('   POST /api/signals/init');
console.log('4. Запусти мониторинг:');
console.log('   POST /api/signals/monitor {"action": "start"}');
console.log('');

// Демонстрация отправки тестового сигнала
async function sendTestSignal() {
  console.log('📤 Отправка тестового сигнала в Telegram...\n');

  const testSignal = `
🚨 <b>URGENT СИГНАЛ</b>

🟢 <b>BUY</b> BTCUSDT
📊 Score: <b>85.5/100</b>

💡 Обнаружен сигнал на покупку BTCUSDT. Liquidity Sweep на 50000.00 (фитиль 65%). CHOCH вверх. Подтверждение объёмом. Совпадение с HTF уровнем.

🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: testSignal,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Тестовый сигнал отправлен в Telegram!');
      console.log('📱 Проверь свой Telegram\n');
    } else {
      console.error('❌ Ошибка:', data.description);
    }
  } catch (error) {
    console.error('❌ Ошибка отправки:', error.message);
  }
}

// Отправить тестовый сигнал
sendTestSignal();
