/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ActivityRule {
  id: number;
  name: string;
  group: string; // New field from Cartilha 2026
  description: string;
  hoursPerUnit: string;
  maxHours: number;
}

export interface ProcessedActivity {
  id: string;
  title: string;
  ruleId: number;
  groupName: string;
  categoryName: string; 
  hours: number;
  certificateHours: number;
  utilizedHours: number;
  explanation: string;
  confidence: number;
  isFromTranscript?: boolean; // Se foi extraído de um Histórico Escolar oficial do IFPB
  sourceType?: 'transcript' | 'certificate' | 'url' | 'text' | 'manual';
  suapDescription?: string; // Sugestão formatada pronta para o campo "Atividade" do histórico no SUAP
  skills?: string[]; // Competências extraídas
  startDate?: string; // Data de início do evento/atividade (ex: 10/05/2024)
  endDate?: string; // Data de fim/conclusão ou emissão (ex: 15/05/2024)
  periodDisplay?: string; // Texto formatado do período para exibição (ex: 2026/1)
}

export const ACTIVITY_RULES: ActivityRule[] = [
  // PESQUISA
  { id: 1, group: "Pesquisa", name: "Trabalhos nacionais", description: "Trabalhos completos publicados em anais de eventos, livros ou periódicos nacionais na área do curso.", hoursPerUnit: "10h/trab", maxHours: 50 },
  { id: 2, group: "Pesquisa", name: "Trabalhos internacionais", description: "Trabalhos completos publicados em anais de eventos, livros ou periódicos internacionais na área do curso.", hoursPerUnit: "20h/trab", maxHours: 100 },
  { id: 4, group: "Pesquisa", name: "Congressos (Apres. Oral)", description: "Congressos, conferências, simpósios e afins com apresentação oral de trabalho.", hoursPerUnit: "Até 10h/evento", maxHours: 50 },
  { id: 5, group: "Pesquisa", name: "Congressos (Apres. Pôster)", description: "Congressos, conferências, simpósios e afins com apresentação de pôster/painel.", hoursPerUnit: "Até 5h/evento", maxHours: 30 },
  { id: 11, group: "Pesquisa", name: "Iniciação Científica", description: "Projeto de Iniciação Científica/Tecnológica formalizado no IFPB ou órgão de fomento.", hoursPerUnit: "Até 60h/projeto", maxHours: 120 },
  
  // ENSINO
  { id: 13, group: "Ensino", name: "Monitoria", description: "Monitoria em disciplina que compõe o currículo do curso.", hoursPerUnit: "Até 20h/semestre", maxHours: 60 },
  
  // EXTENSÃO
  { id: 12, group: "Extensão", name: "Extensão", description: "Participação em Atividades de Extensão na área do curso formalizadas pelo IFPB.", hoursPerUnit: "Até 60h/projeto", maxHours: 120 },
  { id: 19, group: "Extensão", name: "Organização de Eventos", description: "Organização de Eventos pelo IFPB.", hoursPerUnit: "Até 5h/evento", maxHours: 15 },
  
  // PRÁTICAS PROFISSIONALIZANTES
  { id: 10, group: "Práticas Profissionalizantes", name: "Estágio Extracurricular", description: "Estágio extracurricular na área do curso, devidamente regulamentado pelo IFPB.", hoursPerUnit: "Até 30h/semestre", maxHours: 120 },
  { id: 14, group: "Práticas Profissionalizantes", name: "Empresa Júnior/Incubada", description: "Participação em projetos na área do curso em empresas juniores ou incubadas vinculadas ao IFPB.", hoursPerUnit: "Até 20h/projeto", maxHours: 40 },
  
  // CURSOS E CERTIFICAÇÕES
  { id: 6, group: "Cursos e Certificações", name: "Cursos (Ouvinte)", description: "Cursos ou minicursos na área do curso como ouvinte.", hoursPerUnit: "Nº de horas", maxHours: 30 },
  { id: 7, group: "Cursos e Certificações", name: "Cursos (Ministrante)", description: "Cursos ou minicursos na área do curso como ministrante.", hoursPerUnit: "2x Nº de horas", maxHours: 60 },
  { id: 8, group: "Cursos e Certificações", name: "Língua Estrangeira", description: "Cursos de Língua Estrangeira realizado durante o curso.", hoursPerUnit: "Até 4h/semestre", maxHours: 20 },
  { id: 9, group: "Cursos e Certificações", name: "Disciplina Extracurricular", description: "Disciplina que não componha a matriz curricular do curso, oferecida em cursos superiores do IFPB.", hoursPerUnit: "Até 10h/disciplina", maxHours: 30 },
  { id: 21, group: "Cursos e Certificações", name: "Certificações Oficiais", description: "Certificações oficiais na área do curso (Cisco CCNA, Oracle Java, etc).", hoursPerUnit: "Nº de horas (Máx 40h/Cert)", maxHours: 80 },
  
  // REPRESENTAÇÃO E COMPETIÇÕES
  { id: 17, group: "Representação e Competições", name: "Representação Estudantil", description: "Representação (ou administração) em entidades estudantis vinculadas ao IFPB.", hoursPerUnit: "Até 10h/ano", maxHours: 40 },
  { id: 18, group: "Representação e Competições", name: "Visita Técnica", description: "Visita técnica extracurricular na área do curso organizada pelo IFPB.", hoursPerUnit: "Até 4h/visita", maxHours: 20 },
  { id: 20, group: "Representação e Competições", name: "Olimpíadas", description: "Participação em Olimpíadas na área do curso (ex: Maratona de Programação).", hoursPerUnit: "Até 10h/evento", maxHours: 30 },

  // GERAL / EVENTOS (Conforme opções disponíveis no SUAP e PPC)
  { id: 3, group: "Eventos", name: "Congressos (Ouvinte)", description: "Congressos, conferências, simpósios e afins de caráter científico ou tecnológico na área do curso como ouvinte.", hoursPerUnit: "3h/evento", maxHours: 30 },
  { id: 15, group: "Eventos", name: "Palestras e Oficinas (Ouvinte - Teto 20h)", description: "Palestras, Mesas Redondas ou Oficinas na área do Curso (Ouvinte) - Sem seminários/encontros. Limite de até 20h por período e 20h no curso (aproveita carga horária real do evento).", hoursPerUnit: "Nº de horas (Máx 20h)", maxHours: 20 },
  { id: 16, group: "Eventos", name: "Palestras e Mesas Redondas (Debatedor)", description: "Palestras, mesas redondas, seminários, encontros ou oficinas na área do curso (debatedor/palestrante).", hoursPerUnit: "5h/partic", maxHours: 20 },
  { id: 25, group: "Eventos", name: "Seminários e Encontros (Ouvinte - Teto 2h/período)", description: "Palestras, mesas redondas, seminários, encontros ou oficinas na área do curso (ouvinte) - Com seminários e encontros. Limite restrito de até 2h por período e 20h no curso.", hoursPerUnit: "2h/período", maxHours: 20 },
];
