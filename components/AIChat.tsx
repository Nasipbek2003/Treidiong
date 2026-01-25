'use client';

import { useState, useRef, useEffect } from 'react';
import { TechnicalIndicators, MarketAnalysis, PriceData } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

interface Message {
  role: 'user' | 'ai';
  content: string;
  image?: string; // base64 изображения
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [version, setVersion] = useState<'nasip1.0' | 'nasip1.1'>('nasip1.0');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentChatKeyRef = useRef<string>('');

  // Загрузка истории при изменении актива или версии
  useEffect(() => {
    // Проверка на существование localStorage (для SSR)
    if (typeof window === 'undefined') return;
    
    const chatKey = `chat_history_${asset}_${version}`;
    
    // Если это тот же чат, не перезагружаем
    if (currentChatKeyRef.current === chatKey) {
      return;
    }
    
    console.log(`Loading chat for: ${chatKey}`);
    currentChatKeyRef.current = chatKey;
    
    try {
      const savedMessages = localStorage.getItem(chatKey);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        console.log(`Loaded ${parsed.length} messages for ${chatKey}`);
        setMessages(parsed);
      } else {
        // Если нет сохраненной истории, показываем приветствие
        console.log(`No saved history for ${chatKey}, showing welcome message`);
        setMessages([{
          role: 'ai',
          content: `Привет! Я AI-аналитик (${version}). Анализирую ${asset}. Цена: ${formatPrice(currentPrice, asset)}. Нажми ПОКУПКА или ПРОДАЖА для анализа точек входа.`
        }]);
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
      // При ошибке показываем приветствие
      setMessages([{
        role: 'ai',
        content: `Привет! Я AI-аналитик (${version}). Анализирую ${asset}. Цена: ${formatPrice(currentPrice, asset)}. Нажми ПОКУПКА или ПРОДАЖА для анализа точек входа.`
      }]);
    }
  }, [asset, version, currentPrice]); // Вернули currentPrice для обновления цены в приветствии

  // Сохранение истории в localStorage при изменении сообщений
  useEffect(() => {
    // Проверка на существование localStorage (для SSR)
    if (typeof window === 'undefined') return;
    
    if (messages.length > 0 && currentChatKeyRef.current) {
      const chatKey = currentChatKeyRef.current;
      console.log(`Saving ${messages.length} messages to ${chatKey}`);
      try {
        localStorage.setItem(chatKey, JSON.stringify(messages));
      } catch (e) {
        console.error('Error saving chat history:', e);
      }
    }
  }, [messages]);

  // Функция очистки чата
  const clearChat = () => {
    if (typeof window === 'undefined') return;
    
    const chatKey = currentChatKeyRef.current;
    console.log(`Clearing chat: ${chatKey}`);
    try {
      localStorage.removeItem(chatKey);
      setMessages([{
        role: 'ai',
        content: `Привет! Я AI-аналитик (${version}). Анализирую ${asset}. Цена: ${formatPrice(currentPrice, asset)}. Нажми ПОКУПКА или ПРОДАЖА для анализа точек входа.`
      }]);
    } catch (e) {
      console.error('Error clearing chat:', e);
    }
  };

  // Отладка: показываем все сохраненные чаты при монтировании
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const allChats: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chat_history_')) {
          allChats.push(key);
        }
      }
      if (allChats.length > 0) {
        console.log('Saved chats:', allChats);
      }
    } catch (e) {
      console.error('Error reading saved chats:', e);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visualAnalysis = async (action: 'BUY' | 'SELL') => {
    setMessages(prev => [...prev, { role: 'user', content: `${action === 'BUY' ? 'Покупка' : 'Продажа'} (${version})` }]);
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
          version: version,
          context: {
            asset,
            currentPrice,
            indicators,
            analysis,
            priceData
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Изображение слишком большое. Максимум 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage = input.trim() || 'Изображение';
    const imageToSend = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      image: imageToSend || undefined
    }]);
    setLoading(true);

    try {
      // Если есть изображение, используем визуальный анализ
      if (imageToSend) {
        const base64Data = imageToSend.split(',')[1];
        
        const response = await fetch('/api/visual-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            action: 'ANALYZE',
            message: userMessage !== 'Изображение' ? userMessage : undefined,
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
      } else {
        // Обычное текстовое сообщение
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            version: version,
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
      }
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;

        // Проверка размера (макс 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Изображение слишком большое. Максимум 5MB');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setSelectedImage(base64);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Изображение слишком большое. Максимум 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#FF6D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h3 style={{ margin: 0 }}>AI Аналитик</h3>
            <span style={{ fontSize: '0.75rem', color: '#787b86' }}>
              {asset} • {version}
            </span>
          </div>
        </div>
        <button
          onClick={clearChat}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#787b86',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef5350'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#787b86'}
          title="Очистить чат"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '12px 15px', borderBottom: '1px solid #2a2e39' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => {
              if (typeof window === 'undefined') return;
              // Сохраняем текущий чат перед переключением
              if (messages.length > 0 && currentChatKeyRef.current) {
                try {
                  localStorage.setItem(currentChatKeyRef.current, JSON.stringify(messages));
                } catch (e) {
                  console.error('Error saving before version switch:', e);
                }
              }
              setVersion('nasip1.0');
            }}
            style={{
              flex: 1,
              padding: '6px 12px',
              background: version === 'nasip1.0' ? '#FF6D00' : '#2a2e39',
              color: version === 'nasip1.0' ? '#fff' : '#8b92a7',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: version === 'nasip1.0' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            nasip1.0
          </button>
          <button
            onClick={() => {
              if (typeof window === 'undefined') return;
              // Сохраняем текущий чат перед переключением
              if (messages.length > 0 && currentChatKeyRef.current) {
                try {
                  localStorage.setItem(currentChatKeyRef.current, JSON.stringify(messages));
                } catch (e) {
                  console.error('Error saving before version switch:', e);
                }
              }
              setVersion('nasip1.1');
            }}
            style={{
              flex: 1,
              padding: '6px 12px',
              background: version === 'nasip1.1' ? '#FF6D00' : '#2a2e39',
              color: version === 'nasip1.1' ? '#fff' : '#8b92a7',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: version === 'nasip1.1' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            nasip1.1
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="analysis-btn buy-btn"
            onClick={() => visualAnalysis('BUY')}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 19V5M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Покупка
          </button>
          <button 
            className="analysis-btn sell-btn"
            onClick={() => visualAnalysis('SELL')}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Продажа
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            {msg.image && (
              <div style={{ marginBottom: '8px' }}>
                <img 
                  src={msg.image} 
                  alt="Uploaded" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    objectFit: 'contain'
                  }} 
                />
              </div>
            )}
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

      <div 
        className="chat-input-container"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        
        {selectedImage && (
          <div style={{ 
            padding: '8px', 
            borderBottom: '1px solid #2a2e39',
            position: 'relative'
          }}>
            <img 
              src={selectedImage} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100px', 
                borderRadius: '4px',
                objectFit: 'contain'
              }} 
            />
            <button
              onClick={removeImage}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#ef5350',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="attach-btn"
            title="Прикрепить изображение"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59723 21.9983 8.005 21.9983C6.41277 21.9983 4.88583 21.3658 3.76 20.24C2.63417 19.1142 2.00166 17.5872 2.00166 15.995C2.00166 14.4028 2.63417 12.8758 3.76 11.75L12.33 3.18C13.0806 2.42944 14.0991 2.00667 15.16 2.00667C16.2209 2.00667 17.2394 2.42944 17.99 3.18C18.7406 3.93056 19.1633 4.94908 19.1633 6.01C19.1633 7.07092 18.7406 8.08944 17.99 8.84L9.41 17.41C9.03472 17.7853 8.52544 17.9967 7.995 17.9967C7.46456 17.9967 6.95528 17.7853 6.58 17.41C6.20472 17.0347 5.99334 16.5254 5.99334 15.995C5.99334 15.4646 6.20472 14.9553 6.58 14.58L15.07 6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder="Задайте вопрос или прикрепите изображение..."
            rows={2}
            disabled={loading}
            style={{ flex: 1 }}
          />
          
          <button 
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={loading || (!input.trim() && !selectedImage)}
          >
            {loading ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spinner">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
