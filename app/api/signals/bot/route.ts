/**
 * API: Telegram Bot Commands
 */

import { NextRequest, NextResponse } from 'next/server';
import { TelegramBot } from '@/lib/signals/telegram-bot';
import { signalSystem } from '@/lib/signals/init';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

let botInstance: TelegramBot | null = null;

/**
 * POST /api/signals/bot - Обработка команды
 */
export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();

    if (!command) {
      return NextResponse.json(
        { error: 'command обязателен' },
        { status: 400 }
      );
    }

    // Инициализация бота если нужно
    if (!botInstance) {
      const manager = signalSystem.getNotificationManager();
      const activeSymbols = manager['preferences'].activeSymbols || [];
      
      botInstance = new TelegramBot(
        { botToken: BOT_TOKEN, chatId: CHAT_ID },
        activeSymbols
      );
    }

    // Обработка команды
    const response = await botInstance.processCommand(command);

    // Обновляем preferences в NotificationManager
    const newSymbols = botInstance.getActiveSymbolsList();
    const manager = signalSystem.getNotificationManager();
    manager.updatePreferences({ activeSymbols: newSymbols });

    // Отправляем ответ в Telegram
    await botInstance.sendMessage(response);

    return NextResponse.json({
      message: 'Команда обработана',
      response,
      activeSymbols: newSymbols,
    });
  } catch (error) {
    console.error('Ошибка обработки команды:', error);
    return NextResponse.json(
      { error: 'Ошибка обработки команды' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signals/bot - Получить активные подписки
 */
export async function GET(request: NextRequest) {
  try {
    if (!botInstance) {
      const manager = signalSystem.getNotificationManager();
      const activeSymbols = manager['preferences'].activeSymbols || [];
      
      return NextResponse.json({ activeSymbols });
    }

    return NextResponse.json({
      activeSymbols: botInstance.getActiveSymbolsList(),
    });
  } catch (error) {
    console.error('Ошибка получения подписок:', error);
    return NextResponse.json(
      { error: 'Ошибка получения подписок' },
      { status: 500 }
    );
  }
}
