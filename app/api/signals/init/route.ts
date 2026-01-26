/**
 * API: Initialize Signal System
 * 
 * Инициализация системы торговых сигналов
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalSystem } from '@/lib/signals/init';

/**
 * POST /api/signals/init - Инициализировать систему
 */
export async function POST(request: NextRequest) {
  try {
    if (signalSystem.isInitialized()) {
      return NextResponse.json({
        message: 'Система уже инициализирована',
        initialized: true,
      });
    }

    const body = await request.json();
    const { liquidityConfig, notificationPreferences, monitorConfig } = body;

    signalSystem.initialize(
      liquidityConfig,
      notificationPreferences,
      monitorConfig
    );

    return NextResponse.json({
      message: 'Система инициализирована успешно',
      initialized: true,
    });
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    return NextResponse.json(
      { error: 'Ошибка инициализации системы' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signals/init - Проверить статус инициализации
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    initialized: signalSystem.isInitialized(),
  });
}
