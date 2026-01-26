/**
 * API: Auto-start Signal System
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoStartSignalSystem } from '@/lib/signals/auto-start';

export async function POST(request: NextRequest) {
  try {
    await autoStartSignalSystem();

    return NextResponse.json({
      message: 'Система запущена успешно',
      status: 'running',
    });
  } catch (error) {
    console.error('Ошибка автозапуска:', error);
    return NextResponse.json(
      { error: 'Ошибка запуска системы' },
      { status: 500 }
    );
  }
}
