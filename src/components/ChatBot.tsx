import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Paperclip, File as FileIcon, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAboutRules, ChatAttachment } from '../services/geminiService';
import { sanitizeInput } from '../utils/sanitize';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: ChatAttachment[];
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Olá! Sou o assistente do IFPB para atividades complementares. Como posso te ajudar hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (pendingAttachments.length + files.length > 3) {
      alert('Você pode enviar no máximo 3 arquivos por mensagem.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo ${file.name} deve ser menor que 5MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Content = event.target?.result as string;
        const content = base64Content.split(',')[1];
        setPendingAttachments(prev => [...prev, {
          name: file.name,
          mimeType: file.type,
          data: content
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;

    const sanitizedInput = sanitizeInput(input.trim());

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: sanitizedInput || (pendingAttachments.length > 0 ? `Enviou ${pendingAttachments.length} arquivo(s)` : ''),
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentAttachments = [...pendingAttachments];
    setPendingAttachments([]);
    setIsLoading(true);

    // Convert to Gemini API history format
    const history = messages.map(msg => ({
      role: msg.role,
      parts: [
        { text: msg.content },
        ...(msg.attachments ? msg.attachments.map(att => ({
          inlineData: { 
            mimeType: att.mimeType, 
            data: att.data 
          } 
        })) : [])
      ]
    }));

    try {
      const responseText = await chatAboutRules(history, userMessage.content, currentAttachments.length > 0 ? currentAttachments : undefined);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'Ops! Ocorreu um erro de comunicação. Pode tentar novamente?'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ifpb-green hover:bg-emerald-500 rounded-full shadow-lg shadow-black/50 flex items-center justify-center text-white z-50 border border-white/10 transition-colors"
      >
        <MessageSquare size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              width: isExpanded ? '100vw' : 380,
              height: isExpanded ? '100vh' : 500,
              maxWidth: isExpanded ? '100vw' : 'calc(100vw - 3rem)',
              maxHeight: isExpanded ? '100vh' : '85vh',
              bottom: isExpanded ? 0 : 24,
              right: isExpanded ? 0 : 24,
              borderRadius: isExpanded ? 0 : 16
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed bg-[#121212] shadow-2xl flex flex-col z-50 overflow-hidden ${isExpanded ? 'border-0' : 'border border-white/10'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ifpb-green/20 flex items-center justify-center">
                  <Bot size={18} className="text-ifpb-green" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Assistente IFPB</h3>
                  <p className="text-[10px] text-zinc-400">Tire suas dúvidas das regras</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title={isExpanded ? "Restaurar tamanho" : "Maximizar"}
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-zinc-800' : 'bg-ifpb-green/20'
                  }`}>
                    {msg.role === 'user' ? <User size={14} className="text-zinc-300" /> : <Bot size={14} className="text-ifpb-green" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm flex flex-col ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-white rounded-tr-sm' 
                      : 'bg-[#1a1a1a] text-zinc-300 border border-white/5 rounded-tl-sm'
                  }`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="p-2 bg-black/40 rounded flex items-center gap-2 border border-white/5">
                            <FileIcon size={14} className="text-ifpb-green" />
                            <span className="text-[10px] truncate max-w-[150px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="markdown-body prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-ifpb-green/20 flex items-center justify-center">
                    <Bot size={14} className="text-ifpb-green" />
                  </div>
                  <div className="bg-[#1a1a1a] text-zinc-300 border border-white/5 rounded-2xl p-3 rounded-tl-sm flex items-center gap-2 text-sm">
                    <Loader2 size={14} className="animate-spin text-ifpb-green" /> Digitando...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#1a1a1a] border-t border-white/5">
              <AnimatePresence>
                {pendingAttachments.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-2 flex flex-col gap-2"
                  >
                    {pendingAttachments.map((att, i) => (
                      <div key={i} className="p-2 bg-ifpb-green/10 rounded-lg border border-ifpb-green/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileIcon size={14} className="text-ifpb-green shrink-0" />
                          <span className="text-xs text-ifpb-green truncate">{att.name}</span>
                        </div>
                        <button 
                          onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 hover:bg-ifpb-green/20 rounded-full transition-colors"
                        >
                          <X size={14} className="text-ifpb-green" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative flex items-end gap-2">
                <input 
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf,text/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 mb-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-white/5"
                  title="Anexar arquivo (PDF, Imagem, Texto)"
                >
                  <Paperclip size={18} />
                </button>
                <div className="relative flex-1 flex items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte sobre as regras..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-ifpb-green transition-colors resize-none text-zinc-200 placeholder:text-zinc-500 max-h-32"
                    rows={Math.min(3, input.split('\n').length)}
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
                    className="absolute right-2 bottom-2 p-2 rounded-lg bg-ifpb-green text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                A IA pode cometer erros. Verifique o regimento oficial.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
