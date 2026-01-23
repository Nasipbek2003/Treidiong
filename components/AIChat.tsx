'use client';

import { useState, useRef, useEffect } from 'react';
import { TechnicalIndicators, MarketAnalysis, PriceData } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Props {
  priceData: PriceData[];
  indicators: TechnicalIndicators;
  analysis: MarketAnalysis;
  currentPrice: number;
  asset: string;
}

export default function AIChat({ priceData, indicators, analysis, currentPrice, asset }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Загрузка истории из localStorage при монтировании
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat_history_${asset}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
        initializedRef.current = true;
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }, [asset]);

  // Сохранение истории в localStorage при изменении
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${asset}`, JSON.stringify(messages));
    }
  }, [messages, asset]);

  // Инициализация приветственного сообщения только один раз
  useEffect(() => {
    if (!initializedRef.current && messages.length === 0) {
      setMessages([{
        role: 'ai',
        content: `Привет! Я AI-аналитик. Анализирую ${asset}. Цена: ${formatPrice(currentPrice, asset)}. Нажми ПОКУПКА или ПРОДАЖА для анализа точек входа.`
      }]);
      initializedRef.current = true;
    }
  }, [asset, currentPrice, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visualAnalysis = async (action: 'BUY' | 'SELL') => {
    setMessages(prev => [...prev, { role: 'user', content: `${action === 'BUY' ? 'Покупка' : 'Продажа'}` }]);
    setLoading(true);

    try {
      // Находим canvas с графиком
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('График не найден');
      }

      // Конвертируем canvas в base64
      const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

      const response = await fetch('/api/visual-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          action: action,
          context: {
            asset,
            currentPrice,
            indicators,
            analysis
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (error: any) {
      console.error('Visual analysis error:', error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Ошибка визуального анализа: ${error.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: {
            asset,
            currentPrice,
            priceData: priceData.slice(-10),
            indicators,
            analysis
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Ошибка: ${error.message}. Попробуй позже.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <span style={{ fontSize: '1.3rem' }}>🤖</span>
        <h3>AI Аналитик</h3>
      </div>

      <div style={{ padding: '10px 15px', borderBottom: '1px solid #2a2e39' }}>
        <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#787b86' }}>
          Технический анализ:
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button 
            className="quick-btn"
            style={{ 
              background: '#26a69a', 
              color: '#fff', 
              border: 'none',
              flex: 1,
              fontSize: '0.85rem'
            }}
            onClick={() => visualAnalysis('BUY')}
            disabled={loading}
          >
            Покупка
          </button>
          <button 
            className="quick-btn"
            style={{ 
              background: '#ef5350', 
              color: '#fff', 
              border: 'none',
              flex: 1,
              fontSize: '0.85rem'
            }}
            onClick={() => visualAnalysis('SELL')}
            disabled={loading}
          >
            Продажа
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div dangerouslySetInnerHTML={{ 
              __html: msg.content
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>')
            }} />
          </div>
        ))}
        {loading && (
          <div className="chat-message ai">
            <span style={{ opacity: 0.6 }}>Анализирую данные...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Спроси об анализе, трендах, рисках..."
          rows={2}
          disabled={loading}
        />
        <button 
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : '→'}
        </button>
      </div>
    </div>
  );
}
