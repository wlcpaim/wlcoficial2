# WLC.IA — atualização de arquitetura

## Fluxo

- Novo chat é o ponto de entrada principal.
- Projeto é opcional na interface. Para satisfazer o esquema atual do banco, chats sem projeto criam um contexto de projeto automaticamente.
- Repositório GitHub e workflow são opcionais.
- Workflows: análise, depuração, implementação, revisão, segurança e arquitetura.

## Integrações preservadas

- Supabase: nenhuma migration, tabela, política RLS ou configuração foi alterada.
- GitHub: fluxo de conexão e operações existentes foram mantidos.

## Provedor conversacional e limites

O chat WLC.IA utiliza o provedor embutido configurado no ambiente para geração conversacional e chamadas de ferramentas. Ele não seleciona chaves Gemini/Vercel do usuário no preset WLC.IA, mas a geração de linguagem não é um modelo local independente. A rota antiga de APIs redireciona para Configurações; tabelas e registros legados não são apagados.

O scanner determinístico de repositório continua como utilitário separado, e não é mais o caminho obrigatório para responder toda mensagem do chat.

## Cognitive Engine — estado real

A conversa do WLC.IA passa pelo agente conversacional com contexto recuperado e ferramentas disponíveis. Isso não cria, por si só, um modelo neural próprio, treinamento de pesos ou execução local independente. O agente depende do provedor embutido e das ferramentas autorizadas; a base de conhecimento e a calculadora são módulos determinísticos.

Etapas planejadas:
1. Interpretação e classificação de intenção.
2. Decomposição em subtarefas e plano verificável.
3. Memória operacional persistida com contexto e decisões.
4. Geração de patches e edição de arquivos.
5. Executor isolado (sandbox) com limites e aprovação.
6. Depuração com reprodução e coleta de logs.
7. Validação por testes/build/CI e auditoria dos resultados.

As etapas devem ser implementadas e testadas individualmente antes de serem apresentadas como capacidades disponíveis.


## Cognitive Orchestrator v0.1 (implementado)

O `src/lib/wlc-cognitive-engine.ts` introduz uma camada determinística de orquestração que antecede a chamada ao modelo:

- Classifica intenção aproximada: conversa, pergunta, aprendizagem, matemática, física, pesquisa, planejamento, desenvolvimento, depuração, revisão, segurança, escrita ou desconhecida.
- Estima complexidade (baixa/média/alta) e risco (baixo/médio/alto).
- Recomenda se ferramentas podem agregar valor, se há necessidade provável de esclarecimento e sugere ações/plano compacto.
- Injeta contexto de orquestração no prompt do agente para o modelo adaptar sua atuação.
- Registra metadados resumidos no logger (`cognitive-engine/request_assessed`).

É um **roteador heurístico**, não um modelo de linguagem, nem um mecanismo de pensamento autônomo. O modelo conectado continua responsável pela interpretação semântica, escolha final de ferramentas e resposta. As classificações podem errar; devem ser avaliadas com casos de teste e feedback. Nenhuma migration ou tabela foi criada.


## Autonomous Development Core v0.7

A camada determinística de engenharia adiciona planejamento por tarefas/dependências, validação segura de operações multi-arquivo, checkpoints de estado, lições limitadas à sessão e registro de resultados de validação. O ciclo de reparo é limitado por tentativas. Execução de código deve ser ligada somente por um adapter de sandbox isolado; não há executor genérico de shell habilitado nesta versão.
