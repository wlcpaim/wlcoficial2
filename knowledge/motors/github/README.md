# Motor: Github



Conhecimentos: 8

Arquivo gerado automaticamente pela WLC.IA (memória eterna).

## GitHub Flow

_method · Fluxo de Trabalho_

Fluxo profissional de versionamento composto por 7 passos: 1. Criar branch da main atualizada; 2. Desenvolver e commitar; 3. Push da branch; 4. Abrir PR; 5. Review/CI; 6. Merge na main; 7. Deletar branch. Regra central: nunca commitar diretamente na main.

## Conventional Commits

_rule · Padrão de Commits_

Formato padronizado de mensagens de commit: `<tipo>(<escopo>): <descrição imperativa>`. Deve ser minúsculo, sem ponto final, sem emojis e no imperativo. Tipos comuns: feat, fix, refactor, docs, chore, test, perf, ci, revert.

## git bisect

_algorithm · Debugging_

Técnica de busca binária no histórico de commits para encontrar o 'first bad commit'. Inicia-se com 'git bisect start', marca-se o estado ruim ('git bisect bad') e o bom conhecido ('git bisect good <hash>'). O Git navega pelo histórico para isolar a causa raiz.

## Regra de Reversão de Histórico

_rule · Gestão de Histórico_

Para desfazer commits já enviados (push) em branches compartilhadas, utiliza-se 'git revert', pois ele cria um novo commit sem reescrever o histórico. O 'git reset' só deve ser usado em branches locais, nunca em compartilhadas, para evitar quebra de histórico para terceiros.

## Nomenclatura de Branches

_rule · Organização_

Branches devem ser criadas seguindo o padrão `categoria/descricao-curta` usando minúsculas e hífens. Categorias: feat/, fix/, refactor/, docs/, chore/.

## Prevenção de Exposição de Segredos

_rule · Segurança_

Nunca commitar arquivos sensíveis (.env, *.key, *.pem). Se ocorrer, remover do histórico usando 'git filter-repo' ou 'BFG Repo-Cleaner' e revogar as credenciais imediatamente.

## Fluxo de Debug de 6 Passos

_method · Metodologia_

Protocolo para resolução de problemas: 1. Reproduzir bug consistentemente; 2. Isolar causa raiz com git bisect; 3. Analisar commit culpado; 4. Criar branch de fix; 5. Escrever teste que reproduz o erro; 6. Corrigir, commitar seguindo Conventional Commits e abrir PR.

## Git Force-With-Lease

_technique · Segurança_

Alternativa segura ao 'git push --force'. Aborta o push caso alguém tenha enviado alterações para a branch remota desde o seu último fetch, evitando sobrescrever trabalho alheio.
