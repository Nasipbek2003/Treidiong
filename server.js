/**
 * Production сервер с Telegram ботом
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Запуск production сервера...\n');

// 1. Запускаем Next.js сервер
console.log('📦 Запуск Next.js...');
const nextServer = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
});

nextServer.on('error', (error) => {
  console.error('❌ Ошибка Next.js:', error);
});

// 2. Запускаем Telegram бота
console.log('🤖 Запуск Telegram бота...\n');
const botProcess = spawn('node', ['scripts/run-bot.js'], {
  stdio: 'inherit',
  shell: true,
});

botProcess.on('error', (error) => {
  console.error('❌ Ошибка бота:', error);
});

// Обработка остановки
process.on('SIGINT', () => {
  console.log('\n\n🛑 Остановка сервера...');
  nextServer.kill();
  botProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Остановка сервера...');
  nextServer.kill();
  botProcess.kill();
  process.exit(0);
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ СЕРВЕР ЗАПУЩЕН');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('🌐 Next.js: http://localhost:3000');
console.log('🤖 Telegram Bot: работает');
console.log('');
console.log('⏹️  Нажми Ctrl+C для остановки');
console.log('');
