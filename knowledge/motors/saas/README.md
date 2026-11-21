# Motor: Saas



Conhecimentos: 7

Arquivo gerado automaticamente pela WLC.IA (memória eterna).

## Arquitetura de Monolito Modular para SaaS

_architecture · architecture_

Utilização de um monolito modular com Next.js (App Router), PostgreSQL e Drizzle ORM. Recomendado para times pequenos em fase de validação, permitindo agilidade operacional antes de migrar para microsserviços apenas quando domínios específicos exigirem escala distinta.

## Regra de Segurança de Multi-tenancy

_rule · security_

Em sistemas multi-tenant, toda entidade deve possuir um 'organizationId' e toda query deve obrigatoriamente filtrar por ele. A recomendação é a criação de um helper (getTenant) que extrai o contexto do usuário autenticado e injeta o ID da organização em todas as operações de banco de dados para evitar vazamento de dados entre clientes (cross-tenant leak).

## Helper de Tenant (getTenant)

_method · technique_

Função centralizada para validar a sessão do usuário e recuperar o contexto da organização ativa. Deve ser a primeira linha de qualquer API Route ou Server Action autenticada para garantir que o usuário tenha permissão e um contexto de organização definido.

## Camada de Repositório (Repository Layer)

_pattern · pattern_

Abstração da lógica de acesso a dados que obriga a passagem do 'orgId' como parâmetro. Impede que o desenvolvedor esqueça o filtro de multi-tenancy ao escrever queries, atuando como uma camada de defesa contra vazamentos de dados.

## Gerenciamento de Variáveis de Ambiente (.env)

_rule · security_

Variáveis de ambiente sensíveis nunca devem ser commitadas no repositório Git. O uso de um arquivo .env.example (com valores vazios ou exemplos) serve como guia para o time, enquanto o .env.local (contendo segredos reais) deve constar no .gitignore.

## Cálculo de ROI e Métricas de Funil

_formula · method_

Cálculo de métricas de vendas: Taxa de Conversão (won/total), CAC (custo_marketing_total / clientes_adquiridos), e ROI por canal ((receita_canal - custo_canal) / custo_canal * 100). As queries devem agrupar por canal e filtrar obrigatoriamente pelo ID da organização e intervalo de datas.

## Estratégia de MVP (Regra de Corte)

_rule · method_

Para garantir o lançamento do MVP em tempo viável, deve-se aplicar o corte rigoroso de funcionalidades secundárias (ex: automações, IA, apps mobile). Cada funcionalidade adicionada ao escopo do MVP aumenta exponencialmente o tempo de entrega e risco de não lançamento.
