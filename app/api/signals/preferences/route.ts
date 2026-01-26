/**
 * API: Notification Preferences
 * 
 * Управление настройками уведомлений
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalSystem } from '@/lib/signals/init';

/**
 * POST /api/signals/preferences - Обновить настройки
 */
export async function POST(request: NextRequest) {
  try {
    const preferences = await request.json();

    if (!signalSystem.isInitialized()) {
      return NextResponse.json(
        { error: 'NotificationManager не инициализирован' },
        { status: 500 }
      );
    }

    const notificationManager = signalSystem.getNotificationManager();
    notificationManager.updatePreferences(preferences);

    return NextResponse.json({
      message: 'Настройки обновлены',
      preferences,
    });
  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления настроек' },
      { status: 500 }
    );
  }
}
