# Motor: Github



Conhecimentos: 16

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

## Regra de Ouro da Escala

_rule · Regra_

A escala é um processo de resolução de gargalos estruturais em ordem fixa: 1. Banco de dados, 2. Falta de cache, 3. Processamento síncrono, 4. Assets, 5. Conexões, 6. Coordenação. Otimizar um estágio superior ignorando o gargalo atual é ineficaz (Lei de Amdahl).

## Método dos 3 Sinais para Diagnóstico de Gargalos

_method · Método_

Diagnóstico de performance baseado em sintomas: CPU alta (algoritmo/serialização); Memória alta (cache local/vazamento); Latência alta + CPU baixa (I/O, rede, banco); Erro 'too many connections' (pool/queries lentas); Latência sobe com carga (gargalo de recurso); Latência constante/alta (API terceira).

## Regra de Cursor Pagination

_rule · Regra_

Em datasets grandes, prefira 'cursor pagination' em vez de 'offset pagination'. O 'offset' exige que o banco conte todos os registros anteriores, degradando linearmente conforme o volume cresce. O cursor permite salto direto ao próximo conjunto de dados.

## Fórmula de Pool de Conexões

_formula · Fórmula_

O dimensionamento de conexões de banco deve seguir: pool_size = (número_de_instâncias * workers_por_instância * 2) + margem. A soma total nunca deve exceder o limite máximo do banco de dados.

## Padrão de Idempotência em Filas

_pattern · Padrão_

Todo job de fila é suscetível a duplicidade. É obrigatório implementar chave de idempotência utilizando um storage rápido (como Redis) para marcar um processo como 'concluído' antes de executar a lógica de negócio, prevenindo re-processamento.

## Regra de Cache Busting

_rule · Regra_

Para assets, nunca utilize nomes estáticos se o conteúdo mudar. Use hashes no nome do arquivo (ex: image.hash.webp) e defina o header 'Cache-Control: public, max-age=31536000, immutable'. Isso garante que a CDN sirva a versão correta sem servir versões obsoletas.

## Proteção Contra Cache Stampede

_technique · Técnica_

Quando uma chave de cache expira sob alta carga, múltiplos requests podem tentar recomputar o mesmo valor simultaneamente, sobrecarregando o banco. Soluções incluem: 1. 'Lock distribuído' (garante que apenas um processo compute); 2. 'Stale-while-revalidate' (serve a versão antiga enquanto um worker em background atualiza o cache).

## Instrumentação de Queries de Banco

_technique · Técnica_

Toda query de negócio deve ser nomeada. Sem um nome único no código, é impossível rastrear a origem do gargalo nos dashboards de monitoramento. Utilize 'EXPLAIN ANALYZE' antes de enviar qualquer query nova para produção para identificar 'Seq Scan' em tabelas grandes.
