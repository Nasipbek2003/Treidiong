/**
 * Запуск Telegram бота с polling
 */

const BOT_TOKEN = '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';
const CHAT_ID = '6254307002';

const AVAILABLE_SYMBOLS = [
  { symbol: 'BTCUSDT', displayName: 'Bitcoin' },
  { symbol: 'ETHUSDT', displayName: 'Ethereum' },
  { symbol: 'SOLUSDT', displayName: 'Solana' },
  { symbol: 'BNBUSDT', displayName: 'BNB' },
  { symbol: 'XRPUSDT', displayName: 'Ripple' },
  { symbol: 'ADAUSDT', displayName: 'Cardano' },
  { symbol: 'DOGEUSDT', displayName: 'Dogecoin' },
  { symbol: 'MATICUSDT', displayName: 'Polygon' },
];

let activeSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
let lastUpdateId = 0;
let isRunning = true;

function processCommand(command) {
  const cmd = command.toLowerCase().trim();

  if (cmd === '/start' || cmd === '/help') {
    return `
🤖 <b>Команды бота</b>

<b>Управление подписками:</b>
/list - Список всех доступных пар
/active - Твои активные подписки
/subscribe SYMBOL - Подписаться на пару
/unsubscribe SYMBOL - Отписаться от пары
/all - Подписаться на все пары
/none - Отписаться от всех пар

<b>Примеры:</b>
/subscribe BTCUSDT
/unsubscribe ETHUSDT

<b>Доступные пары:</b>
${AVAILABLE_SYMBOLS.map(s => s.symbol).join(', ')}
    `.trim();
  }

  if (cmd === '/list') {
    const lines = ['📊 <b>Доступные пары для мониторинга:</b>\n'];
    AVAILABLE_SYMBOLS.forEach((config, index) => {
      const status = activeSymbols.includes(config.symbol) ? '✅' : '⭕';
      lines.push(`${index + 1}. ${status} <b>${config.symbol}</b> - ${config.displayName}`);
    });
    lines.push('\n💡 Используй /subscribe SYMBOL для подписки');
    return lines.join('\n');
  }

  if (cmd === '/active') {
    if (activeSymbols.length === 0) {
      return '⭕ У тебя нет активных подписок.\n\nИспользуй /list чтобы увидеть доступные пары.';
    }
    const lines = ['✅ <b>Твои активные подписки:</b>\n'];
    activeSymbols.forEach((symbol, index) => {
      const config = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol);
      const displayName = config?.displayName || symbol;
      lines.push(`${index + 1}. <b>${symbol}</b> - ${displayName}`);
    });
    lines.push(`\n📊 Всего: ${activeSymbols.length} пар`);
    return lines.join('\n');
  }

  if (cmd.startsWith('/subscribe ')) {
    const symbol = cmd.replace('/subscribe ', '').toUpperCase();
    const config = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol);
    if (!config) {
      return `❌ Пара ${symbol} не найдена.\n\nИспользуй /list для списка доступных пар.`;
    }
    if (activeSymbols.includes(symbol)) {
      return `⚠️ Ты уже подписан на ${symbol}`;
    }
    activeSymbols.push(symbol);
    return `✅ Подписка на <b>${symbol}</b> (${config.displayName}) активирована!\n\nТеперь ты будешь получать сигналы по этой паре.`;
  }

  if (cmd.startsWith('/unsubscribe ')) {
    const symbol = cmd.replace('/unsubscribe ', '').toUpperCase();
    if (!activeSymbols.includes(symbol)) {
      return `⚠️ Ты не подписан на ${symbol}`;
    }
    activeSymbols = activeSymbols.filter(s => s !== symbol);
    const config = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol);
    const displayName = config?.displayName || symbol;
    return `✅ Подписка на <b>${symbol}</b> (${displayName}) отключена.`;
  }

  if (cmd === '/all') {
    activeSymbols = AVAILABLE_SYMBOLS.map(s => s.symbol);
    return `✅ Подписка на все пары активирована!\n\n📊 Всего: ${activeSymbols.length} пар\n\nИспользуй /active чтобы увидеть список.`;
  }

  if (cmd === '/none') {
    const count = activeSymbols.length;
    activeSymbols = [];
    return `✅ Все подписки отключены (было: ${count} пар).\n\nИспользуй /list чтобы подписаться снова.`;
  }

  return 'Неизвестная команда. Используй /help для списка команд.';
}

async function sendMessage(text) {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const response = await fetch(`${apiUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
  return response.ok;
}

async function getUpdates() {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const url = `${apiUrl}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.ok ? data.result : [];
  } catch (error) {
    return [];
  }
}

async function handleUpdate(update) {
  lastUpdateId = update.update_id;

  if (!update.message || !update.message.text) {
    return;
  }

  const text = update.message.text;
  const username = update.message.from.username || update.message.from.first_name;

  if (!text.startsWith('/')) {
    return;
  }

  console.log(`📨 @${username}: ${text}`);

  const response = processCommand(text);
  await sendMessage(response);

  console.log(`✅ Ответ отправлен`);
  console.log(`📊 Активные: ${activeSymbols.join(', ')}\n`);
}

async function startPolling() {
  console.log('🤖 Telegram Bot запущен');
  console.log('📱 Готов принимать команды\n');

  // Отправляем приветствие
  await sendMessage('🤖 <b>Бот запущен!</b>\n\nОтправь /help чтобы увидеть доступные команды.');

  while (isRunning) {
    try {
      const updates = await getUpdates();
      
      for (const update of updates) {
        await handleUpdate(update);
      }
    } catch (error) {
      console.error('Ошибка:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Обработка остановки
process.on('SIGINT', () => {
  console.log('\n\n🛑 Остановка бота...');
  isRunning = false;
  process.exit(0);
});

// Запуск
console.log('🚀 Запуск Telegram бота...\n');
startPolling();
