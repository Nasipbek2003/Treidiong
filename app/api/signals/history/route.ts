/**
 * API: Notification History
 * 
 * Получение истории уведомлений
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalSystem } from '@/lib/signals/init';

/**
 * GET /api/signals/history - История уведомлений
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!signalSystem.isInitialized()) {
      return NextResponse.json(
        { error: 'NotificationManager не инициализирован' },
        { status: 500 }
      );
    }

    const notificationManager = signalSystem.getNotificationManager();
    const history = notificationManager.getHistory(
      startDate ? parseInt(startDate) : undefined,
      endDate ? parseInt(endDate) : undefined
    );

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    return NextResponse.json(
      { error: 'Ошибка получения истории' },
      { status: 500 }
    );
  }
}
