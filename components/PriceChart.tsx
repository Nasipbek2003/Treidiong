'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PriceData } from '@/types';

interface Props {
  data: PriceData[];
  sma20?: number[];
  sma50?: number[];
}

export default function PriceChart({ data, sma20, sma50 }: Props) {
  const chartData = data.map((item, index) => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
    price: item.close,
    sma20: sma20?.[index],
    sma50: sma50?.[index],
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2749" />
        <XAxis dataKey="date" stroke="#8b92b0" />
        <YAxis stroke="#8b92b0" domain={['auto', 'auto']} />
        <Tooltip 
          contentStyle={{ background: '#151b3d', border: '1px solid #1e2749', borderRadius: '8px' }}
          labelStyle={{ color: '#ffd700' }}
        />
        <Legend />
        <Line type="monotone" dataKey="price" stroke="#ffd700" strokeWidth={2} dot={false} name="Цена" />
        {sma20 && <Line type="monotone" dataKey="sma20" stroke="#00ff88" strokeWidth={1.5} dot={false} name="SMA 20" />}
        {sma50 && <Line type="monotone" dataKey="sma50" stroke="#ff4444" strokeWidth={1.5} dot={false} name="SMA 50" />}
      </LineChart>
    </ResponsiveContainer>
  );
}
