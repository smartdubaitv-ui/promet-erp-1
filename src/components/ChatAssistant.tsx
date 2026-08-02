import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  action?: any;
}

interface ChatAssistantProps {
  onRefreshAll?: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ onRefreshAll }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '👋 مرحباً! أنا مساعدك الذكي في نظام الهضبة ERP. كيف يمكنني مساعدتك اليوم؟\n\n💡 يمكنك أن تطلب مني ما يلي:\n- كم عدد الموظفين؟\n- ما هو إجمالي الرواتب؟\n- هل توجد فواتير متأخرة؟\n- أضف موظف اسمه أحمد راتب 8000',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.response || 'عذراً، لم أستطع فهم سؤالك. حاول مرة أخرى.',
        timestamp: new Date(),
        action: data.command
      };
      setMessages(prev => [...prev, assistantMessage]);

      // If an employee was added, refresh parent view
      if (data.command && data.command.success && data.command.action === 'add_employee') {
        if (onRefreshAll) {
          onRefreshAll();
        }
      }

    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: '❌ عذراً، حدث خطأ في الاتصال. يرجى مراجعة الخادم والمحاولة مرة أخرى.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-gray-100 text-gray-800 rounded-tl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-line font-medium">{message.text}</p>
          
          {/* عرض نتائج الأوامر المسترجعة من الـ Backend */}
          {message.action && message.action.success && (
            <div className={`mt-3 p-2.5 rounded-lg text-xs border ${
              isUser 
                ? 'bg-white/10 border-white/20 text-white' 
                : 'bg-white border-gray-200 text-gray-700'
            }`}>
              {message.action.action === 'add_employee' && message.action.data && (
                <div className="space-y-1">
                  <p className="font-bold border-b pb-1 mb-1 border-current opacity-90">👤 تم إضافة موظف جديد:</p>
                  <div className="flex justify-between">
                    <span>الاسم:</span>
                    <span className="font-semibold">{message.action.data.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الراتب الأساسي:</span>
                    <span className="font-semibold">{message.action.data.basicSalary?.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المنصب:</span>
                    <span>{message.action.data.position}</span>
                  </div>
                </div>
              )}

              {message.action.action === 'list_employees' && Array.isArray(message.action.data) && (
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  <p className="font-bold border-b pb-1 mb-1 border-current opacity-90">👥 قائمة الموظفين المسجلين:</p>
                  {message.action.data.length === 0 ? (
                    <p className="text-gray-400 italic">لا يوجد موظفون حالياً.</p>
                  ) : (
                    message.action.data.map((emp: any, i: number) => (
                      <div key={emp.id || i} className="flex justify-between gap-4 border-b border-dashed border-neutral-300/30 last:border-0 pb-1 last:pb-0">
                        <span>{emp.name}</span>
                        <span className="font-mono">{(emp.basicSalary || emp.basic_salary || 0).toLocaleString()} ج.م</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {message.action.action === 'list_payroll' && Array.isArray(message.action.data) && (
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  <p className="font-bold border-b pb-1 mb-1 border-current opacity-90">💰 سجلات الرواتب الحالية:</p>
                  {message.action.data.length === 0 ? (
                    <p className="text-gray-400 italic">لا توجد سجلات رواتب متاحة.</p>
                  ) : (
                    message.action.data.map((p: any, i: number) => (
                      <div key={p.id || i} className="flex justify-between gap-4 border-b border-dashed border-neutral-300/30 last:border-0 pb-1 last:pb-0">
                        <span>{p.employeeName || p.employee_name || 'موظف'}</span>
                        <span className="font-mono">{(p.netSalary || p.net_salary || 0).toLocaleString()} ج.م</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {message.action.action === 'low_stock' && Array.isArray(message.action.data) && (
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  <p className="font-bold border-b pb-1 mb-1 border-current">⚠️ السلع منخفضة المخزون:</p>
                  {message.action.data.length === 0 ? (
                    <p className="text-green-600 italic font-semibold">مستوى المخزون ممتاز في جميع السلع!</p>
                  ) : (
                    message.action.data.map((prod: any, i: number) => (
                      <div key={prod.id || i} className="flex justify-between gap-4 border-b border-dashed border-neutral-300/30 last:border-0 pb-1 last:pb-0">
                        <span>{prod.name}</span>
                        <span className="font-semibold text-rose-500">
                          الكمية: {prod.stockQuantity} / {prod.reorderPoint}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {message.action.action === 'overdue_invoices' && Array.isArray(message.action.data) && (
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  <p className="font-bold border-b pb-1 mb-1 border-current">📄 الفواتير المتأخرة:</p>
                  {message.action.data.length === 0 ? (
                    <p className="text-green-600 italic font-semibold">لا توجد فواتير متأخرة السداد!</p>
                  ) : (
                    message.action.data.map((inv: any, i: number) => (
                      <div key={inv.id || i} className="flex justify-between gap-4 border-b border-dashed border-neutral-300/30 last:border-0 pb-1 last:pb-0">
                        <span>{inv.clientName || inv.client_name || `فاتورة #${inv.invoiceNumber || inv.id}`}</span>
                        <span className="font-mono font-semibold text-rose-600">{(inv.totalAmount || 0).toLocaleString()} ج.م</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          
          <span className="text-[10px] opacity-60 mt-1.5 block text-left font-mono">
            {message.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card title="🎙️ المساعد الذكي" className="h-full flex flex-col shadow-lg border border-neutral-200">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 rounded-lg h-[450px]">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
        
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5 py-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-neutral-200 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="اكتب استفسارك هنا... (مثال: أضف موظف اسمه طارق راتب 7500)"
          className="flex-1"
        />
        <Button 
          onClick={handleSend} 
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        >
          إرسال
        </Button>
      </div>
    </Card>
  );
};
