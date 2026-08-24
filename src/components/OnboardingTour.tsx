import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  UploadCloud, 
  FileCheck2, 
  Copy, 
  Bot, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  HelpCircle,
  ShieldAlert,
  GraduationCap,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  highlights: { title: string; desc: string }[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Orientador de Atividades Complementares",
    badge: "Engenharia de Computação • IFPB",
    description: "Esta ferramenta foi desenvolvida para ajudar você a contabilizar, organizar e classificar suas 240 horas de atividades complementares obrigatórias, de acordo com o PPC e as normas vigentes do IFPB.",
    icon: <GraduationCap className="w-8 h-8 text-ifpb-green" />,
    highlights: [
      {
        title: "240 Horas Obrigatórias",
        desc: "Acompanhe seu progresso de integralização em tempo real conforme adiciona certificados."
      },
      {
        title: "Regras Atualizadas do PPC & Tetos",
        desc: "Cálculo automático de tetos máximos por item, semestre e limite acumulado por categoria."
      }
    ]
  },
  {
    title: "Como Enviar e Carregar seus Comprovantes",
    badge: "Upload & Entradas Flexíveis",
    description: "Você pode adicionar até 10 itens por lote de análise usando diferentes formatos:",
    icon: <UploadCloud className="w-8 h-8 text-emerald-400" />,
    highlights: [
      {
        title: "Arquivos PDF, Imagens ou Ctrl+V",
        desc: "Carregue certificados, arraste arquivos ou aperte Ctrl+V para colar capturas de tela diretamente da área de transferência."
      },
      {
        title: "Links ou Textos Descritivos",
        desc: "Adicione links de eventos/cursos ou descreva atuações como monitorias, projetos e estágios."
      },
      {
        title: "Carga Horária & Observações Opcionais",
        desc: "Caso deseje fixar uma carga horária ou fornecer detalhes extras para a IA, use os campos específicos."
      }
    ]
  },
  {
    title: "Análise Inteligente, Datas & Sugestão SUAP",
    badge: "Resultados Estruturados",
    description: "Ao clicar em 'Analisar Atividades', o sistema processa seus documentos e entrega um relatório completo:",
    icon: <FileCheck2 className="w-8 h-8 text-ifpb-green" />,
    highlights: [
      {
        title: "Datas de Início e Fim do Evento",
        desc: "Identificação automática do período de realização (início e término/conclusão) para você preencher os campos do SUAP."
      },
      {
        title: "Classificação & Cálculo de Horas Válidas",
        desc: "Enquadra nas categorias oficiais e calcula as horas aproveitáveis respeitando os tetos do PPC."
      },
      {
        title: "Nome Pronto para o SUAP & Cópia em 1 Clique",
        desc: "Gera a descrição formatada de alto impacto para o campo 'Atividade' no histórico escolar."
      }
    ]
  },
  {
    title: "Revisão Necessária & Assistente Tira-Dúvidas",
    badge: "Transparência & Suporte",
    description: "Orientações fundamentais para garantir a segurança no seu processo de validação acadêmica:",
    icon: <Bot className="w-8 h-8 text-cyan-400" />,
    highlights: [
      {
        title: "⚠️ A IA Pode Cometer Pequenos Erros",
        desc: "O sistema fornece uma orientação baseada em IA. Sempre revise as datas, categorias e horas atribuídas antes de confiar 100% ou submeter ao SUAP."
      },
      {
        title: "Chatbot Especialista no Regimento",
        desc: "Utilize o botão de chat flutuante para tirar dúvidas específicas sobre as normas e resolução do IFPB."
      }
    ]
  }
];

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="relative w-full max-w-xl bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Top Bar with Step Count & Close */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ifpb-green animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                  Como Funciona • Passo {currentStep + 1} de {TOUR_STEPS.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Fechar guia"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 sm:p-8 flex flex-col gap-5 overflow-y-auto">
              {/* Header of the step */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 shrink-0 shadow-inner">
                  {TOUR_STEPS[currentStep].icon}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-ifpb-green tracking-wider uppercase">
                    {TOUR_STEPS[currentStep].badge}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                    {TOUR_STEPS[currentStep].title}
                  </h2>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-300 leading-relaxed">
                {TOUR_STEPS[currentStep].description}
              </p>

              {/* Highlights cards */}
              <div className="grid gap-2.5">
                {TOUR_STEPS[currentStep].highlights.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-start gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-ifpb-green/10 text-ifpb-green border border-ifpb-green/20 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-zinc-200">{item.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prominent Warning Callout inside the tour */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-amber-200">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 text-xs">
                  <strong className="text-amber-300 font-semibold">Lembrete Importante</strong>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    O sistema utiliza Inteligência Artificial e pode cometer pequenos erros de interpretação. Sempre revise cuidadosamente os dados, datas e horas calculadas antes de confiar 100%.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="px-6 py-4 border-t border-white/5 bg-black/40 flex items-center justify-between gap-4 shrink-0">
              {/* Step indicator dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStep 
                        ? 'w-6 bg-ifpb-green' 
                        : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                    }`}
                    title={`Ir para o passo ${i + 1}`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={14} />
                    Voltar
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-ifpb-green hover:bg-emerald-500 text-black transition-all flex items-center gap-1.5 shadow-lg shadow-ifpb-green/20"
                >
                  <span>{currentStep === TOUR_STEPS.length - 1 ? 'Entendido, Começar' : 'Próximo'}</span>
                  {currentStep === TOUR_STEPS.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
