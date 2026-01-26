/**
 * Запуск полной системы торговых сигналов
 */

console.log('🚀 Запуск системы торговых сигналов...\n');

// Загружаем переменные окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6254307002';

// Устанавливаем переменные окружения
process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
process.env.TELEGRAM_CHAT_ID = CHAT_ID;

// Импортируем и запускаем
import('../lib/signals/auto-start.js').then(async (module) => {
  try {
    await module.autoStartSignalSystem();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ СИСТЕМА ЗАПУЩЕНА!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📱 Telegram бот готов принимать команды');
    console.log('📊 Мониторинг работает (каждые 10 минут)');
    console.log('');
    console.log('💡 Отправь боту команды:');
    console.log('   /help - справка');
    console.log('   /list - список пар');
    console.log('   /active - твои подписки');
    console.log('   /subscribe SYMBOL - подписаться');
    console.log('');
    console.log('⏹️  Нажми Ctrl+C для остановки');
    console.log('');

    // Обработка остановки
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Остановка системы...');
      module.stopPolling();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Ошибка импорта:', error);
  process.exit(1);
});
