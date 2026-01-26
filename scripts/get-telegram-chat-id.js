/**
 * Скрипт для получения Telegram Chat ID
 * 
 * Использование:
 * 1. Запусти: node scripts/get-telegram-chat-id.js
 * 2. Отправь любое сообщение своему боту в Telegram
 * 3. Скрипт покажет твой chat_id
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';

async function getChatId() {
  try {
    console.log('🔍 Получение обновлений от Telegram бота...\n');
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Ошибка:', data.description);
      return;
    }

    if (data.result.length === 0) {
      console.log('⚠️  Нет сообщений.');
      console.log('\n📝 Инструкция:');
      console.log('1. Найди своего бота в Telegram');
      console.log('2. Отправь ему любое сообщение (например, /start)');
      console.log('3. Запусти этот скрипт снова\n');
      return;
    }

    console.log('✅ Найдены сообщения:\n');

    const uniqueChats = new Map();

    data.result.forEach((update) => {
      if (update.message) {
        const chat = update.message.chat;
        const from = update.message.from;
        
        if (!uniqueChats.has(chat.id)) {
          uniqueChats.set(chat.id, {
            chatId: chat.id,
            type: chat.type,
            username: from.username || 'N/A',
            firstName: from.first_name || 'N/A',
            lastName: from.last_name || '',
          });
        }
      }
    });

    uniqueChats.forEach((info) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Chat ID: ${info.chatId}`);
      console.log(`Type: ${info.type}`);
      console.log(`Username: @${info.username}`);
      console.log(`Name: ${info.firstName} ${info.lastName}`.trim());
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    console.log('📋 Скопируй Chat ID и добавь в .env.local:');
    console.log(`TELEGRAM_CHAT_ID=${Array.from(uniqueChats.keys())[0]}\n`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

getChatId();
