/**
 * Отправка команды боту и получение ответа
 */

const BOT_TOKEN = '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';
const CHAT_ID = '6254307002';

async function sendBotCommand(command) {
  console.log(`\n🤖 Обработка команды: ${command}\n`);

  // Импортируем логику бота
  const { TelegramBot } = await import('../lib/signals/telegram-bot.ts');
  
  // Создаем экземпляр бота
  const bot = new TelegramBot(
    { botToken: BOT_TOKEN, chatId: CHAT_ID },
    ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] // Начальные подписки
  );

  // Обрабатываем команду
  const response = await bot.processCommand(command);

  console.log('📝 Ответ:');
  console.log(response);
  console.log('');

  // Отправляем ответ в Telegram
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;
  
  const telegramResponse = await fetch(`${apiUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: response,
      parse_mode: 'HTML',
    }),
  });

  if (telegramResponse.ok) {
    console.log('✅ Ответ отправлен в Telegram\n');
  } else {
    console.log('❌ Ошибка отправки в Telegram\n');
  }

  // Показываем активные подписки
  const activeSymbols = bot.getActiveSymbolsList();
  console.log('📊 Активные подписки:', activeSymbols.join(', '));
  console.log('');

  return { response, activeSymbols };
}

// Получаем команду из аргументов
const command = process.argv[2] || '/help';

sendBotCommand(command).catch(console.error);
