# WLC.IA Social Cognition & Conversation Engine v0.1

A deterministic conversational signal layer integrated into the agent's system context.

## Purpose
- Identify broad conversational intent (greeting, follow-up, support, advice, research, clarification, curiosity, task).
- Treat short messages as context-dependent when recent history supports it.
- Suggest response style and dialogue goals to the language model without forcing a template.
- Keep sentiment/tone estimates tentative; never infer diagnoses or personal traits.

## Integration
`src/lib/wlc-social-cognition.ts` exports `assessSocialConversation` and `formatSocialCognitionContext`.
`agent.server.ts` evaluates the current message alongside recent message history and appends the formatted social context to the existing cognitive/engineering context. Structured social signals are included in cognitive logs.

## Limits
This is a rule-based intent/context heuristic, not a separately trained model. Its guidance can help the underlying language model maintain natural dialogue, but conversation quality still depends on the configured model, prompt, available history, and tools. It does not create long-term memory or web-search capability by itself.
