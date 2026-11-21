# WLC.IA — Base de conhecimento inicial v1.1

## Objetivo
Equipar o agente para seus primeiros projetos com conhecimento recuperável de matemática, Física e desenvolvimento de sites, além do conhecimento central já existente.

## Matemática
- Aritmética e ordem de operações
- Álgebra e equações
- Porcentagem, frações, regra de três
- Geometria e trigonometria
- Unidades, conversões e consistência
- Verificação por substituição e operação inversa
- Calculadora determinística com expressões limitadas e funções comuns

## Física
- Método pedagógico: dados, incógnita, SI, modelo, hipóteses, fórmula, isolamento, substituição, unidades, plausibilidade
- Cinemática e dinâmica
- Trabalho, energia e potência
- Eletricidade básica
- Biblioteca de fórmulas existente com 12 categorias e relações catalogadas

## Desenvolvimento Web
- Descoberta e requisitos, sitemap, jornadas e escopo
- HTML semântico, CSS, JavaScript e TypeScript
- Componentes React e estado
- Responsividade, design system, UX, estados e feedback
- Backend, APIs, banco de dados, autenticação e autorização
- Segurança, validação e proteção de segredos
- SEO, acessibilidade
- Debugging, lint, testes, build, CI, deploy e rollback

## Como o agente deve usar
1. Recuperar tópicos relevantes para a pergunta.
2. Responder de modo proporcional: simples diretamente, tarefas complexas com plano.
3. Para contas, usar a ferramenta `calculate_expression` como verificação numérica.
4. Para Física, mostrar unidades e hipóteses e nunca aplicar fórmula fora do domínio.
5. Para sites, começar pelos requisitos e construir em passos pequenos; verificar responsividade, acessibilidade, segurança e funcionalidade.
6. Declarar limites; base de conhecimento não é treinamento de pesos nem substitui pesquisa atual.

## Próximas expansões sugeridas
- Solução algébrica de equações (linear/quadrática) e sistemas
- Conversor de unidades com dimensão física
- Solucionadores de cinemática, dinâmica e circuitos com entradas estruturadas
- Biblioteca de padrões web, exemplos e templates validados
- Recuperação semântica/embeddings e avaliação de relevância
- Benchmarks de respostas e regressão

## Integração de recuperação
O agente injeta entradas WLC Core relevantes e recupera fórmulas da biblioteca de Física com correspondência lexical. A análise estática do repositório deixou de ser o caminho forçado de resposta para chats WLC. A conversa utiliza o loop do agente e ferramentas, dependendo da disponibilidade do provedor embutido configurado.
