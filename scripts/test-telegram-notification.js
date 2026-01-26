/**
 * Тестовый скрипт для проверки Telegram уведомлений
 * 
 * Использование:
 * node scripts/test-telegram-notification.js
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function testTelegram() {
  console.log('🧪 Тестирование Telegram уведомлений\n');

  if (!CHAT_ID) {
    console.error('❌ TELEGRAM_CHAT_ID не установлен в .env.local');
    console.log('\n📝 Сначала получи Chat ID:');
    console.log('1. Отправь сообщение боту в Telegram');
    console.log('2. Запусти: node scripts/get-telegram-chat-id.js');
    console.log('3. Добавь TELEGRAM_CHAT_ID в .env.local\n');
    return;
  }

  try {
    // 1. Проверка подключения к боту
    console.log('1️⃣ Проверка подключения к боту...');
    const meResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const meData = await meResponse.json();

    if (!meData.ok) {
      console.error('❌ Ошибка:', meData.description);
      return;
    }

    console.log(`✅ Бот подключен: @${meData.result.username}\n`);

    // 2. Отправка тестового сообщения
    console.log('2️⃣ Отправка тестового сообщения...');
    
    const testMessage = `
🧪 <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ</b>

Это тестовое сообщение для проверки работы системы торговых сигналов.

✅ Telegram интеграция работает корректно!

🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)
    `.trim();

    const sendResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: testMessage,
        parse_mode: 'HTML',
      }),
    });

    const sendData = await sendResponse.json();

    if (!sendData.ok) {
      console.error('❌ Ошибка отправки:', sendData.description);
      return;
    }

    console.log('✅ Тестовое сообщение отправлено!\n');

    // 3. Отправка примера торгового сигнала
    console.log('3️⃣ Отправка примера торгового сигнала...');

    const signalMessage = `
🚨 <b>URGENT СИГНАЛ</b>

🟢 <b>BUY</b> BTCUSDT
📊 Score: <b>85.5/100</b>

💡 Обнаружен сигнал на покупку BTCUSDT. Liquidity Sweep на 50000.00 (фитиль 65%). CHOCH вверх. Подтверждение объёмом. Совпадение с HTF уровнем.

🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)
    `.trim();

    const signalResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: signalMessage,
        parse_mode: 'HTML',
      }),
    });

    const signalData = await signalResponse.json();

    if (!signalData.ok) {
      console.error('❌ Ошибка отправки:', signalData.description);
      return;
    }

    console.log('✅ Пример сигнала отправлен!\n');

    // 4. Итоги
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Все тесты пройдены успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📱 Проверь Telegram - должны прийти 2 сообщения\n');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testTelegram();
