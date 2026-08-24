import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Paperclip, File as FileIcon, Maximize2, Minimize2, Sparkles, CheckCircle2, ChevronRight, AlertTriangle, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAboutRules, ChatAttachment } from '../services/geminiService';
import { ProcessedActivity, ACTIVITY_RULES } from '../types';
import { sanitizeInput } from '../utils/sanitize';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: ChatAttachment[];
}

interface ChatBotProps {
  analyzedActivities?: ProcessedActivity[];
}

export function ChatBot({ analyzedActivities = [] }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Olá! Sou o assistente de auxílio às Atividades Complementares (Engenharia de Computação). Posso te ajudar a simular o enquadramento de comprovantes, conferir tetos do PPC e preparar seus textos para cadastrar no SUAP!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalUtilizedHours = React.useMemo(() => {
    let sum = 0;
    const hoursByRule = new Map<number, number>();
    
    analyzedActivities.forEach(r => {
      const activityHours = r.utilizedHours || r.hours || 0;
      const current = hoursByRule.get(r.ruleId) || 0;
      hoursByRule.set(r.ruleId, current + activityHours);
    });
    
    hoursByRule.forEach((totalCategoryHours, ruleId) => {
      const rule = ACTIVITY_RULES.find(r => r.id === ruleId);
      if (rule) {
        sum += Math.min(totalCategoryHours, rule.maxHours);
      } else {
        sum += totalCategoryHours;
      }
    });
    
    return sum;
  }, [analyzedActivities]);

  const hasActivities = analyzedActivities.length > 0;

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
    addChatFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addChatFiles = (files: File[]) => {
    if (pendingAttachments.length + files.length > 3) {
      alert('Você pode enviar no máximo 3 arquivos por mensagem.');
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
          mimeType: file.type || 'image/png',
          data: content
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      const filesToProcess: File[] = [];
      imageItems.forEach(item => {
        const file = item.getAsFile();
        if (file) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const customName = file.name && file.name !== 'image.png' ? file.name : `Captura Chat (${timeStr}).png`;
          filesToProcess.push(new File([file], customName, { type: file.type || 'image/png' }));
        }
      });
      if (filesToProcess.length > 0) {
        e.preventDefault();
        addChatFiles(filesToProcess);
      }
    }
  };

  const executeSend = async (messageText: string) => {
    if ((!messageText.trim() && pendingAttachments.length === 0) || isLoading) return;

    const sanitized = sanitizeInput(messageText.trim());

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: sanitized || (pendingAttachments.length > 0 ? `Enviou ${pendingAttachments.length} arquivo(s)` : ''),
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
      const responseText = await chatAboutRules(
        history, 
        userMessage.content, 
        currentAttachments.length > 0 ? currentAttachments : undefined,
        analyzedActivities
      );
      
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

  const handleSend = () => {
    executeSend(input);
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
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[99] w-14 h-14 bg-ifpb-green hover:bg-emerald-500 rounded-full shadow-2xl shadow-black/80 flex items-center justify-center text-white border border-white/20 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-400"
        aria-label="Abrir assistente virtual"
      >
        <MessageSquare size={24} />
        {hasActivities && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#121212] shadow-sm">
            {analyzedActivities.length}
          </span>
        )}
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
              width: isExpanded ? '100vw' : 420,
              height: isExpanded ? '100vh' : 580,
              maxWidth: isExpanded ? '100vw' : 'calc(100vw - 2rem)',
              maxHeight: isExpanded ? '100vh' : '90vh',
              bottom: isExpanded ? 0 : 24,
              right: isExpanded ? 0 : 24,
              borderRadius: isExpanded ? 0 : 20
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed bg-[#121212] shadow-2xl flex flex-col z-[100] overflow-hidden ${isExpanded ? 'border-0' : 'border border-white/10'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#181818] border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ifpb-green/20 border border-ifpb-green/30 flex items-center justify-center">
                  <Bot size={20} className="text-ifpb-green" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Assistente IFPB
                    <span className="text-[9px] bg-ifpb-green/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold">IA</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400">PPC 2018 & Cartilha de Atividades</p>
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

            {/* Context bar if activities exist */}
            {hasActivities && (
              <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-3.5 py-2 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate font-medium text-[11px]">
                    Contexto ativo: <strong>{analyzedActivities.length} {analyzedActivities.length === 1 ? 'atividade' : 'atividades'}</strong> ({totalUtilizedHours}h / 240h)
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold shrink-0 ml-2">
                  {Math.round((totalUtilizedHours / 240) * 100)}%
                </span>
              </div>
            )}

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
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm flex flex-col ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-white rounded-tr-sm' 
                      : 'bg-[#181818] text-zinc-300 border border-white/5 rounded-tl-sm shadow-sm'
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
                  <div className="bg-[#181818] text-zinc-300 border border-white/5 rounded-2xl p-3 rounded-tl-sm flex items-center gap-2 text-sm">
                    <Loader2 size={14} className="animate-spin text-ifpb-green" /> Analisando suas regras e atividades...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions when user has analyzed items */}
            {hasActivities && (
              <div className="px-3 pt-2 pb-1 bg-[#141414] border-t border-white/5 overflow-x-auto no-scrollbar flex gap-1.5">
                <button
                  onClick={() => executeSend("Qual o resumo do meu progresso atual e quantas horas faltam para 240h?")}
                  className="whitespace-nowrap shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={11} className="text-emerald-400" />
                  Saldo de Horas
                </button>
                <button
                  onClick={() => executeSend("Alguma categoria que enviei ultrapassou o teto de horas do PPC? Me explique.")}
                  className="whitespace-nowrap shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle size={11} className="text-amber-400" />
                  Verificar Tetos
                </button>
                <button
                  onClick={() => executeSend("Gere um resumo formatado de todas as minhas atividades para eu cadastrar no SUAP.")}
                  className="whitespace-nowrap shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 size={11} className="text-cyan-400" />
                  Guia para o SUAP
                </button>
                <button
                  onClick={() => executeSend("Com base nas atividades que já tenho, quais novos tipos de atividades devo fazer para completar o que falta?")}
                  className="whitespace-nowrap shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 transition-colors flex items-center gap-1.5"
                >
                  <Layers size={11} className="text-purple-400" />
                  Próximos Passos
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-[#181818] border-t border-white/5">
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
                    onPaste={handlePaste}
                    placeholder={hasActivities ? "Pergunte sobre seus certificados ou regras..." : "Pergunte sobre as regras (ou cole imagem com Ctrl+V)..."}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-ifpb-green transition-colors resize-none text-zinc-200 placeholder:text-zinc-500 max-h-32"
                    rows={Math.min(3, input.split('\n').length || 1)}
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
                A IA pode cometer erros. Verifique o regimento oficial do PPC 2018.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
