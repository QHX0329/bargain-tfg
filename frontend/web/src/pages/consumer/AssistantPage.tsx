import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Spin, Typography, Empty, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { assistantService } from '../../../api/assistantService';
import type { ChatMessage } from '../../../types/consumer';

const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const response = await assistantService.chat(updatedMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.content }]);
    } catch {
      message.error('El asistente no está disponible');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      <Typography.Title level={3}>Asistente IA</Typography.Title>
      <Typography.Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        Consulta sobre precios, recetas, ahorro en la compra y recomendaciones de supermercado.
      </Typography.Text>

      {/* Message history — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {messages.length === 0 && (
          <Empty description="Haz tu primera pregunta sobre la compra" />
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '10px 16px',
                borderRadius:
                  msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' ? '#5f5e5e' : '#f0f0f0',
                color: msg.role === 'user' ? '#fff' : '#333',
                whiteSpace: 'pre-wrap',
              }}
            >
              <Typography.Text style={{ color: 'inherit' }}>{msg.content}</Typography.Text>
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <Spin size="small" style={{ marginLeft: 8 }} />
          </div>
        )}
        {/* Scroll anchor */}
        <div ref={scrollAnchorRef} />
      </div>

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          paddingTop: 16,
          borderTop: '1px solid #ece7df',
        }}
      >
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escribe tu consulta... (Enter para enviar, Shift+Enter para nueva línea)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={sending}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sending}
          disabled={!input.trim()}
        >
          Enviar
        </Button>
      </div>
    </div>
  );
};

export default AssistantPage;
