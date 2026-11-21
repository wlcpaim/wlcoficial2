# WLC.IA Evolution V3 — aprovação transacional de planos

## Objetivo
Transformar a aprovação humana de um plano em uma transação verificável que cria um trabalho durável na fila somente após confirmação explícita do proprietário.

## Entregas
- Migration `20261119000400_agent_plan_approval.sql` com RPCs `approve_agent_plan` e `reject_agent_plan`.
- As RPCs exigem sessão autenticada, verificam `auth.uid()` contra o dono do plano e comparam o hash esperado com o hash persistido.
- Aprovar muda o plano de `pending` para `approved` e cria `agent_jobs(status='queued')` na mesma transação. Se a inserção falhar (por exemplo, conflito com trabalho ativo), a aprovação também é revertida.
- Rejeitar é condicional ao estado `pending` e ao hash exato.
- Server functions validadas com Zod e interface em Tarefas para revisar JSON do plano, aprovar/enfileirar ou rejeitar.
- A migration não concede acesso às RPCs para `anon` ou `public`; execução é concedida a `authenticated` com verificação de propriedade dentro da função.

## Limites deliberados
- Isto implementa o portão de aprovação e o enfileiramento; **não implementa nem ativa um worker de execução**. A fila só será consumida quando um worker durável separado estiver implementado, implantado e configurado.
- O agente conversacional atual continua com seu fluxo e limite de 48 etapas por chamada.
- Ainda é necessário implementar o produtor confiável de `agent_plans` que gera plano e hash a partir de uma solicitação real. A UI só lista planos que já existam.
- Não executar migrations automaticamente nem ativar service-role em ambiente de produção nesta entrega.

## Aplicação
Aplicar migrations pendentes em ordem no projeto Supabase de homologação, verificar RLS e testar com dois usuários: dono aprova/rejeita; usuário diferente não consegue decidir; hash alterado é recusado; conflito de trabalho ativo reverte a transação. Só então promover para produção.
