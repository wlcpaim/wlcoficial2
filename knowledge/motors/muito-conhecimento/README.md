# Motor: Muito Conhecimento



Conhecimentos: 14

Arquivo gerado automaticamente pela WLC.IA (memória eterna).

## Definição de Arquitetura de Software

_concept · Arquitetura de Software_

Arquitetura de software é o conjunto de decisões estruturais que são caras de mudar, definem limites entre módulos e determinam os atributos de qualidade (como performance, escalabilidade e manutenibilidade) do sistema. Decisões arquiteturais envolvem trade-offs e devem atender a requisitos não-funcionais.

## Regra da Modularização em Monolitos

_rule · Arquitetura de Software_

Sempre inicie sistemas como monolitos. Quando a complexidade aumentar (ex: tempo de deploy excessivo, acoplamento excessivo), primeiro modularize dentro do monolito através de interfaces explícitas. A separação física em microsserviços deve ser uma otimização organizacional para times grandes, não uma escolha técnica inicial.

## Padrão Outbox para Eventos

_pattern · Sistemas Distribuídos_

Para garantir consistência entre uma operação de banco de dados e o disparo de um evento, o evento deve ser gravado em uma tabela 'outbox' na mesma transação que altera o registro principal. Um worker separado lê a tabela outbox e publica no broker de mensageria.

## Idempotência em Sistemas de Mensageria

_rule · Sistemas Distribuídos_

Como sistemas de filas podem entregar mensagens duplicadas, todo consumidor deve implementar idempotência, verificando em uma tabela de controle (ex: 'eventoProcessado') se a mensagem já foi tratada antes de executar a regra de negócio.

## Estratégia de Cache-Aside e Invalidação

_pattern · Performance_

O padrão Cache-Aside consiste em ler o cache antes do banco; se o dado não existir (miss), busca-se no banco e atualiza o cache. Toda escrita que modifica o dado original deve, obrigatoriamente, deletar ou atualizar a chave correspondente no cache para evitar inconsistência.

## Circuit Breaker

_pattern · Resiliência_

Padrão de resiliência que evita chamadas recorrentes a um serviço externo em falha. O circuito alterna entre 'closed' (chamadas normais), 'open' (falha imediata sem tentar o serviço) e 'half-open' (tenta uma chamada de teste após certo período).

## ADR (Architecture Decision Record)

_method · Processos de Engenharia_

Documentação formal de decisões arquiteturais relevantes contendo: Status, Contexto, Decisão, Consequências e Alternativas consideradas. Serve como fonte da verdade histórica para evitar que decisões sejam esquecidas ou alteradas indevidamente no futuro.

## Estratégia Trunk-Based Development

_method · Processo de Desenvolvimento_

Estratégia de controle de versão que prioriza branches curtas e merge frequente na branch principal (trunk). O objetivo é eliminar o 'merge hell' e garantir integração contínua, utilizando flags de funcionalidade (feature flags) para esconder código incompleto em produção, ao invés de manter branches de longa duração.

## Brand Pattern (TypeScript)

_pattern · Tipagem_

Técnica de tipagem opaca que usa uma interseção de tipo com uma string literal única (o 'brand') para garantir que tipos primitivos (como strings ou numbers) sejam semanticamente distintos. Ex: `type ItemId = string & { __brand: 'ItemId' };`. Isso impede que variáveis de tipos diferentes (ex: um ID de produto e um ID de usuário) sejam trocadas acidentalmente.

## Regra de Validação Autoritativa

_rule · Segurança_

Todo dado vindo do frontend (cliente) é considerado hostil. Regras de negócio críticas (dinheiro, permissões, inventário) devem ser validadas exclusivamente no backend. O estado no frontend é meramente indicativo; a validação final e persistência dependem de um contrato de API rigoroso, tipicamente validado via esquemas (ex: Zod).

## Manutenção de Memória (Memory Leaks)

_experience · Performance_

O gerenciamento de memória em ambientes como V8 (Node/Browser) requer evitar retenção desnecessária de referências. O uso de Memory Leaks através de listeners não removidos ou closures globais é a principal causa de degradação em apps long-running. O monitoramento deve incluir Heap Snapshots para identificar objetos que não são coletados pelo Garbage Collector.

## Currículo Universal de Conhecimento

_method · Educação_

Mapa estrutural que organiza o conhecimento formal (Educação Básica ao Mestrado/Doutorado) para orientar a profundidade e a abrangência de respostas de IA. Baseia-se na identificação de nível, matéria e estágio de progressão acadêmica.

## Regra de Calibração Dinâmica

_rule · Cognição de IA_

Protocolo para ajustar a densidade técnica e a complexidade de uma resposta de acordo com o nível educacional identificado na consulta do usuário, evitando simplificação excessiva ou excesso de rigor técnico fora de contexto.

## Regra de Conexão Interdisciplinar

_rule · Cognição de IA_

Princípio de síntese que busca relacionar um conceito central através de diferentes disciplinas (ex: História, Geografia, Literatura) para demonstrar domínio sistêmico do conhecimento, em vez de fornecer listas de conteúdos isolados.
