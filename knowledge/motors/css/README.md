# Motor: Css



Conhecimentos: 7

Arquivo gerado automaticamente pela WLC.IA (memória eterna).

## Algoritmo da Cascata e Especificidade

_method · Fundamentos de CSS_

A ordem de precedência na cascata segue: (1) Ordem de declaração (a última vence), (2) Especificidade, (3) Origem, (4) !important. A especificidade é calculada pontuando seletores: Elemento (0-0-1), Classe (0-1-0), ID (1-0-0), Inline (1-0-0-0).

## Box-sizing: border-box

_rule · Layout_

A aplicação de box-sizing: border-box em todos os elementos (*::before, *::after) é a regra fundamental para garantir que padding e border sejam incluídos na largura declarada, evitando erros de layout.

## Regra 1D vs 2D (Flexbox vs Grid)

_rule · Arquitetura de Layout_

Flexbox deve ser utilizado para alinhamento em uma dimensão (linhas ou colunas), como navbars ou botões. CSS Grid é destinado a estruturas bidimensionais (linhas e colunas simultâneas), como galerias e dashboards.

## Mobile-first Responsive Design

_method · Responsividade_

Desenvolvimento de CSS com foco no mobile por padrão, aplicando melhorias progressivas para resoluções maiores através de media queries (min-width).

## Design Tokens

_concept · Arquitetura de Design System_

Design tokens são valores atômicos documentados (cores, espaçamento, tipografia, bordas) armazenados como variáveis CSS, facilitando a manutenção e a consistência visual em todo o projeto.

## WCAG Acessibilidade em CSS

_rule · Acessibilidade_

A acessibilidade exige contraste mínimo de 4.5:1 para texto normal, suporte a foco visível (outline), tamanhos de alvo (target) adequados e respeito às preferências de movimento do usuário via media query 'prefers-reduced-motion'.

## Performance: Prevenção de CLS

_method · Performance_

Para evitar Cumulative Layout Shift (CLS), deve-se definir dimensões explícitas (width/height) para imagens, reservar espaço para anúncios e utilizar font-display: swap para fontes customizadas.
