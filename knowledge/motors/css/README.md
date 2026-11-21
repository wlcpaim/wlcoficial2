# Motor: Css



Conhecimentos: 15

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

## CUBE CSS (Composition, Utility, Block, Exception)

_method · Methodology_

Metodologia de arquitetura CSS que separa responsabilidades: Composition (layout/estrutura, ex: stack, cluster), Utility (helpers, ex: .text-center), Block (componentes independentes, ex: .card) e Exception (estados, ex: .is-active). Permite criar componentes que desconhecem seu contexto de posicionamento.

## Cascade Layers (@layer)

_technique · Arquitetura CSS_

Recurso nativo para definir a ordem de prioridade da cascata explicitamente, sem depender de especificidade ou !important. A ordem declarada na primeira linha do arquivo define a precedência. @layer inverte a lógica do !important caso este seja usado entre camadas.

## Container Queries (cqw, cqi, cqh, cqb)

_technique · Responsividade_

Técnica de responsividade baseada no espaço disponível do elemento (container) em vez do viewport. Utiliza propriedades como 'container-type: inline-size' e unidades relativas como 'cqi' (1% do inline size do container), permitindo que componentes sejam verdadeiramente reutilizáveis em diferentes layouts.

## :has() (Seletor Pai)

_technique · CSS Moderno_

Pseudo-classe que permite estilizar um elemento pai com base na existência ou estado de seus filhos (ex: .card:has(img)). Deve ser utilizado com seletores de filho direto (>) ou escopo restrito para evitar degradação de performance por recálculo de estilo excessivo.

## @property (CSS Custom Properties com tipo)

_technique · CSS Moderno_

Permite definir tipos, valores iniciais e herança para variáveis CSS. Fundamental para animar propriedades que nativamente não suportariam transições, como ângulos em gradientes (conic-gradient).

## OKLCH Color Space

_technique · Design Tokens_

Espaço de cor moderno que oferece percepção visual uniforme. Mudanças nos valores numéricos (luminosidade, croma, matiz) resultam em alterações perceptíveis de forma consistente, superior ao HSL. Recomendado para novos projetos e sistemas de design.

## Performance: Content-visibility

_technique · Performance_

Propriedade que otimiza o render de elementos fora da tela (off-screen). Ao usar 'content-visibility: auto' com 'contain-intrinsic-size', o navegador pula o render até que o elemento se aproxime do viewport, reduzindo drasticamente o tempo de carregamento inicial.

## @starting-style (Animação de entrada)

_technique · CSS Moderno_

Regra at-rule que permite definir o estado inicial de um elemento que acabou de entrar no DOM, possibilitando transições de entrada (ex: de display: none/visibility: hidden para visível) sem a necessidade de manipular classes via JavaScript com atrasos de tempo.
