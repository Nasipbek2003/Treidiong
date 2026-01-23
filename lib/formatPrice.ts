// Функция для форматирования цены в зависимости от актива
export function formatPrice(price: number, asset: string): string {
  // Валютные пары - 5 знаков после запятой
  const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
  
  if (forexPairs.includes(asset)) {
    return price.toFixed(5);
  }
  
  // Для остальных активов - 2 знака
  return price.toFixed(2);
}

// Функция для определения количества знаков после запятой
export function getPriceDecimals(asset: string): number {
  const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
  return forexPairs.includes(asset) ? 5 : 2;
}
