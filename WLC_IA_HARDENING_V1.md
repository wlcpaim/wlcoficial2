# WLC.IA — Hardening técnico V1

Data: 2026-11-19
Escopo: evolução aditiva da fundação enviada, sem alterar o repositório remoto ou aplicar migrações em produção.

## Implementado nesta revisão

### 1. Limites de escrita do agente
- Validação server-side de caminhos relativos antes de `write_file` e `delete_file`.
- Normalização de separadores Windows antes da validação.
- Bloqueio de traversal, caminhos absolutos e caminhos malformados.
- Bloqueio de alterações diretas em `.env`, credenciais, chaves privadas, workflows de CI, manifests/lockfiles de dependências e migrações Supabase.
- Exceção explícita para `.env.example` e `.env.sample`.
- Limite de 1 MB por arquivo em `write_file`.
- Validação de nomes de branches antes da chamada à API do GitHub.

Esses bloqueios são uma barreira de segurança adicional; não substituem revisão de código nem sandbox para execução de projetos.

### 2. Evidência de gravação
- A resposta de `write_file` agora retorna `ok: false` quando a leitura posterior não confirma o conteúdo exato, mesmo que o commit tenha sido criado.
- O resultado distingue commit criado de alteração validada.

### 3. Redação de segredos em logs
- Sanitização de tokens conhecidos, cabeçalhos Bearer e padrões comuns `api_key=`, `access_token=`, `password=`, `secret=` e `authorization=` em strings.
- Sanitização também aplicada a mensagens e stack traces de `Error`.
- Mantidos limites de profundidade, tamanho e quantidade de entradas.

### 4. Fila autônoma — integridade e leases
Nova migration `20261119000200_autonomous_reliability.sql`:
- Garante correspondência de usuário/projeto/chat entre job e plano.
- Recupera jobs `running` com heartbeat ausente ou expirado.
- Marca jobs que esgotaram tentativas como `failed`, em vez de deixá-los presos.
- Mantém claim atômico com `FOR UPDATE SKIP LOCKED`.
- Adiciona heartbeat protegido pelo `worker_id` que possui o lease.
- Adiciona finalização/reagendamento protegidos pelo `worker_id`, evitando que um worker antigo sobrescreva o resultado de um worker mais novo.
- Mantém RPCs administrativas restritas a `service_role`.

### 5. Testes adicionados
- Caminhos relativos, traversal, caminhos sensíveis e templates de ambiente.
- Nomes de branches.
- Sanitização de segredos em strings, objetos e erros.

## Limites que permanecem explícitos

Esta revisão **não** declara a execução autônoma em background como ativa. Ainda é necessário implementar, hospedar e operar um consumidor de `agent_jobs` que:
1. use exclusivamente credenciais server-side;
2. carregue e valide o plano aprovado e a propriedade do chat;
3. chame `claim_agent_job`;
4. renove o lease com `heartbeat_agent_job`;
5. invoque uma rotina de execução retomável e idempotente;
6. persista eventos e checkpoint;
7. finalize com `finish_agent_job`;
8. trate cancelamento, timeout, SIGTERM, backoff e dead-letter operacional.

Também permanecem pendentes a integração ponta a ponta de aprovação de plano antes de toda mutação, o streaming da interface a partir de `agent_events`, a sandbox real de builds/testes e o pipeline de deploy.

## Ordem segura de implantação

1. Fazer backup do banco e do branch de destino.
2. Revisar o diff e executar os testes locais.
3. Aplicar migrations em ambiente de staging.
4. Validar ownership mismatch, claim concorrente, heartbeat, stale worker e exhausted attempts.
5. Fazer deploy do app sem habilitar consumidores ainda não implantados.
6. Implementar e testar o worker em staging.
7. Integrar aprovação humana por hash de plano e por operação mutável.
8. Só então habilitar execução contínua em produção.

## Critérios mínimos de aceite do worker futuro

- Um único worker recebe cada job por lease.
- Worker antigo não consegue heartbeat/finalizar após perder o lease.
- Job interrompido com heartbeat expirado pode ser recuperado.
- Tentativas não excedem `max_attempts`.
- Job esgotado termina em `failed` e gera evento operacional.
- Nenhuma mutação é executada sem autorização válida, ainda vigente e vinculada ao plano/hash aprovado.
- O estado pode ser reconstruído após reinício do processo.
