/**
 * Простой обработчик команд бота
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

async function runCommand(command) {
  console.log(`\n🤖 Команда: ${command}\n`);

  const response = processCommand(command);
  console.log('📝 Ответ:\n');
  console.log(response.replace(/<[^>]*>/g, '')); // Убираем HTML теги для консоли
  console.log('');

  const sent = await sendMessage(response);
  
  if (sent) {
    console.log('✅ Отправлено в Telegram\n');
  } else {
    console.log('❌ Ошибка отправки\n');
  }

  console.log('📊 Активные подписки:', activeSymbols.join(', '));
  console.log('');
}

// Получаем команду из аргументов
const command = process.argv[2] || '/help';
runCommand(command);
