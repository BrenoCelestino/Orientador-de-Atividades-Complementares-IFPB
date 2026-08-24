/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  Loader2, 
  Plus, 
  X, 
  CheckCircle2, 
  ChevronRight, 
  School,
  History,
  TrendingUp,
  LayoutGrid,
  List,
  ArrowRight,
  AlertCircle,
  Filter,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  MessageSquare,
  Cpu,
  Search,
  Bot,
  Zap,
  Image as ImageIcon,
  Layers,
  Copy,
  Check,
  Clock,
  Sparkles,
  HelpCircle,
  Calendar,
  AlertTriangle,
  GraduationCap,
  ScrollText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { classifyActivities } from './services/geminiService';
import { ACTIVITY_RULES, ProcessedActivity } from './types';
import { ChatBot } from './components/ChatBot';
import { OnboardingTour } from './components/OnboardingTour';

import { sanitizeInput } from './utils/sanitize';

type SortField = 'category' | 'hours' | 'confidence';
type SortOrder = 'asc' | 'desc';

export default function App() {
  const [inputs, setInputs] = useState<{ id: string; type: 'file' | 'text' | 'url'; content: string; name?: string; mimeType?: string; explicitHours?: string | number; showContext?: boolean; contextDescription?: string }[]>([]);
  const [results, setResults] = useState<ProcessedActivity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [entryYear, setEntryYear] = useState<string>(''); // Optional
  const [entrySemester, setEntrySemester] = useState<string>('1');

  const [processingTime, setProcessingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const techSectionRef = useRef<HTMLDivElement>(null);
  
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'transcript' | 'standalone'>('all');
  const [sortField, setSortField] = useState<SortField>('category');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Check if it's the user's first visit to show the onboarding tour
  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem('ifpb_activities_tour_seen');
    if (!hasSeenTour) {
      setIsTourOpen(true);
    }
  }, []);

  const closeTour = () => {
    localStorage.setItem('ifpb_activities_tour_seen', 'true');
    setIsTourOpen(false);
  };

  const openTour = () => {
    setIsTourOpen(true);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => {
      setCopiedTextId(null);
    }, 2000);
  };

  const resultsRef = useRef<HTMLDivElement>(null);

  const addInput = (type: 'text' | 'url') => {
    if (inputs.length >= 10) {
      alert("Você pode adicionar no máximo 10 itens para análise por vez.");
      return;
    }
    setInputs(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, content: '', showContext: false, contextDescription: '' }]);
  };

  // Reusable function to ingest File objects (from picker, drag&drop, or Ctrl+V clipboard paste)
  const addFilesToInputs = (files: File[], isPaste = false) => {
    if (!files.length) return;

    if (inputs.length + files.length > 10) {
      alert("Você pode adicionar no máximo 10 itens para análise por vez.");
      return;
    }

    let addedCount = 0;
    files.forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de 15MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Content = event.target?.result as string;
        // Strip data:mime/type;base64,
        const content = base64Content.split(',')[1];
        setInputs(prev => [{ 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'file', 
          content, 
          name: file.name,
          mimeType: file.type || 'image/png',
          showContext: false,
          contextDescription: ''
        }, ...prev]);
      };
      reader.readAsDataURL(file);
      addedCount++;
    });

    if (isPaste && addedCount > 0) {
      setPasteToast(`${addedCount === 1 ? 'Imagem colada' : `${addedCount} imagens coladas`} com sucesso via Ctrl+V!`);
      setTimeout(() => {
        setPasteToast(null);
      }, 3500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFilesToInputs(files);
    }
    // Limpar o input de arquivo para permitir a seleção do mesmo arquivo novamente se necessário
    e.target.value = '';
  };

  // Listen to global Ctrl+V / Command+V paste for images/screenshots
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = Array.from(clipboardData.items || []);
      const imageItems = items.filter(item => item.type.startsWith('image/'));

      // If user pasted image items (like PrintScreen screenshot or copied image from web/disk)
      if (imageItems.length > 0) {
        const filesToProcess: File[] = [];
        imageItems.forEach((item) => {
          const file = item.getAsFile();
          if (file) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const customName = file.name && file.name !== 'image.png' 
              ? file.name 
              : `Imagem Colada (${timeStr}).png`;
            const renamedFile = new File([file], customName, { type: file.type || 'image/png' });
            filesToProcess.push(renamedFile);
          }
        });

        if (filesToProcess.length > 0) {
          e.preventDefault();
          addFilesToInputs(filesToProcess, true);
          return;
        }
      }

      // Check if raw files in clipboard contain PDFs or Images
      if (clipboardData.files && clipboardData.files.length > 0) {
        const files = Array.from(clipboardData.files);
        const validFiles = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
        if (validFiles.length > 0) {
          // If active element is a text input and pasted purely text, let default behavior happen
          const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
          if (targetTag === 'input' || targetTag === 'textarea') {
            return;
          }
          e.preventDefault();
          addFilesToInputs(validFiles, true);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [inputs.length]);

  const updateInput = (id: string, content: string) => {
    setInputs(prev => prev.map(i => i.id === id ? { ...i, content } : i));
  };

  const updateInputHours = (id: string, explicitHours: string) => {
    setInputs(prev => prev.map(i => i.id === id ? { ...i, explicitHours } : i));
  };

  const toggleInputContext = (id: string) => {
    setInputs(prev => prev.map(i => i.id === id ? { ...i, showContext: !i.showContext } : i));
  };

  const updateInputContext = (id: string, contextDescription: string) => {
    setInputs(prev => prev.map(i => i.id === id ? { ...i, contextDescription } : i));
  };

  const removeInput = (id: string) => {
    setInputs(prev => prev.filter(i => i.id !== id));
  };

  const deleteActivity = (id: string) => {
    setResults(prev => prev.filter(a => a.id !== id));
  };

  const clearAllActivities = () => {
    if (window.confirm("Deseja remover todas as atividades analisadas da sessão atual?")) {
      setResults([]);
    }
  };

  const processActivities = async () => {
    if (inputs.length === 0) return;
    setIsProcessing(true);
    setProcessingTime(0);
    timerRef.current = window.setInterval(() => {
      setProcessingTime(prev => prev + 1);
    }, 1000);

    setTimeout(() => {
      techSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);

    try {
      const sanitizedInputs = inputs.map(input => ({
        ...input,
        content: input.type !== 'file' ? sanitizeInput(input.content) : input.content,
        contextDescription: input.contextDescription ? sanitizeInput(input.contextDescription) : input.contextDescription
      }));

      const entryPeriod = entryYear ? { year: parseInt(entryYear), semester: parseInt(entrySemester) } : undefined;
      const data = await classifyActivities(sanitizedInputs, entryPeriod);
      
      setResults(prev => {
        // Garantir que todos os IDs sejam estritamente únicos
        const existingIds = new Set(prev.map(p => p.id));
        const normalizedData = data.map((item, i) => {
          if (!item.id || existingIds.has(item.id)) {
            const freshId = `act_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`;
            existingIds.add(freshId);
            return { ...item, id: freshId };
          }
          existingIds.add(item.id);
          return item;
        });
        return [...normalizedData, ...prev];
      });
      setInputs([]);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar atividades. Tente novamente.");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const categoriesInResults = Array.from(new Set(results.map(r => r.ruleId)));
  const transcriptCount = results.filter(r => r.isFromTranscript || r.sourceType === 'transcript').length;
  const standaloneCount = results.length - transcriptCount;

  const filteredResults = results.filter(r => {
    if (filterCategory !== 'all' && r.ruleId.toString() !== filterCategory.toString()) return false;
    const isTrans = Boolean(r.isFromTranscript || r.sourceType === 'transcript');
    if (filterOrigin === 'transcript' && !isTrans) return false;
    if (filterOrigin === 'standalone' && isTrans) return false;
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    let compareA: any;
    let compareB: any;

    if (sortField === 'category') {
      compareA = a.categoryName.toLowerCase();
      compareB = b.categoryName.toLowerCase();
    } else if (sortField === 'hours') {
      compareA = a.utilizedHours || a.hours;
      compareB = b.utilizedHours || b.hours;
    } else if (sortField === 'confidence') {
      compareA = a.confidence;
      compareB = b.confidence;
    }

    if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalHours = React.useMemo(() => {
    let sum = 0;
    const hoursByRule = new Map<number, number>();
    
    results.forEach(r => {
      // Calculate how many hours are valid for this activity
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
  }, [results]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-gray-200">
      {/* Header */}
      <header className="h-20 border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-ifpb-green to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-ifpb-green/20 border border-white/10">
              <School className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                IFPB <span className="text-ifpb-red px-2 py-0.5 bg-ifpb-red/10 rounded-md text-[13px] border border-ifpb-red/20">Orientador</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase mt-0.5">Engenharia de Computação</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openTour}
              className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-300 hover:text-white uppercase transition-colors px-3.5 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20"
              title="Abrir tutorial e guia de uso"
            >
              <HelpCircle size={14} className="text-ifpb-green" />
              <span className="hidden sm:inline">Como Funciona</span>
            </button>
            <a href="https://estudante.ifpb.edu.br/cursos/28/" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 hover:text-white uppercase transition-colors px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10">
              Página do Curso
            </a>
            <a href="https://suap.ifpb.edu.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold tracking-wider text-ifpb-green hover:text-emerald-400 uppercase transition-colors px-3.5 sm:px-4 py-2 rounded-lg bg-ifpb-green/10 hover:bg-ifpb-green/20 border border-ifpb-green/20 hover:border-ifpb-green/40">
              <span className="hidden sm:inline">Acessar</span> SUAP
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Form */}
          <div className="lg:col-span-12 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Nova Orientação</h2>
                <p className="text-zinc-400 text-sm">Adicione certificados (PDF/imagem), links ou descrições para classificar.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-[11px] text-zinc-400 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold">Ctrl + V</span>
                  <span>Cole imagens direto</span>
                </div>
                <button 
                  onClick={() => addInput('url')}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:shadow-lg transition-all text-xs font-bold border border-white/5"
                >
                  <LinkIcon size={14} className="text-zinc-400 group-hover:text-white transition-colors" /> URL
                </button>
                <button 
                  onClick={() => addInput('text')}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:shadow-lg transition-all text-xs font-bold border border-white/5"
                >
                  <FileText size={14} className="text-zinc-400 group-hover:text-white transition-colors" /> Texto
                </button>
                <label className="group flex items-center gap-2 px-5 py-2 rounded-full bg-ifpb-green text-black cursor-pointer hover:bg-emerald-400 hover:shadow-[0_4px_20px_rgba(50,160,65,0.4)] transition-all text-xs font-black border border-ifpb-green/50">
                  <Upload size={14} /> Carregar Arquivos
                  <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                </label>
              </div>
            </div>

            {/* Paste Toast Notification */}
            <AnimatePresence>
              {pasteToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="p-3 bg-ifpb-green/10 border border-ifpb-green/40 rounded-xl flex items-center justify-between gap-3 text-ifpb-green shadow-lg backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-ifpb-green text-black flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <span className="text-xs font-bold text-white">{pasteToast}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 bg-black/40 px-2 py-1 rounded">Área de Transferência</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  addFilesToInputs(Array.from(e.dataTransfer.files));
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <AnimatePresence>
                {inputs.map((input) => (
                  <motion.div
                    key={input.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative p-6 bg-surface rounded-2xl border border-white/5 space-y-4"
                  >
                    <button 
                      onClick={() => removeInput(input.id)}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-zinc-500"
                    >
                      <X size={14} />
                    </button>
                    
                    <div className="flex items-center gap-2 text-ifpb-green">
                      {input.type === 'file' ? <Upload size={16} /> : input.type === 'url' ? <LinkIcon size={16} /> : <FileText size={16} />}
                      <span className="text-xs font-bold uppercase tracking-wider">{input.type}</span>
                    </div>

                    {input.type === 'file' ? (
                      <div className="flex items-center gap-3 py-2">
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={18} className="text-ifpb-green" />
                        </div>
                        <span className="text-sm font-medium truncate flex-1">{input.name}</span>
                      </div>
                    ) : input.type === 'url' ? (
                      <input 
                        type="url"
                        placeholder="Cole o link do evento..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-ifpb-green transition-colors"
                        value={input.content}
                        onChange={(e) => updateInput(input.id, e.target.value)}
                      />
                    ) : (
                      <textarea 
                        placeholder="Descreva a atividade..."
                        rows={3}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-ifpb-green transition-colors resize-none"
                        value={input.content}
                        onChange={(e) => updateInput(input.id, e.target.value)}
                      />
                    )}
                    
                    <div className="pt-2 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs text-zinc-400 font-medium">Carga horária exata (opcional)</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            placeholder="Ex: 20"
                            className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 w-20 text-sm focus:outline-none focus:border-ifpb-green transition-colors text-right outline-none ring-0 focus:ring-0"
                            value={input.explicitHours || ''}
                            onChange={(e) => updateInputHours(input.id, e.target.value)}
                          />
                          <span className="absolute right-3 text-xs text-zinc-500 pointer-events-none pr-1">h</span>
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => toggleInputContext(input.id)}
                          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                          <MessageSquare size={14} className={input.showContext || input.contextDescription ? "text-ifpb-green" : ""} />
                          {input.showContext ? "Ocultar observações" : "Adicionar observação (opcional)"}
                        </button>
                        
                        <AnimatePresence>
                          {input.showContext && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="overflow-hidden"
                            >
                              <textarea
                                placeholder="Coloque aqui um detalhe específico para essa certificação... (opcional)"
                                rows={2}
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-ifpb-green transition-colors resize-none placeholder:text-zinc-600"
                                value={input.contextDescription || ''}
                                onChange={(e) => updateInputContext(input.id, e.target.value)}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {inputs.length === 0 && (
                <div 
                  onClick={() => {
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    fileInput?.click();
                  }}
                  className="col-span-full bg-surface rounded-2xl border-2 border-dashed border-white/10 hover:border-ifpb-green/50 transition-all p-10 flex flex-col items-center justify-center space-y-4 cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-ifpb-green/10 group-hover:scale-105 transition-all">
                    <Upload className="w-8 h-8 text-ifpb-green" />
                  </div>
                  <div className="text-center space-y-1.5 max-w-md">
                    <p className="text-white font-bold text-base">Clique ou arraste arquivos aqui</p>
                    <p className="text-xs text-zinc-400">Suporta PDFs, imagens de certificados ou capturas de tela.</p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/50 border border-white/10 text-[11px] font-mono text-zinc-300">
                        <span className="text-ifpb-green font-bold">Ctrl + V</span> habilitado (cole screenshots direto)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-6 mt-8">
              <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Ano de Ingresso</label>
                  <select 
                    value={entryYear}
                    onChange={(e) => setEntryYear(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-ifpb-green transition-colors text-zinc-300 outline-none w-28 appearance-none cursor-pointer"
                  >
                    <option value="">Opcional</option>
                    {Array.from({ length: 18 }, (_, i) => 2018 + i).map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Semestre</label>
                  <select 
                    value={entrySemester}
                    onChange={(e) => setEntrySemester(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-ifpb-green transition-colors text-zinc-300 outline-none w-16 appearance-none cursor-pointer"
                  >
                    <option value="1">.1</option>
                    <option value="2">.2</option>
                  </select>
                </div>

                <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block"></div>

                <button
                  disabled={inputs.length === 0 || isProcessing}
                  onClick={processActivities}
                  className={`
                    group relative flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-base shadow-xl transition-all
                    ${isProcessing ? 'bg-zinc-800' : 'bg-ifpb-green hover:shadow-ifpb-green/20 hover:scale-[1.02]'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" /> Analisando...
                    </>
                  ) : (
                    <>
                      Analisar Atividades <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
              
              {!entryYear && (
                <p className="text-[10px] text-zinc-500 italic max-w-xs text-center">
                  Dica: Informe seu ingresso para que a IA valide se as atividades foram feitas durante o curso.
                </p>
              )}

              <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-900/80 px-4 py-1.5 rounded-full border border-white/5 shadow-sm">
                <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                <span>O sistema pode cometer pequenos erros de IA. Revise os dados antes de confiar 100%.</span>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div 
                ref={resultsRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="lg:col-span-12 space-y-6 pt-12 border-t border-white/5 scroll-mt-32"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Resultado da Análise</h2>
                    <p className="text-zinc-400">Classificação sugerida baseada no PPC Engenharia de Computação e Cartilha 2026.</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl glass text-center min-w-[140px] border border-white/5 bg-white/5">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Média de Progresso</div>
                      <div className="text-3xl font-bold text-ifpb-green">{totalHours}<span className="text-sm font-normal text-zinc-500"> / 240h</span></div>
                      <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-ifpb-green h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(100, (totalHours / 240) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center p-1 bg-zinc-800/50 rounded-lg">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <LayoutGrid size={18} />
                      </button>
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <List size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Important AI Disclaimer Callout Banner */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3.5 shadow-lg backdrop-blur-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">Aviso de Revisão Obrigatória</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">Orientação por IA</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed">
                      O sistema e a Inteligência Artificial podem cometer pequenos erros na leitura de comprovantes, identificação de datas ou enquadramento de regras. <strong>Sempre revise todas as informações, categorias e horas calculadas</strong> antes de confiar 100% ou cadastrar o requerimento no SUAP.
                    </p>
                  </div>
                </div>

                {/* Category Summary */}
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(results.map(r => r.ruleId))).map(ruleId => {
                    const rule = ACTIVITY_RULES.find(r => r.id === ruleId);
                    const hours = results.filter(r => r.ruleId === ruleId).reduce((s, curr) => s + (curr.utilizedHours || curr.hours || 0), 0);
                    const isLimitReached = hours >= (rule?.maxHours || 999);
                    
                    return (
                      <div 
                        key={ruleId}
                        className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2
                          ${isLimitReached ? 'bg-ifpb-red/10 border-ifpb-red text-ifpb-red' : 'bg-ifpb-green/10 border-ifpb-green text-ifpb-green'}
                        `}
                      >
                        {rule?.name}: {hours}h / {rule?.maxHours}h
                        {isLimitReached && <AlertCircle size={10} />}
                      </div>
                    );
                  })}
                </div>

                {/* Controls Section */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Filter size={16} className="text-zinc-500" />
                      <select 
                        className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-ifpb-green transition-colors text-zinc-300 w-full md:w-auto outline-none"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="all">Todas as Categorias</option>
                        {categoriesInResults.map(ruleId => {
                          const rule = ACTIVITY_RULES.find(r => r.id === ruleId);
                          return <option key={ruleId} value={ruleId}>{rule?.name || ruleId}</option>;
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <ScrollText size={16} className="text-zinc-500" />
                      <select 
                        className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-amber-400 transition-colors text-zinc-300 w-full md:w-auto outline-none"
                        value={filterOrigin}
                        onChange={(e) => setFilterOrigin(e.target.value as any)}
                      >
                        <option value="all">Todas as Origens ({results.length})</option>
                        <option value="transcript">📜 Do Histórico Oficial ({transcriptCount})</option>
                        <option value="standalone">📁 Comprovantes Avulsos ({standaloneCount})</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
                      <span className="text-sm text-zinc-500">Ordenar por:</span>
                      <select 
                        className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-ifpb-green transition-colors text-zinc-300 outline-none"
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value as SortField)}
                      >
                        <option value="category">Categoria</option>
                        <option value="hours">Horas</option>
                        <option value="confidence">Confiança</option>
                      </select>
                      
                      <button 
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 rounded-lg bg-black/30 border border-white/10 hover:border-ifpb-green text-zinc-400 hover:text-ifpb-green transition-all"
                        title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                      >
                        {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      </button>

                      <button
                        onClick={clearAllActivities}
                        className="p-1.5 px-2.5 rounded-lg bg-black/30 border border-white/10 hover:border-ifpb-red/40 hover:bg-ifpb-red/10 text-zinc-400 hover:text-ifpb-red transition-all flex items-center gap-1 text-xs"
                        title="Remover todas as atividades da análise"
                      >
                        <X size={14} />
                        <span className="hidden sm:inline">Limpar</span>
                      </button>
                    </div>
                </div>

                <div className={viewMode === 'grid' ? 'grid gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-4'}>
                  {sortedResults.map((activity, idx) => {
                    const rule = ACTIVITY_RULES.find(r => r.id === activity.ruleId);
                    const rawConf = typeof activity.confidence === 'number' ? activity.confidence : 0.85;
                    const normalizedConfidence = rawConf > 1 ? (rawConf > 100 ? rawConf / 10000 : rawConf / 100) : rawConf;
                    const confidencePercent = Math.max(0, Math.min(100, Math.round(normalizedConfidence * 100)));
                    
                    const isFromTranscript = Boolean(activity.isFromTranscript || activity.sourceType === 'transcript');
                    const isInvalid = confidencePercent === 0 || activity.utilizedHours === 0;
                    const isLowConfidence = confidencePercent > 0 && confidencePercent <= 60;
                    const suapText = activity.suapDescription || activity.title;
                    const isCopied = copiedTextId === activity.id;

                    // Clean explanation by stripping duplicate skills text if present
                    const cleanExplanation = activity.explanation
                      ? activity.explanation
                          .replace(/\n*\*\*Competências:\*\*.*$/i, '')
                          .replace(/\n*Competências:.*$/i, '')
                          .trim()
                      : "";

                    let bgClass = "bg-surface";
                    let borderClass = "border-white/5";
                    let headerBgClass = "bg-[#161616] border-white/5";
                    let textClass = "text-ifpb-green";
                    let confidenceClass = "bg-ifpb-green/10 text-ifpb-green border-ifpb-green/20";
                    let explanationBorderClass = "border-ifpb-green";
                    
                    if (isInvalid) {
                      bgClass = "bg-ifpb-red/10";
                      borderClass = "border-ifpb-red/40";
                      headerBgClass = "bg-ifpb-red/20 border-ifpb-red/30";
                      textClass = "text-ifpb-red";
                      confidenceClass = "bg-ifpb-red/20 text-ifpb-red border-ifpb-red/50";
                      explanationBorderClass = "border-ifpb-red";
                    } else if (isFromTranscript) {
                      bgClass = "bg-amber-950/20";
                      borderClass = "border-amber-500/40 hover:border-amber-400/80 shadow-lg shadow-amber-500/5";
                      headerBgClass = "bg-amber-500/15 border-amber-500/30";
                      textClass = "text-amber-400";
                      confidenceClass = "bg-amber-500/20 text-amber-300 border-amber-500/40";
                      explanationBorderClass = "border-amber-500";
                    } else if (isLowConfidence) {
                      borderClass = "border-amber-500/30 hover:border-amber-500/50";
                      headerBgClass = "bg-amber-500/10 border-amber-500/20";
                      confidenceClass = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                      explanationBorderClass = "border-amber-500";
                    }

                    if (viewMode === 'list') {
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`p-5 border flex flex-col md:flex-row md:items-stretch justify-between gap-5 group rounded-2xl ${bgClass} ${borderClass} hover:border-white/20 transition-all`}
                        >
                          <div className="flex flex-col gap-3 flex-1">
                            {/* Header Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-300 uppercase tracking-tight">
                                {activity.groupName}
                              </span>
                              {isFromTranscript && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-tight flex items-center gap-1">
                                  <GraduationCap size={12} className="text-amber-400" />
                                  Do Histórico Escolar Oficial
                                </span>
                              )}
                              <span className={`text-xs font-black uppercase tracking-wide ${isInvalid ? 'text-ifpb-red' : isFromTranscript ? 'text-amber-400' : 'text-white'}`}>
                                {isInvalid ? 'DOCUMENTO INVÁLIDO' : activity.categoryName}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${confidenceClass}`}>
                                Confiança: {confidencePercent}%
                              </span>
                            </div>

                            {/* Dates of Start and End of the event/certificate */}
                            <div className="flex items-center gap-2 flex-wrap text-xs bg-zinc-900/60 p-2.5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-1.5 text-zinc-300">
                                <Calendar size={14} className={isFromTranscript ? "text-amber-400 shrink-0" : "text-ifpb-green shrink-0"} />
                                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Período da Atividade:</span>
                              </div>
                              {activity.startDate && activity.endDate && activity.startDate !== activity.endDate ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-zinc-400">Início: <strong className="text-white font-mono">{activity.startDate}</strong></span>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-zinc-400">Fim / Conclusão: <strong className="text-white font-mono">{activity.endDate}</strong></span>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-300">
                                  {activity.startDate || activity.endDate ? (
                                    <span>Data identificada: <strong className="text-white font-mono">{activity.startDate || activity.endDate}</strong></span>
                                  ) : (
                                    <span className="text-zinc-500 italic">Data não identificada no comprovante</span>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* SUAP Sugestão de Descrição */}
                            <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isFromTranscript ? 'text-amber-400' : 'text-ifpb-green'} flex items-center gap-1.5`}>
                                  <FileText size={12} />
                                  {isFromTranscript ? 'Registrado no SUAP (Histórico Oficial):' : 'Sugestão para o SUAP (Campo "Atividade"): '}
                                </span>
                                <p className="text-sm font-medium text-white select-all break-words">
                                  {suapText}
                                </p>
                              </div>
                              <button
                                onClick={() => handleCopy(suapText, activity.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-all border ${
                                  isCopied 
                                    ? isFromTranscript
                                      ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                                      : 'bg-ifpb-green text-black border-ifpb-green shadow-sm' 
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10'
                                }`}
                                title="Copiar descrição para colar no SUAP"
                              >
                                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>

                            {/* Justificativa */}
                            {cleanExplanation && (
                              <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-white/5">
                                <span className="font-semibold text-zinc-300">Justificativa: </span>
                                {cleanExplanation}
                              </p>
                            )}

                            {/* Competências */}
                            {activity.skills && activity.skills.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Habilidades:</span>
                                {activity.skills.map((skill, sIdx) => (
                                  <span key={`${activity.id}-lskill-${sIdx}`} className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-white/5 font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Hour breakdown */}
                          <div className="flex items-start gap-3 shrink-0">
                            <div className="flex flex-col md:items-end justify-between shrink-0 bg-black/40 rounded-xl p-4 border border-white/5 md:min-w-[220px]">
                              <div className="flex flex-col gap-1.5 w-full text-xs text-zinc-400 pb-3 border-b border-white/5">
                                <div className="flex justify-between gap-4">
                                  <span>Carga do Certificado:</span>
                                  <span className={`font-mono font-semibold ${activity.certificateHours > (activity.utilizedHours || activity.hours) ? 'line-through text-zinc-400' : 'text-zinc-200'}`}>
                                    {activity.certificateHours}h
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Teto no Curso (PPC):</span>
                                  <span className="font-mono text-zinc-200 font-semibold">{rule?.maxHours || 0}h</span>
                                </div>
                                {rule?.hoursPerUnit && (
                                  <div className="flex justify-between gap-4 text-[11px] text-zinc-500">
                                    <span>Cálculo por item:</span>
                                    <span className="font-mono text-zinc-400">{rule.hoursPerUnit}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-end w-full pt-3">
                                <div>
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">Aproveitamento</span>
                                  <span className="text-[11px] text-zinc-400">no Histórico</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`text-3xl leading-none font-black ${textClass}`}>
                                    {activity.utilizedHours || activity.hours}h
                                  </span>
                                  {activity.certificateHours > (activity.utilizedHours || activity.hours) && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[11px] text-zinc-400 line-through font-mono font-bold">
                                        De {activity.certificateHours}h
                                      </span>
                                      <span className="text-[9px] text-amber-400 font-semibold px-1 rounded bg-amber-500/10 border border-amber-500/20">
                                        Teto PPC
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => deleteActivity(activity.id)}
                              className="p-2 rounded-xl text-zinc-500 hover:text-ifpb-red hover:bg-ifpb-red/10 border border-transparent hover:border-ifpb-red/30 transition-all shrink-0"
                              title="Excluir esta atividade da análise"
                              aria-label="Excluir atividade"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`${bgClass} rounded-2xl border flex flex-col overflow-hidden group ${borderClass} hover:border-white/20 transition-all`}
                      >
                        {/* Header Zone */}
                        <div className={`p-4 border-b flex justify-between items-start gap-3 ${headerBgClass}`}>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{activity.groupName}</span>
                            {isFromTranscript && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-tight flex items-center gap-1 w-fit">
                                <GraduationCap size={12} className="text-amber-400 shrink-0" />
                                Histórico Oficial
                              </span>
                            )}
                            <span className={`text-sm font-black uppercase tracking-wide line-clamp-2 ${isInvalid ? 'text-ifpb-red' : isFromTranscript ? 'text-amber-400' : 'text-white'}`}>
                              {isInvalid ? 'DOCUMENTO INVÁLIDO' : activity.categoryName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${confidenceClass}`}>
                                Confiança: {confidencePercent}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 shrink-0">
                            <div className="flex flex-col items-end shrink-0 bg-black/40 px-3.5 py-2 rounded-xl border border-white/5 text-right">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Aproveitado</span>
                              <span className={`text-2xl font-black ${textClass}`}>
                                {activity.utilizedHours || activity.hours}h
                              </span>
                              {activity.certificateHours > (activity.utilizedHours || activity.hours) && (
                                <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                  <span className="text-[11px] text-zinc-400 line-through font-mono font-bold">
                                    De {activity.certificateHours}h
                                  </span>
                                  <span className="text-[9px] text-amber-400 font-semibold px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                                    Teto PPC
                                  </span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => deleteActivity(activity.id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-ifpb-red hover:bg-ifpb-red/10 border border-transparent hover:border-ifpb-red/30 transition-all shrink-0"
                              title="Excluir esta atividade da análise"
                              aria-label="Excluir atividade"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Body Zone */}
                        <div className="p-5 flex-1 flex flex-col gap-4">
                          {/* Datas de Início e Fim do Evento/Certificado */}
                          <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <Calendar size={13} className={isFromTranscript ? "text-amber-400" : "text-ifpb-green"} />
                                Datas do Evento / Certificado:
                              </span>
                            </div>
                            
                            {activity.startDate && activity.endDate && activity.startDate !== activity.endDate ? (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/5">
                                  <span className="text-[10px] text-zinc-500 block uppercase font-medium">Data de Início</span>
                                  <span className="text-xs font-bold text-zinc-200 font-mono">{activity.startDate}</span>
                                </div>
                                <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/5">
                                  <span className="text-[10px] text-zinc-500 block uppercase font-medium">Data de Fim / Conclusão</span>
                                  <span className="text-xs font-bold text-zinc-200 font-mono">{activity.endDate}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 uppercase font-medium">Data Identificada:</span>
                                <span className="text-xs font-bold text-zinc-200 font-mono">
                                  {activity.startDate || activity.endDate || <span className="text-zinc-500 font-normal italic">Não identificada</span>}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Sugestão formatada para o SUAP */}
                          <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isFromTranscript ? 'text-amber-400' : 'text-ifpb-green'} flex items-center gap-1.5`}>
                                <FileText size={12} />
                                {isFromTranscript ? 'Registrado no SUAP (Histórico Oficial):' : 'Sugestão para o SUAP (Histórico):'}
                              </span>
                              <button
                                onClick={() => handleCopy(suapText, activity.id)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all border ${
                                  isCopied 
                                    ? isFromTranscript
                                      ? 'bg-amber-400 text-black border-amber-400'
                                      : 'bg-ifpb-green text-black border-ifpb-green' 
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10'
                                }`}
                                title="Copiar descrição para colar no SUAP"
                              >
                                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-white select-all leading-snug bg-zinc-900/60 p-2 rounded-lg border border-white/5">
                              {suapText}
                            </p>
                          </div>

                          {/* Justificativa e Regra */}
                          {cleanExplanation && (
                            <div className={`bg-zinc-900/40 p-3 rounded-xl border-l-2 ${explanationBorderClass}`}>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                Análise & Justificativa:
                              </span>
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {cleanExplanation}
                              </p>
                            </div>
                          )}

                          {/* Competências em Chips */}
                          {activity.skills && activity.skills.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Competências & Habilidades:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {activity.skills.map((skill, sIdx) => (
                                  <span key={`${activity.id}-gskill-${sIdx}`} className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-white/5 font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Footer Info */}
                          <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              {(isInvalid || isLowConfidence) ? (
                                <AlertCircle size={13} className="text-ifpb-red shrink-0" />
                              ) : (
                                <TrendingUp size={13} className="text-ifpb-green shrink-0" />
                              )}
                              <span>Regra: <strong className="text-zinc-300">{rule?.hoursPerUnit || 'Nº de horas'}</strong></span>
                            </div>
                            <div className="text-right">
                              <span>Teto Categoria: <strong className="text-white">{rule?.maxHours || 0}h</strong></span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Technologies & Functions Section */}
        <div ref={techSectionRef} className="max-w-6xl mx-auto w-full mt-24 mb-16 scroll-mt-32">
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Por trás da plataforma</h2>
            <div className="h-1 w-12 bg-ifpb-green rounded-full"></div>
            <p className="text-zinc-400 mt-4 text-sm text-center max-w-2xl">
              Descubra as tecnologias e funções que fazem nosso sistema compreender e classificar suas atividades complementares de forma inteligente.
            </p>
          </div>

          <AnimatePresence>
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 48 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex flex-col items-center overflow-hidden"
              >
                <div className="flex flex-col items-center bg-zinc-900/50 border border-white/5 rounded-2xl px-12 py-6">
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Aguarde processando</span>
                  <span className="text-5xl font-mono font-black text-ifpb-green mt-4 font-variant-numeric tracking-widest shadow-sm drop-shadow-md">
                    {formatTime(processingTime)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tech 1 */}
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl hover:border-ifpb-green/30 transition-colors group">
              <div className="w-12 h-12 bg-ifpb-green/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cpu size={24} className="text-ifpb-green" />
              </div>
              <h3 className="text-white font-bold mb-2">Inteligência Artificial</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Processamento de Linguagem Natural com o modelo Gemini Flash do Google para leitura profunda e compreensão das atividades.
              </p>
            </div>

            {/* Tech 2 */}
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl hover:border-ifpb-green/30 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ImageIcon size={24} className="text-blue-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Visão Computacional</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Extração automática do conteúdo de certificados em imagem ou arquivos PDF usando OCR e processamento visual avançado.
              </p>
            </div>

            {/* Tech 3 */}
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl hover:border-ifpb-green/30 transition-colors group">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search size={24} className="text-amber-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Busca Inteligente</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Integração autônoma com pesquisa web para confirmar informações de eventos e descobrir cargas horárias ausentes em certificados.
              </p>
            </div>

            {/* Tech 4 */}
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl hover:border-ifpb-green/30 transition-colors group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bot size={24} className="text-purple-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Assistente Virtual</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Chatbot integrado 24/7 configurado com o PPC do IFPB para responder instantaneamente a qualquer dúvida sobre validação e horas.
              </p>
            </div>

            {/* Tech 5 */}
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl hover:border-ifpb-green/30 transition-colors group">
              <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers size={24} className="text-rose-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Classificação Automática</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Enquadramento inteligente (Auto-Tagger) onde cada atividade é alocada e calculada conforme os limites da categoria correta.
              </p>
            </div>

            {/* Tech 6 */}
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl hover:border-ifpb-green/30 transition-colors group">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap size={24} className="text-cyan-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Alta Performance</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Arquitetura escalável com processamento assíncrono para classificar múltiplos arquivos e textos em curtos períodos de tempo.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-header border-t border-white/5 flex flex-col md:flex-row items-center justify-between mt-auto min-h-12 py-3 px-6 md:px-8 gap-4">
        <div className="flex items-center justify-start space-x-4 w-full md:w-[20%]">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-ifpb-green shadow-[0_0_8px_rgba(50,160,65,0.8)] animate-pulse"></div>
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Sistema Pronto</span>
          </div>
        </div>
        
        <div className="text-center w-full md:w-[60%] px-4">
          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
            <span className="text-zinc-400 font-bold">Aviso:</span> A IA integrada pode cometer erros e as classificações são apenas para orientação.<br className="hidden md:block"/>
            Regras baseadas nas Resoluções CNE/CES Nº 5/2016 e CS nº 31/2016 do <span className="text-zinc-400">PPC 2018 - Engenharia de Computação (IFPB)</span>.
          </p>
        </div>

        <div className="flex items-center justify-center md:justify-end space-x-6 w-full md:w-[20%]">
          <button 
            onClick={openTour} 
            className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white uppercase transition-colors"
          >
            Tutorial & Ajuda
          </button>
          <a 
            href="https://estudante.ifpb.edu.br/cursos/28/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white uppercase transition-colors"
          >
            Sobre
          </a>
        </div>
      </footer>

      <ChatBot analyzedActivities={results} />
      <OnboardingTour isOpen={isTourOpen} onClose={closeTour} />
    </div>
  );
}

