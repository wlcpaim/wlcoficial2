# Motor: Muito Conhecimento



Conhecimentos: 36

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

## Modelo 4D para Demissões

_method · Liderança_

Protocolo para desligamentos profissionais visando manter a dignidade: 1. Decisão (comunicar que é final); 2. Direto (motivo real sem rodeios); 3. Dignidade (não humilhar e reconhecer valor); 4. Detalhes (passagem para RH/verbas).

## Modelo PPA de Vulnerabilidade

_method · Intimidade_

Estrutura para interações de alta vulnerabilidade: Presença (estar inteiro, sem consertar), Profundidade (calibrar o que revelar) e Acolhimento (receber sem julgar). Essencial para criar conexão real sem ultrapassar limites adequados ao nível da relação.

## Regra da Calibragem de Vulnerabilidade

_rule · Comunicação_

Protocolo de seletividade na revelação pessoal: a vulnerabilidade deve ser proporcional ao nível da relação (fato -> emoção -> medo -> ferida -> núcleo). Deve-se pedir permissão antes de se abrir e revelar apenas um nível acima do que o interlocutor revelou para evitar a 'invasão de espaço emocional'.

## Regra da Intenção vs. Impacto

_rule · Comunicação_

Na mediação de conflitos ou comunicação intercultural, o impacto (o que o outro sentiu/recebeu) é considerado o fato consumado, enquanto a intenção é apenas a motivação do agente. Reconhecer o impacto antes de justificar a intenção é a base para a maturidade social e correção de vieses.

## Modelo NIPA de Negociação

_method · Negociação e Persuasão_

Estrutura para negociações éticas focada em interesses, não em posições. Fases: 1. Necessidades (descobrir interesses reais via perguntas abertas, evitando ancoragem inicial); 2. Interesses ocultos (identificar camadas emocionais e inconscientes através da escuta ativa); 3. Possibilidades (gerar pelo menos 3 opções, buscando expandir o valor total antes de dividir); 4. Acordo (formalização com 4 elementos: o quê, quando, quem e consequência).

## Modelo PONTE de Mediação

_method · Mediação de Conflitos_

Protocolo para mediadores terceiros manterem neutralidade processual. Fases: 1. Preparar (conversas individuais obrigatórias para identificar limites e evitar explosões); 2. Ouvir (sessão conjunta com regras de convivência rígidas e reformulação); 3. Nomear (traduzir queixas em necessidades reais); 4. Transformar (mediador pergunta, partes geram soluções); 5. Estabelecer (acordo claro com 4 elementos).

## Regra da Simetria de Poder

_rule · Mediação de Conflitos_

A mediação exige simetria de poder entre as partes. Em casos de abuso, violência, controle sistemático ou desigualdade extrema, a mediação é contraindicada, pois a estrutura torna-se uma plataforma de manipulação. Nesses cenários, o mediador deve recusar o papel e encaminhar para proteção especializada.

## Regra da Validação do Acordo

_rule · Negociação e Mediação_

Todo acordo, seja de negociação ou mediação, deve ser repetido em voz alta pelas partes antes de ser considerado finalizado. O resumo deve obrigatoriamente conter quatro elementos: escopo (o quê), prazo (quando), responsável (quem) e consequência em caso de descumprimento.

## Técnica de Tradução de Queixa em Necessidade

_technique · Mediação de Conflitos_

Habilidade central de mediação onde o mediador traduz a fala agressiva ou subjetiva (queixa) em uma demanda objetiva e legítima (necessidade). Exemplo: 'Ele nunca me escuta' traduzido para 'Você precisa ser ouvido antes de decisões que afetam o seu trabalho?'. Isso reduz a defensividade e foca na solução.

## Modelo LEAL de Atendimento

_method · Atendimento ao Cliente_

Protocolo de atendimento estruturado em quatro fases sequenciais: 1. Localizar (entender o problema e obter dados sem presunções); 2. Empatizar (nomear o impacto emocional/perda específica para o cliente); 3. Agir (apresentar solução concreta, limites e prazos claros, evitando o uso de frases ambíguas); 4. Levar adiante (fechar o loop garantindo que o cliente saiba como continuar sem recomeçar o processo).

## Anti-padrões de Atendimento

_rule · Atendimento ao Cliente_

Lista de frases proibidas por destruírem a confiança ou criarem loop infinito de atendimento: 'Sinto muito pelo ocorrido' (genérica), 'Vou verificar e retorno' (sem prazo), 'Infelizmente não é possível' (sem alternativa), 'Você precisa entrar em contato com X' (empurra o problema), 'É a política da empresa' (desumaniza), 'Calma' (invalida), 'Como posso ajudar?' (redundante), 'Aguarde na linha' (sem tempo definido).

## Regra de Calibragem de Atendimento

_rule · Atendimento ao Cliente_

A abordagem deve ser ajustada conforme o perfil do cliente: Irritado (foco em ação imediata, não peça calma); Confuso (oferecer apenas duas opções com trade-offs); Técnico (manter nível de detalhe); Leigo (usar analogias); Silencioso (fazer perguntas diretas com opções); Desabafo (perguntar se deseja solução ou apenas escuta).

## Regra de Ouro da Continuidade no Atendimento

_rule · Atendimento ao Cliente_

O cliente nunca deve recomeçar um atendimento. A continuidade é garantida via: registro de protocolo único, definição de um dono para o caso, histórico compartilhado entre atendentes e encerramento com registro do que foi feito e o que ficou pendente.

## Regra do Suporte Técnico Humanizado

_rule · Suporte Técnico_

Ao realizar resoluções técnicas rápidas e frias (ex: estornos), é obrigatório adicionar uma frase humana (contexto ou validação emocional) para evitar que o cliente se sinta tratado como um objeto transacional.

## Modelo AEO (Acolher -> Estabilizar -> Orientar)

_method · Method_

Protocolo para conversas de crise onde o interlocutor está em modo sobrevivência. 1. Acolher: reconhecer a dor sem minimizar ou comparar; 2. Estabilizar: trazer o foco para o presente e necessidades imediatas; 3. Orientar: oferecer apenas um passo prático, e apenas se solicitado ou seguro.

## Modelo NVA (Nomear -> Validar -> Abrir)

_method · Method_

Protocolo para lidar com interlocutores raivosos. 1. Nomear: identificar a raiva sem julgamento; 2. Validar: aceitar a legitimidade da emoção (mesmo que a expressão seja exagerada); 3. Abrir: convidar à exposição do fato concreto para entendimento mútuo.

## Modelo TAP (Testemunhar -> Acompanhar -> Perguntar)

_method · Method_

Protocolo para interações com pessoas em estado de tristeza ou desabafo. 1. Testemunhar: espelhar a compreensão do que foi dito; 2. Acompanhar: oferecer presença sem pressa; 3. Perguntar: verificar se o interlocutor deseja continuar falando ou silêncio.

## Modelo 3A (Aterrar -> Ancorar -> Ação mínima)

_method · Method_

Protocolo para intervenção em episódios de ansiedade aguda. 1. Aterrar: focar na realidade física presente; 2. Ancorar: distinguir fatos reais de hipóteses catastróficas; 3. Ação mínima: definir um único passo executável no momento, evitando planos complexos.

## Modelo CIA (Curiosidade -> Interesse -> Autenticidade)

_method · Method_

Protocolo para conversas de sedução legítima focado em conexão real. 1. Curiosidade: perguntas focadas no outro; 2. Interesse: escuta ativa e referência a detalhes; 3. Autenticidade: vulnerabilidade calibrada, sem exibicionismo ou falsidade.

## Modelo 4R (Reconhecer -> Responsabilizar -> Reparar -> Recomeçar)

_method · Method_

Protocolo de reparo para quando um erro é cometido. 1. Reconhecer: admitir o erro sem eufemismos; 2. Responsabilizar: assumir o erro pessoalmente sem terceirizar culpas; 3. Reparar: ação concreta para mitigar o impacto; 4. Recomeçar: reabrir o diálogo.

## Modelo PIP (Ponte -> Investigação -> Ponte final)

_method · Method_

Protocolo para corrigir equívocos ou crenças errôneas. 1. Ponte: encontrar um ponto de concordância legítimo; 2. Investigação: questionar através da curiosidade para que o outro teste a própria lógica; 3. Ponte final: introduzir a informação correta como nova perspectiva.

## Modelo 3P (Perceber -> Puxar -> Proteger)

_method · Method_

Protocolo para mediação de dinâmicas em grupo. 1. Perceber: identificar quem está silenciado ou sendo atropelado; 2. Puxar: convidar a voz silenciosa para a conversa; 3. Proteger: intervir para interromper o domínio de uma única voz.
