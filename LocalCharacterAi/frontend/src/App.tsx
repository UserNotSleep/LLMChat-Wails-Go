import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

interface Message {
  id: number | string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    transition: { 
      duration: 0.2,
      ease: 'easeInOut' as const
    } 
  }
} as const;

const loadingDotVariants = {
  initial: { y: '0%' },
  animate: (i: number) => ({
    y: ['0%', '-50%', '0%'],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      repeatType: 'loop' as const,
      delay: i * 0.15,
      ease: [0.4, 0, 0.2, 1] as const
    }
  })
};

const LoadingDots = () => (
  <div className="loading-dots">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        custom={i}
        variants={loadingDotVariants}
        initial="initial"
        animate="animate"
        className="loading-dot"
      />
    ))}
  </div>
);

interface MessageHandlers {
  onSendMessage: (message: string) => Promise<string>;
  onMessageUpdate?: (message: Message) => void;
}


const MessageContext = React.createContext<MessageHandlers>({
  onSendMessage: async () => '',
  onMessageUpdate: () => {}
});

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = inputMessage.trim();
    if (!messageText || isSending) return;
  
    const tempMessageId = `temp-${Date.now()}`;
  
    const userMessage: Message = {
      id: tempMessageId,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };
  
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);
  
    try {
      const response = await window.go.main.Chat.SendMessage(messageText);
  
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessageId ? { ...msg, status: 'sent' } : msg
        )
      );
  
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: response,
        sender: 'ai',
        timestamp: new Date(),
        status: 'sent',
      };
  
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessageId ? { ...msg, status: 'error' } : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, isSending]);

  const handleNewChat = async () => {
    try {
      await window.go.main.Chat.openNewChat();
      setMessages([]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    window.go.main.Chat.GetHistory()
      .then((historyStr: string) => {
        try {
          const history = JSON.parse(historyStr) as { role: 'user' | 'assistant'; content: string }[];
  
          const formattedMessages = history.map((msg, i): Message => ({
            id: i,
            text: msg.content,
            timestamp: new Date(),
            status: 'sent'
          }));
  
          setMessages(formattedMessages);
        } catch (e) {
          console.error('Ошибка парсинга истории:', e);
          setMessages([]);
        }
      })
      .catch((err: any) => console.error('Ошибка загрузки истории:', err));
  }, []);


  const contextValue: MessageHandlers = {
    onSendMessage: async (message: string) => {

      return '';
    },
    onMessageUpdate: () => {}
  };

  return (
    <MessageContext.Provider value={contextValue}>
      <div className="app">
        <motion.header 
          className="app-header"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="header-content">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Чат-Бот 
            </motion.h1>
            <motion.button
              className="new-chat-button"
              onClick={handleNewChat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Новый чат
            </motion.button>
          </div>
        </motion.header>
        
        <div className="chat-container">
          <motion.div 
            className="messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div 
                  key="empty-state"
                  className="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <p>Начать новый чат</p>
                </motion.div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`message ${message.sender} ${message.status || ''}`}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <div className="message-content">
                      <div className="message-text">
                        {message.status === 'sending' ? (
                          <div className="message-text-sending">
                            {message.text}
                            <span className="sending-indicator">
                              <span className="dot"></span>
                              <span className="dot"></span>
                              <span className="dot"></span>
                            </span>
                          </div>
                        ) : message.status === 'error' ? (
                          <div className="message-error">
                            {message.text}
                            <span className="error-icon">⚠️</span>
                          </div>
                        ) : (
                          message.text
                        )}
                      </div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.status === 'sending' && ' · Обработка...'}
                        {message.status === 'error' && ' · Ошибка'}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </motion.div>
          
          <motion.form 
            onSubmit={handleSendMessage} 
            className="message-form"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Напиши собщение..."
              className="message-input"
              disabled={isSending}
            />
            <motion.button 
              type="submit" 
              className={`send-button ${isSending ? 'sending' : ''}`}
              disabled={!inputMessage.trim() || isSending}
              whileHover={!isSending && inputMessage.trim() ? { scale: 1.05 } : {}}
              whileTap={!isSending && inputMessage.trim() ? { scale: 0.95 } : {}}
            >
              {isSending ? (
                <div className="button-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                'Отправить'
              )}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </MessageContext.Provider>
  );
}

export default App;
