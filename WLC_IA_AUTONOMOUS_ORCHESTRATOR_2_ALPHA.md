# WLC Autonomous Orchestrator 2.0 — Stage 6 Alpha (Sovereign Builder)

## Decisão arquitetural

Não criamos outro agente independente.  
O núcleo de desenvolvimento autônomo existente (`wlc-autonomous-development-core.ts`) continua sendo o coração do sistema.  
O Orchestrator é o **controlador central** que planeja, coordena, executa e acompanha, usando o core como base de tarefas, checkpoints, validação e evidências.

Esta versão alinha o Orchestrator à diretiva **Sovereign Builder (Stage 6+)**.

## Arquitetura (Stage 6)

```
WLC Agent (conversational + cognitive)
    ↓
Requirement Compiler          ← natural language → formal requirements + risk
    ↓
WLC Autonomous Orchestrator   ← controlador central
    ├── Task Graph Engine
    ├── Policy Engine (5 regras + high-risk gates)
    ├── Execution Manager
    ├── Trusted Workspace Executor (isolation-first)
    ├── Validation / Evidence Package
    └── Checkpoint / Recovery
         ↓
Runtime (worker + Docker sandbox + lease fencing)
         ↓
WLC Delivery (diff, approval, GitHub, deploy)
```

## Estrutura

```
src/lib/orchestrator/
├── orchestrator.types.ts
├── orchestrator.schemas.ts
├── orchestrator.server.ts
├── requirement-compiler.ts      # Stage 6
├── evidence-package.ts          # Stage 6
└── trusted-workspace-executor.ts # Stage 6
```

Runtime existente (não duplicado):

- `runtime/worker.mjs` — lease fencing, checkpoints, fail-closed executor
- `runtime/docker-sandbox.mjs` — network-none, read-only root, resource limits
- `runtime/example-validation-only-executor.mjs`

## Ciclo de vida

```
RECEIVED → PLANNING → WAITING_APPROVAL → QUEUED → RUNNING
                                              ↓
                                         VALIDATING
                                         ↙        ↘
                                    RUNNING     COMPLETED
                                    (reparo)   / FAILED / CANCELLED
```

Conclusão **só** ocorre com Evidence Package completo (typecheck + unit_test + build com evidência não vazia).

## As cinco regras + Stage 6

1. Nenhuma execução sem plano estruturado.  
2. Nenhuma operação sensível sem autorização verificável.  
3. Nenhuma tarefa concluída sem validação **e** Evidence Package.  
4. Nenhuma retomada sem verificar o estado e a integridade do checkpoint.  
5. Nenhum trabalho poderá modificar um projeto fora do workspace autorizado.

Princípios Sovereign Builder adicionais:

- Truth over performance theater  
- Evidence-gated autonomy  
- Deterministic core + probabilistic reasoning  
- Isolation first  
- Human remains the final authority  

## Stage 6 entregas nesta rodada

| Item | Status |
|------|--------|
| Requirement Compiler (determinístico) | ✅ |
| Evidence Package obrigatório | ✅ |
| Trusted Workspace Executor contract | ✅ |
| Integração com Docker sandbox existente | ✅ (adapter) |
| Repair loop com bounded attempts | ✅ (core + orchestrator) |
| Browser acceptance tests | ⏳ (próximo) |
| Expansão de templates SaaS/tenancy | ⏳ (próximo) |

## Uso mínimo (Stage 6)

```ts
import {
  receiveRequest,
  planExecution,
  requestApproval,
  startExecution,
  enterValidation,
  completeFromValidation,
} from "./lib/orchestrator/orchestrator.server";
import { runTrustedWorkspaceValidation } from "./lib/orchestrator/trusted-workspace-executor";

let exec = receiveRequest("Crie um SaaS de tarefas com login e multi-tenant");
exec = planExecution(exec);
// exec.compiledRequirements agora contém risco, requisitos e stack sugerida

if (exec.compiledRequirements?.requiresHumanApproval) {
  exec = requestApproval(exec, true);
  // ... approve(exec) após revisão humana
} else {
  exec = requestApproval(exec, false);
}

exec = startExecution(exec);

// Validação isolada (host injeta sandboxRunner real)
const report = await runTrustedWorkspaceValidation({
  workspacePath: exec.workspacePath!,
  mode: "validation-only",
  commands: ["typecheck", "test", "build"],
  sandboxRunner: /* docker-sandbox adapter */,
});
exec.validationResults = report.results;
exec = enterValidation(exec);
exec = completeFromValidation(exec); // exige Evidence Package completo
```

## Testes

```bash
vitest run src/test/wlc-orchestrator-alpha.test.ts
vitest run src/test/wlc-sovereign-builder-stage6.test.ts
```

## Diretiva oficial

Ver `WLC_IA_SOVEREIGN_BUILDER_STAGE_6.md`.

## Limitações honestas

- Estado de execução ainda em memória (persistência via runtime/worker + Supabase).  
- Browser/E2E acceptance ainda não implementado.  
- Templates de tenancy/SaaS ainda básicos (preset wlc-ia).  
- Gateway de modelos ainda acoplado à infraestrutura existente; abstração multi-provider é Stage 7.

O objetivo não é parecer autônomo. É ser correto, seguro e progressivamente mais capaz.
