'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { PriceData } from '@/types';
import { TrendLine } from '@/lib/chartAnalysis';

interface Props {
  data: PriceData[];
  sma20?: number[];
  sma50?: number[];
  trendLines?: TrendLine[];
  showLines?: boolean;
}

export default function CandlestickChart({ data, sma20, sma50, trendLines, showLines = false }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const isFirstLoadRef = useRef(true);
  const prevDataLengthRef = useRef(0);

  // Создаем график только один раз при монтировании
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e222d' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        rightOffset: 12,
        barSpacing: 6,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        shiftVisibleRangeOnNewBar: false,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Создаем серии
    candlestickSeriesRef.current = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    sma20SeriesRef.current = chart.addLineSeries({
      color: '#2962ff',
      lineWidth: 2,
      title: 'SMA 20',
    });

    sma50SeriesRef.current = chart.addLineSeries({
      color: '#ff6d00',
      lineWidth: 2,
      title: 'SMA 50',
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.error('Chart cleanup error:', e);
        }
      }
    };
  }, []); // Пустой массив - создаем только один раз!

  // Отдельный useEffect для обновления данных
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || data.length === 0) return;

    // Проверяем, изменилось ли количество свечей значительно (смена валютной пары)
    if (Math.abs(data.length - prevDataLengthRef.current) > 10) {
      isFirstLoadRef.current = true;
    }
    prevDataLengthRef.current = data.length;

    const candleData = data
      .map(item => {
        let time: string | number;
        
        try {
          const dateStr = item.date;
          
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const parsedDate = new Date(dateStr.replace(' ', 'T'));
            time = Math.floor(parsedDate.getTime() / 1000);
            
            if (isNaN(time) || time < 0) {
              console.error('[Chart] Invalid timestamp for:', dateStr);
              return null;
            }
          } else {
            time = dateStr;
          }
          
          return {
            time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          };
        } catch (err) {
          console.error('[Chart] Error parsing date:', item.date, err);
          return null;
        }
      })
      .filter(item => {
        if (!item) return false;
        
        return (
          !isNaN(item.open) && 
          !isNaN(item.high) && 
          !isNaN(item.low) && 
          !isNaN(item.close) &&
          item.open > 0 &&
          item.high > 0 &&
          item.low > 0 &&
          item.close > 0
        );
      })
      .sort((a, b) => {
        if (typeof a!.time === 'number' && typeof b!.time === 'number') {
          return a!.time - b!.time;
        }
        return 0;
      }) as Array<{time: string | number; open: number; high: number; low: number; close: number}>;

    if (candleData.length === 0) {
      console.error('[Chart] No valid candle data!');
      return;
    }

    // Обновляем данные свечей
    candlestickSeriesRef.current.setData(candleData as any);

    // Обновляем SMA 20
    if (sma20 && sma20.length > 0 && sma20SeriesRef.current) {
      const sma20Data = data
        .map((item, index) => {
          let time: string | number;
          
          try {
            const dateStr = item.date;
            if (dateStr.includes('T') || dateStr.includes(' ')) {
              const parsedDate = new Date(dateStr.replace(' ', 'T'));
              time = Math.floor(parsedDate.getTime() / 1000);
              if (isNaN(time) || time < 0) return null;
            } else {
              time = dateStr;
            }
            
            return {
              time,
              value: sma20[index] || 0,
            };
          } catch (err) {
            return null;
          }
        })
        .filter(d => d && d.value > 0 && !isNaN(d.value))
        .sort((a, b) => {
          if (typeof a!.time === 'number' && typeof b!.time === 'number') {
            return a!.time - b!.time;
          }
          return 0;
        }) as Array<{time: string | number; value: number}>;

      if (sma20Data.length > 0) {
        sma20SeriesRef.current.setData(sma20Data as any);
      }
    }

    // Обновляем SMA 50
    if (sma50 && sma50.length > 0 && sma50SeriesRef.current) {
      const sma50Data = data
        .map((item, index) => {
          let time: string | number;
          
          try {
            const dateStr = item.date;
            if (dateStr.includes('T') || dateStr.includes(' ')) {
              const parsedDate = new Date(dateStr.replace(' ', 'T'));
              time = Math.floor(parsedDate.getTime() / 1000);
              if (isNaN(time) || time < 0) return null;
            } else {
              time = dateStr;
            }
            
            return {
              time,
              value: sma50[index] || 0,
            };
          } catch (err) {
            return null;
          }
        })
        .filter(d => d && d.value > 0 && !isNaN(d.value))
        .sort((a, b) => {
          if (typeof a!.time === 'number' && typeof b!.time === 'number') {
            return a!.time - b!.time;
          }
          return 0;
        }) as Array<{time: string | number; value: number}>;

      if (sma50Data.length > 0) {
        sma50SeriesRef.current.setData(sma50Data as any);
      }
    }

    // Автомасштабирование только при первой загрузке или смене валютной пары
    if (isFirstLoadRef.current) {
      chartRef.current.timeScale().fitContent();
      isFirstLoadRef.current = false;
    }
  }, [data, sma20, sma50]);

  // Отрисовка линий тренда и уровней
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !showLines || !trendLines || trendLines.length === 0 || data.length === 0) {
      return;
    }

    const lineSeriesArray: ISeriesApi<'Line'>[] = [];
    const priceLines: any[] = [];

    try {
      trendLines.forEach(line => {
        if (line.type === 'support' || line.type === 'resistance') {
          // Горизонтальная линия - используем createPriceLine
          const priceLine = candlestickSeriesRef.current!.createPriceLine({
            price: line.price,
            color: line.color,
            lineWidth: 2,
            lineStyle: 2, // Пунктирная линия
            axisLabelVisible: true,
            title: line.label,
          });
          priceLines.push(priceLine);
        } else if (line.type === 'trendline' && line.points && line.points.length >= 2) {
          // Наклонная линия тренда - создаем отдельную серию
          const lineSeries = chartRef.current!.addLineSeries({
            color: line.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          // Создаем данные для линии тренда
          const lineData: Array<{time: string | number; value: number}> = [];
          
          // Берем первую и последнюю точку
          const startPoint = line.points[0];
          const endPoint = line.points[line.points.length - 1];
          
          // Создаем точки между началом и концом
          for (let i = Math.floor(startPoint.x); i <= Math.min(Math.floor(endPoint.x), data.length - 1); i++) {
            if (data[i]) {
              // Интерполируем Y значение
              const t = (i - startPoint.x) / (endPoint.x - startPoint.x);
              const y = startPoint.y + t * (endPoint.y - startPoint.y);
              
              let time: string | number;
              const dateStr = data[i].date;
              
              if (dateStr.includes('T') || dateStr.includes(' ')) {
                const parsedDate = new Date(dateStr.replace(' ', 'T'));
                time = Math.floor(parsedDate.getTime() / 1000);
              } else {
                time = dateStr;
              }
              
              lineData.push({ time, value: y });
            }
          }

          if (lineData.length > 0) {
            lineSeries.setData(lineData as any);
            lineSeriesArray.push(lineSeries);
          }
        }
      });
    } catch (error) {
      console.error('Error drawing trend lines:', error);
    }

    return () => {
      // Cleanup: удаляем созданные серии линий
      lineSeriesArray.forEach(series => {
        try {
          chartRef.current?.removeSeries(series);
        } catch (e) {
          console.error('Error removing line series:', e);
        }
      });
      
      // Cleanup: удаляем горизонтальные линии
      priceLines.forEach(priceLine => {
        try {
          candlestickSeriesRef.current?.removePriceLine(priceLine);
        } catch (e) {
          console.error('Error removing price line:', e);
        }
      });
    };
  }, [showLines, trendLines, data]);

  return <div ref={chartContainerRef} style={{ position: 'relative' }} />;
}
