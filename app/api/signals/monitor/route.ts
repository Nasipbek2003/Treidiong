/**
 * API: Signal Monitor Control
 * 
 * Управление background worker'ом
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalSystem } from '@/lib/signals/init';

/**
 * GET /api/signals/monitor - Статус мониторинга
 */
export async function GET(request: NextRequest) {
  try {
    if (!signalSystem.isInitialized()) {
      return NextResponse.json({
        isRunning: false,
        message: 'Monitor не инициализирован',
      });
    }

    const monitor = signalSystem.getMonitor();

    return NextResponse.json({
      isRunning: monitor.isActive(),
      config: monitor.getConfig(),
    });
  } catch (error) {
    console.error('Ошибка получения статуса:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статуса' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/signals/monitor - Запуск/остановка мониторинга
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!signalSystem.isInitialized()) {
      return NextResponse.json(
        { error: 'Monitor не инициализирован' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      signalSystem.startMonitoring();
      return NextResponse.json({ message: 'Мониторинг запущен' });
    }

    if (action === 'stop') {
      signalSystem.stopMonitoring();
      return NextResponse.json({ message: 'Мониторинг остановлен' });
    }

    return NextResponse.json(
      { error: 'Неизвестное действие' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Ошибка управления монитором:', error);
    return NextResponse.json(
      { error: 'Ошибка управления монитором' },
      { status: 500 }
    );
  }
}
