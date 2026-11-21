# WLC.IA Project Creation Intelligence v1.0

## Purpose
Add a focused product-discovery layer to creation requests. It runs alongside the existing Creative Engineering, Design DNA, Design Intelligence, Professional Engineering, and Quality Gate modules; it does not replace them.

## What it does
- Heuristically classifies common product domains (PDV, fintech, ecommerce, SaaS, CRM, dashboards, admin tools, portfolios, games, booking, social products).
- Suggests domain-relevant functional modules, workflows, candidate entities, and routes.
- Supplies testable acceptance criteria, design direction, and common risks to the model context.
- Marks the classification confidence and warns that recommendations are candidates, not automatically approved scope.
- Encourages the creator to avoid fake controls, invented data/integrations, and generic repeated layouts.

## Integration
`agent.server.ts` composes this context for creation-oriented requests, in the same pre-generation stage as Creative Engineering and Design DNA.

## Limitations
This is deterministic heuristic analysis, not a trained product model or project execution. It cannot confirm the user's requirements, detect infrastructure, inspect a generated project, or prove features. Ambiguous requests receive generic guidance and open questions. The connected model must select only relevant suggestions.
