// Функция для форматирования цены в зависимости от актива
export function formatPrice(price: number, asset: string): string {
  // Нормализуем символ (убираем слэш)
  const normalizedAsset = asset.replace('/', '').toUpperCase();
  
  // Валютные пары - 5 знаков после запятой
  const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
  
  if (forexPairs.includes(normalizedAsset)) {
    return price.toFixed(5);
  }
  
  // Для остальных активов - 2 знака
  return price.toFixed(2);
}

// Функция для определения количества знаков после запятой
export function getPriceDecimals(asset: string): number {
  // Нормализуем символ (убираем слэш)
  const normalizedAsset = asset.replace('/', '').toUpperCase();
  
  const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
  return forexPairs.includes(normalizedAsset) ? 5 : 2;
}
