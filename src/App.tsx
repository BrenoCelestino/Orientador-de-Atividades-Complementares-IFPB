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
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { classifyActivities } from './services/geminiService';
import { ACTIVITY_RULES, ProcessedActivity } from './types';
import { ChatBot } from './components/ChatBot';

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
  const [sortField, setSortField] = useState<SortField>('category');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const resultsRef = useRef<HTMLDivElement>(null);

  const addInput = (type: 'text' | 'url') => {
    if (inputs.length >= 10) {
      alert("Você pode adicionar no máximo 10 itens para análise por vez.");
      return;
    }
    setInputs(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, content: '', showContext: false, contextDescription: '' }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (inputs.length + files.length > 10) {
        alert("Você pode adicionar no máximo 10 itens para análise por vez.");
        return;
      }
      files.forEach(file => {
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
            mimeType: file.type,
            showContext: false,
            contextDescription: ''
          }, ...prev]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Limpar o input de arquivo para permitir a seleção do mesmo arquivo novamente se necessário
    e.target.value = '';
  };

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
      setResults(prev => [...data, ...prev]);
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

  const filteredResults = results.filter(r => {
    if (filterCategory !== 'all' && r.ruleId.toString() !== filterCategory.toString()) return false;
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
          <div className="hidden md:flex items-center gap-4">
            <a href="https://estudante.ifpb.edu.br/cursos/28/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 hover:text-white uppercase transition-colors px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10">
              Página do Curso
            </a>
            <a href="https://suap.ifpb.edu.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold tracking-wider text-ifpb-green hover:text-emerald-400 uppercase transition-colors px-4 py-2 rounded-lg bg-ifpb-green/10 hover:bg-ifpb-green/20 border border-ifpb-green/20 hover:border-ifpb-green/40">
              Acessar SUAP
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
                <p className="text-zinc-400">Adicione certificados, links ou descrições para classificar.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => addInput('url')}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 text-sm font-medium border border-white/5"
                >
                  <LinkIcon size={16} className="text-zinc-400 group-hover:text-white transition-colors" /> URL
                </button>
                <button 
                  onClick={() => addInput('text')}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 text-sm font-medium border border-white/5"
                >
                  <FileText size={16} className="text-zinc-400 group-hover:text-white transition-colors" /> Texto
                </button>
                <label className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-ifpb-green text-white cursor-pointer hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(50,160,65,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 text-sm font-bold border border-ifpb-green/50">
                  <Upload size={16} className="animate-bounce" /> Arquivos
                  <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center">
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
                <div className="col-span-full bg-surface rounded-2xl border-2 border-dashed border-white/10 hover:border-ifpb-green/50 transition-all p-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-ifpb-green" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Nenhum item adicionado ainda</p>
                    <p className="text-sm text-gray-500 mt-1">Adicione arquivos, links ou texto para classificar.</p>
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
                    </div>
                </div>

                <div className={viewMode === 'grid' ? 'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-4'}>
                  {sortedResults.map((activity, idx) => {
                    const rule = ACTIVITY_RULES.find(r => r.id === activity.ruleId);
                    const isInvalid = activity.confidence === 0 || activity.utilizedHours === 0;
                    const isLowConfidence = activity.confidence > 0 && activity.confidence <= 0.60;
                    
                    let bgClass = "bg-surface";
                    let borderClass = "border-white/5";
                    let headerBgClass = "bg-[#1a1a1a] border-white/5";
                    let textClass = "text-ifpb-green";
                    let confidenceClass = "bg-ifpb-green/10 text-ifpb-green border-ifpb-green/20";
                    let explanationBorderClass = "border-ifpb-green";
                    
                    if (isInvalid) {
                      bgClass = "bg-ifpb-red/10";
                      borderClass = "border-ifpb-red";
                      headerBgClass = "bg-ifpb-red/20 border-ifpb-red/30";
                      textClass = "text-ifpb-red";
                      confidenceClass = "bg-ifpb-red/20 text-ifpb-red border-ifpb-red/50";
                      explanationBorderClass = "border-ifpb-red";
                    } else if (isLowConfidence) {
                      borderClass = "border-ifpb-red/50 hover:border-ifpb-red";
                      headerBgClass = "bg-[#1a1a1a] border-ifpb-red/20";
                      confidenceClass = "bg-ifpb-red/10 text-ifpb-red border-ifpb-red/20";
                      explanationBorderClass = "border-ifpb-red";
                    }

                    if (viewMode === 'list') {
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`p-4 md:p-5 border flex flex-col md:flex-row md:items-center justify-between gap-6 group rounded-2xl ${bgClass !== 'bg-surface' ? bgClass : 'bg-surface'} ${borderClass} hover:bg-white/[0.02] transition-colors`}
                        >
                          <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 border border-white/10 uppercase tracking-tighter ${isInvalid ? 'text-ifpb-red' : 'text-zinc-400'}`}>
                                {activity.groupName}
                              </span>
                              <span className={`text-sm font-black uppercase tracking-wide ${isInvalid ? 'text-ifpb-red' : 'text-white'}`}>
                                {isInvalid ? 'DOCUMENTO INVÁLIDO' : activity.categoryName}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${confidenceClass}`}>
                                CONFIDENÇA: {Math.round(activity.confidence * 100)}%
                              </span>
                            </div>
                            <h3 className="font-medium text-white/90">{activity.title}</h3>
                            <p className="text-xs text-zinc-400 italic">"{activity.explanation}"</p>
                          </div>
                          
                          <div className="flex flex-col md:items-end shrink-0 bg-black/40 rounded-xl p-3 border border-white/5 md:min-w-[200px]">
                            <div className="flex flex-col gap-1 w-full text-xs text-zinc-400 mb-2 border-b border-white/5 pb-2">
                              <div className="flex justify-between gap-4">
                                <span>Carga Certificada:</span>
                                <span className="font-mono text-zinc-300">{activity.certificateHours}h</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Limite Regra:</span>
                                <span className="font-mono text-zinc-300">{rule?.maxHours || 0}h</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-end w-full">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none mb-1">Aproveitado</span>
                              <span className={`text-2xl leading-none font-black ${textClass}`}>{activity.utilizedHours || activity.hours}h</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`${bgClass} rounded-2xl border flex flex-col card-hover overflow-hidden group ${borderClass}`}
                      >
                        <div className={`p-4 border-b flex justify-between items-center ${headerBgClass}`}>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">{activity.groupName}</span>
                            <span className="text-sm font-black text-white uppercase tracking-wide">{isInvalid ? 'DOCUMENTO INVÁLIDO' : activity.categoryName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${confidenceClass}`}>
                                CONFIDENÇA: {Math.round(activity.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-2xl font-black ${textClass}`}>{activity.utilizedHours || activity.hours}h</span>
                            {activity.certificateHours > (activity.utilizedHours || activity.hours) && (
                              <span className="text-[10px] text-gray-500 line-through">De {activity.certificateHours}h</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-medium text-white mb-2">{activity.title}</h3>
                          
                          <div className={`bg-black/40 p-3 rounded-lg border-l-2 mb-4 ${explanationBorderClass}`}>
                            <p className="text-[12px] text-gray-400 leading-relaxed italic">
                              "{activity.explanation}"
                            </p>
                          </div>
                          
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              {(isInvalid || isLowConfidence) && <AlertCircle size={14} className="text-ifpb-red" />}
                              {!isInvalid && !isLowConfidence && <TrendingUp size={14} className="text-ifpb-green" />}
                              <div className="text-[10px] text-gray-500 uppercase tracking-tight">
                                Limite da categoria: <span className="text-white font-medium">{rule?.maxHours || 0}h</span>
                              </div>
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
          <a href="#" className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white uppercase transition-colors">Ajuda</a>
          <a href="#" className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white uppercase transition-colors">Sobre</a>
        </div>
      </footer>

      <ChatBot />
    </div>
  );
}

