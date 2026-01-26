/**
 * API: Dismiss Notification
 * 
 * Отклонение уведомления пользователем
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalSystem } from '@/lib/signals/init';

/**
 * POST /api/signals/dismiss - Отклонить уведомление
 */
export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId обязателен' },
        { status: 400 }
      );
    }

    if (!signalSystem.isInitialized()) {
      return NextResponse.json(
        { error: 'NotificationManager не инициализирован' },
        { status: 500 }
      );
    }

    const notificationManager = signalSystem.getNotificationManager();
    notificationManager.dismiss(notificationId);

    return NextResponse.json({ message: 'Уведомление отклонено' });
  } catch (error) {
    console.error('Ошибка отклонения уведомления:', error);
    return NextResponse.json(
      { error: 'Ошибка отклонения уведомления' },
      { status: 500 }
    );
  }
}
