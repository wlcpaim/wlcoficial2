# Motor: Estrutura de Projetos



Conhecimentos: 5

Arquivo gerado automaticamente pela WLC.IA (memória eterna).

## Framework de Planejamento de Projetos (14 Fases)

_method · Metodologia de Engenharia de Software_

Metodologia estruturada para o desenvolvimento de software, dividida em 14 fases sequenciais que vão do Discovery (validação de problema) até a execução e adaptação. O foco central é a decisão documentada, definição clara de escopo (MVP), arquitetura validada e plano de execução antes da codificação, evitando retrabalho e scope creep.

## Regra do MVP (Mínimo Viável)

_rule · Gestão de Produto_

Um MVP deve ser a versão mínima que resolve a dor central para pelo menos um usuário real. Não é uma versão beta ou incompleta, mas um produto capaz de validar a hipótese de valor. Uma feature só deve estar no MVP se, ao removê-la, o produto perder sua capacidade de resolver a dor do usuário.

## Documento de ADR (Architecture Decision Record)

_concept · Arquitetura de Software_

Formato de documentação técnica para registrar decisões que custam mais de uma semana de esforço para serem revertidas. Deve conter contexto, decisão, consequências (positivas/negativas) e alternativas consideradas. O ADR garante que a justificativa técnica não seja esquecida ao longo do tempo.

## Modelo de Domínio e Invariantes

_method · Domain-Driven Design_

Representação conceitual das entidades de negócio antes da definição de tabelas de banco de dados. Invariantes são regras de negócio imutáveis que devem sempre ser verdadeiras e que devem ser garantidas por testes automatizados, servindo como a fundação lógica do sistema.

## Requisitos Não-Funcionais Críticos

_fact · Arquitetura de Software_

Requisitos que definem a viabilidade técnica do produto, frequentemente negligenciados: Performance (latência), Escala (usuários simultâneos), Disponibilidade (uptime), Segurança (OWASP/LGPD), Acessibilidade (WCAG), Compatibilidade, Manutenibilidade e Custo operacional.
