/**
 * Полный тест системы торговых сигналов
 */

const BOT_TOKEN = '8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w';
const CHAT_ID = '6254307002';

async function testFullSystem() {
  console.log('🧪 Полный тест системы торговых сигналов\n');

  // 1. Проверка Telegram подключения
  console.log('1️⃣ Проверка Telegram...');
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      console.log(`✅ Telegram бот: @${data.result.username}\n`);
    } else {
      console.error('❌ Ошибка Telegram:', data.description);
      return;
    }
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    return;
  }

  // 2. Отправка тестового сигнала BUY
  console.log('2️⃣ Отправка BUY сигнала...');
  await sendSignal('BUY', 'BTCUSDT', 85.5, 'urgent');

  // Пауза
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Отправка тестового сигнала SELL
  console.log('3️⃣ Отправка SELL сигнала...');
  await sendSignal('SELL', 'ETHUSDT', 72.3, 'warning');

  // Пауза
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Отправка сигнала с высоким score
  console.log('4️⃣ Отправка HIGH SCORE сигнала...');
  await sendSignal('BUY', 'SOLUSDT', 92.8, 'urgent');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Все тесты завершены!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📱 Проверь Telegram - должны прийти 3 сигнала\n');
}

async function sendSignal(direction, symbol, score, urgency) {
  const urgencyEmoji = urgency === 'urgent' ? '🚨' : '⚠️';
  const directionEmoji = direction === 'BUY' ? '🟢' : '🔴';
  
  const explanations = {
    'BUY-urgent': 'Обнаружен сильный сигнал на покупку. Liquidity Sweep на ключевом уровне (фитиль 68%). CHOCH вверх. Подтверждение объёмом и HTF уровнем.',
    'SELL-warning': 'Потенциальный сигнал на продажу. Liquidity Sweep на локальном максимуме (фитиль 55%). BOS вниз. Дивергенция RSI.',
    'BUY-high': 'ОЧЕНЬ СИЛЬНЫЙ сигнал на покупку! Идеальная setup: Sweep + CHOCH + Volume + HTF + Divergence. Все факторы подтверждают движение вверх.',
  };

  const key = direction === 'BUY' && score > 90 ? 'BUY-high' : `${direction}-${urgency}`;
  const explanation = explanations[key];

  const message = `
${urgencyEmoji} <b>${urgency.toUpperCase()} СИГНАЛ</b>

${directionEmoji} <b>${direction}</b> ${symbol}
📊 Score: <b>${score.toFixed(1)}/100</b>

💡 ${explanation}

🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log(`✅ ${direction} ${symbol} (${score}) отправлен`);
    } else {
      console.error(`❌ Ошибка: ${data.description}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка отправки: ${error.message}`);
  }
}

testFullSystem();
