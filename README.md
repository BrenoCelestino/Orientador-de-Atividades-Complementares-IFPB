# Analisador de Atividades Complementares - IFPB (Engenharia de Computação)

Este é um sistema inteligente desenvolvido para auxiliar os alunos do curso de Bacharelado em Engenharia de Computação do Instituto Federal da Paraíba (IFPB) - Campus Campina Grande, a classificar, contabilizar e tirar dúvidas sobre suas Atividades Complementares.

O sistema utiliza a inteligência artificial do Google (Gemini 3 Flash Preview) para analisar certificados, declarações, editais e textos, automatizando o mapeamento para as regras do curso definidas no Projeto Pedagógico de Curso (PPC) e na Cartilha de 2026.

## Funcionalidades Principais

- 📄 **Classificação Automática**: Faça upload de certificados (PDF/Imagem) ou insira links e textos. A IA analisa o conteúdo e sugere em qual categoria a atividade se enquadra.
- ⏱️ **Cálculo de Horas**: O sistema calcula automaticamente as horas aproveitáveis, respeitando os limites máximos por grupo de atividade e por certificado.
- 🎓 **Filtro de Período**: O aluno pode informar seu ano/semestre de ingresso. A inteligência do sistema identificará e invalidará atividades realizadas antes da entrada no curso.
- 💬 **Assistente Virtual**: Um chatbot alimentado por IA, especialista no regulamento do IFPB, pronto para tirar dúvidas sobre processos, limites de horas, entrega via SUAP, entre outros. Aceita envio de arquivos para análise pontual.
- 📊 **Dashboard de Progresso**: Visão clara sobre o total de horas já contabilizadas (em relação à meta de 240h) e visualização das categorias agrupadas de acordo com os 6 grandes grupos (Pesquisa, Ensino, Extensão, Práticas Profissionalizantes, Cursos e Certificações, Representação e Competições).
- 🛡️ **Segurança e Sanitização**: Proteção contra injeções de script (DOM XSS) e validação contra tentativas de Prompt Injection no modelo de IA.

## Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite.
- **Ícones**: Lucide React.
- **Animações**: Motion (Framer Motion).
- **Inteligência Artificial**: SDK GenAI do Google (`@google/genai`) utilizando os modelos `gemini-3-flash-preview` (busca e chat) e suporte a vision para PDFs/Imagens.
- **Markdown**: `react-markdown` e `remark-gfm` para renderização das respostas do Chatbot.

## Como as Regras Funcionam

A avaliação é baseada em:
1. **PPC de Engenharia de Computação do IFPB (2018)**.
2. **Cartilha de Atualização e Orientações - 2026** (Guia de encaminhamento via SUAP e limites operacionais).

Os discentes precisam atingir **240 horas** complementares divididas entre diferentes grupos. O sistema ajuda a prever exatamente quantas dessas 240 horas já foram cumpridas de acordo com os envios da análise.

## Como Executar Localmente

### Pré-requisitos
- Node.js (Ambiente de execução)
- Chave de API do Google Gemini (para chamadas à IA)

### Instalação

1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz do projeto contendo sua chave do Gemini:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

Acesse em `http://localhost:3000` ou dependendo da configuração da sua máquina.

## Contribuição

Sinta-se à vontade para abrir Issues e Pull Requests com sugestões de melhorias na interface, novas validações, e ajustes finos no prompt da IA para aumentar a precisão da classificação dos certificados documentados.

## Licença

Este projeto foi construído no Google AI Studio. 
Não se trata de uma ferramenta oficial da instituição, mas de um sistema de auxílio projetado de alunos para alunos. Consulte oficialmente a coordenação em caso de dúvidas definitivas sobre seu processo.
