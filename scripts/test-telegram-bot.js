/**
 * Тест Telegram Bot команд
 */

const BOT_TOKEN = '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';
const CHAT_ID = '6254307002';

async function sendCommand(command) {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;
  
  const response = await fetch(`${apiUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: command,
      parse_mode: 'HTML',
    }),
  });

  return response.ok;
}

async function testBot() {
  console.log('🤖 Тест Telegram Bot команд\n');

  const commands = [
    '/help',
    '/list',
    '/active',
  ];

  for (const cmd of commands) {
    console.log(`📤 Отправка: ${cmd}`);
    const success = await sendCommand(cmd);
    
    if (success) {
      console.log('✅ Отправлено\n');
    } else {
      console.log('❌ Ошибка\n');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Тест завершён!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📱 Проверь Telegram - должны прийти ответы на команды\n');
  console.log('💡 Попробуй команды:');
  console.log('   /list - список пар');
  console.log('   /subscribe ETHUSDT - подписаться');
  console.log('   /unsubscribe BTCUSDT - отписаться');
  console.log('   /active - активные подписки');
  console.log('   /all - подписаться на все');
  console.log('   /none - отписаться от всех\n');
}

testBot();
