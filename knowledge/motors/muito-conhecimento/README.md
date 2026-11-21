# Motor: Muito Conhecimento



Conhecimentos: 8

Arquivo gerado automaticamente pela WLC.IA (memória eterna).

## Definição de Arquitetura de Software

_concept · Arquitetura de Software_

Arquitetura de software é o conjunto de decisões estruturais que são caras de mudar, definem limites entre módulos e determinam os atributos de qualidade (como performance, escalabilidade e manutenibilidade) do sistema. Decisões arquiteturais envolvem trade-offs e devem atender a requisitos não-funcionais.

## Regra da Modularização em Monolitos

_rule · Arquitetura de Software_

Sempre inicie sistemas como monolitos. Quando a complexidade aumentar (ex: tempo de deploy excessivo, acoplamento excessivo), primeiro modularize dentro do monolito através de interfaces explícitas. A separação física em microsserviços deve ser uma otimização organizacional para times grandes, não uma escolha técnica inicial.

## Padronização de Camadas (Controller-Service-Repository)

_pattern · Arquitetura de Software_

Separação em camadas para evitar espaguete: 1) Controller (HTTP/Entrada, sem regra de negócio); 2) Service (regra de negócio pura, agnóstica a infraestrutura); 3) Repository (acesso a dados, tradução entre domínio e persistência); 4) Model/Entity. Camadas vazias que apenas repassam dados devem ser eliminadas.

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
