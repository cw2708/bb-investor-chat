'use client';

import { ChartData } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { ComparisonChart } from './ComparisonChart';

interface Message {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  type?: 'text' | 'chart';
  chartData?: ChartData;
  chartTitle?: string;
  chartType?: 'bar' | 'line' | 'pie';
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      message: 'Hello! I\'m your AI assistant for company metrics and data. I can help you with information about Blackbird Portfolio Companies',
      isUser: false,
      timestamp: new Date().toISOString(),
      type: 'text'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      message,
      isUser: true,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Convert messages to OpenAI format for conversation history
      const conversationHistory = updatedMessages
        .filter(msg => msg.type === 'text') // Only include text messages, not chart messages
        .map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.message
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message, // Keep for backward compatibility
          messages: conversationHistory
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        message: data.message,
        isUser: false,
        timestamp: data.timestamp,
        type: data.type || 'text',
        chartData: data.chartData,
        chartTitle: data.chartTitle,
        chartType: data.chartType
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      let errorMessage = 'Sorry, I encountered an error processing your request.';

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = '⚠️ OpenAI API key not configured. Please add your OPENAI_API_KEY to the .env.local file to enable ChatGPT responses.';
        } else if (error.message.includes('OpenAI')) {
          errorMessage = '⚠️ There was an issue connecting to OpenAI. Please check your API key and try again.';
        }
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        message: errorMessage,
        isUser: false,
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Blackbird Investor Intelligence</h1>
        <p className="text-gray-300 text-sm">AI-powered company metrics and data analysis with interactive charts</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-900">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-4">
            <ChatMessage
              message={msg.message}
              isUser={msg.isUser}
              timestamp={msg.timestamp}
            />
            {/* Display chart if available */}
            {msg.type === 'chart' && msg.chartData && msg.chartTitle && (
              <div className="mt-4">
                <ComparisonChart
                  data={msg.chartData}
                  title={msg.chartTitle}
                  chartType={msg.chartType || 'bar'}
                />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-800 rounded-lg px-4 py-2 border border-gray-700">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-300">ChatGPT is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
