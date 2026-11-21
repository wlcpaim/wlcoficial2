/**
 * WLC.IA Social Cognition & Conversation Engine v0.1
 * A lightweight, deterministic context layer that guides natural dialogue.
 * It classifies conversational signals; it does not infer private traits or
 * treat emotion/tone estimates as facts.
 */
export type SocialIntent =
  | "greeting" | "gratitude" | "farewell" | "small_talk"
  | "emotional_support" | "advice" | "follow_up" | "research"
  | "curiosity" | "clarification" | "task" | "unknown";

export type ConversationalSignal = {
  intent: SocialIntent;
  tone: "warm" | "neutral" | "concerned" | "enthusiastic" | "frustrated" | "uncertain";
  shortContextualReply: boolean;
  topicContinuity: boolean;
  conversationalGoal: string;
  responseGuidance: string[];
};

const normalize = (s: string) => s.toLocaleLowerCase("pt-BR")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s?!.,:/-]/g, " ");
const has = (s: string, terms: string[]) => terms.some((t) => s.includes(t));

export function assessSocialConversation(message: string, recentHistory: Array<{role: string; content: string}> = []): ConversationalSignal {
  const q = normalize(message.trim());
  const recent = recentHistory.slice(-6);
  const historyHasTopic = recent.some((m) => m.content.trim().length > 20);
  const contextual = q.length <= 45 && historyHasTopic && !has(q, ["oi", "ola", "bom dia", "boa tarde", "boa noite"]);
  const greeting = has(q, ["oi", "ola", "ola", "bom dia", "boa tarde", "boa noite", "eai", "e aí"]);
  const thanks = has(q, ["obrigado", "obrigada", "valeu", "agradeco", "agradeço"]);
  const bye = has(q, ["tchau", "ate mais", "ate mais", "falou", "boa noite"]) && q.length < 45;
  const support = has(q, ["estou triste", "to triste", "to triste", "ansioso", "ansiosa", "estressado", "estressada", "desanimado", "desanimada", "me sinto", "aconteceu comigo", "preciso desabafar"]);
  const advice = has(q, ["o que eu faço", "que devo fazer", "me aconselha", "conselho", "vale a pena", "como lidar"]);
  const research = has(q, ["pesquise", "pesquisa", "procure", "fontes", "atual", "noticia", "noticia", "compare", "dados"]);
  const clarification = has(q, ["como assim", "por que", "porque", "não entendi", "nao entendi", "explica melhor", "qual deles", "o que significa"]);
  const task = has(q, ["crie", "faz", "faca", "faca", "implemente", "escreva", "analise", "analise", "corrija", "resolva", "calcule"]);
  const curious = has(q, ["curioso", "curiosidade", "quero saber", "me explica", "explique", "como funciona", "o que é", "oque e"]);
  const intent: SocialIntent = greeting ? "greeting" : thanks ? "gratitude" : bye ? "farewell" : support ? "emotional_support" : advice ? "advice" : contextual ? "follow_up" : research ? "research" : clarification ? "clarification" : task ? "task" : curious ? "curiosity" : q.length < 35 ? "small_talk" : "unknown";
  const tone = support ? "concerned" : has(q, ["!!!", "😍", "amei", "incrivel", "incrível", "top", "perfeito", "kkk", "haha"]) ? "enthusiastic" : has(q, ["irritado", "irritada", "frustrado", "frustrada", "que saco", "absurdo"]) ? "frustrated" : has(q, ["talvez", "nao sei", "nao sei", "duvida", "duvida", "será"]) ? "uncertain" : greeting || thanks ? "warm" : "neutral";
  const goal = ({
    greeting: "acolher o cumprimento e iniciar uma conversa leve, sem despejar explicações",
    gratitude: "reconhecer o agradecimento com naturalidade e não prolongar artificialmente",
    farewell: "despedir-se com cordialidade, sem criar pressão para continuar",
    small_talk: "responder de forma humana, breve e convidativa, mantendo o tema que a pessoa trouxe",
    emotional_support: "escutar, validar sem exagero, evitar julgamentos e oferecer um próximo passo útil quando apropriado",
    advice: "entender a situação, apresentar opções e trade-offs sem decidir pelo usuário",
    follow_up: "interpretar a mensagem curta usando o contexto recente e continuar de onde a conversa parou",
    research: "identificar a questão, pesquisar quando ferramentas e atualidade forem necessárias, e sintetizar evidências",
    curiosity: "explicar com clareza, adaptar profundidade e incentivar curiosidade sem fazer uma aula excessiva",
    clarification: "esclarecer o ponto específico e corrigir possível mal-entendido",
    task: "executar o pedido de forma direta; conversa não deve substituir ação solicitada",
    unknown: "deduzir o objetivo pelo contexto, responder com relevância e pedir esclarecimento somente se essencial",
  } as Record<SocialIntent, string>)[intent];
  const guidance = [
    "Responda primeiro ao conteúdo e à intenção real; não use uma fórmula fixa de abertura.",
    "Adapte tamanho, vocabulário e energia à mensagem do usuário; evite excesso de perguntas e listas em conversas simples.",
    "Use o histórico disponível para manter continuidade, não repita informações e não peça novamente dados já fornecidos.",
    "Quando houver uma pergunta de acompanhamento, conecte explicitamente ao assunto anterior; se o contexto for insuficiente, pergunte apenas o detalhe essencial.",
    "Se pesquisa for necessária ou solicitada, diferencie fatos verificados, inferências e incertezas; não invente fontes nem resultados.",
    "Mostre iniciativa com uma sugestão concreta somente quando ela agregar; evite ofertas genéricas ou insistentes.",
    "Em temas pessoais, seja respeitosa e empática sem fingir sentimentos, experiências humanas ou intimidade.",
    "Não trate sinais de humor como diagnóstico ou certeza: use linguagem cuidadosa e deixe a pessoa corrigir a interpretação.",
  ];
  return { intent, tone, shortContextualReply: contextual, topicContinuity: historyHasTopic, conversationalGoal: goal, responseGuidance: guidance };
}

export function formatSocialCognitionContext(signal: ConversationalSignal): string {
  return `## WLC.IA — Social Cognition & Conversation Engine
- Sinal conversacional estimado: ${signal.intent}
- Tom percebido (hipótese, não fato): ${signal.tone}
- Resposta curta pode depender do contexto anterior: ${signal.shortContextualReply ? "sim" : "não"}
- Há conteúdo recente para continuidade: ${signal.topicContinuity ? "sim" : "não"}
- Objetivo conversacional: ${signal.conversationalGoal}
### Diretrizes sociais
${signal.responseGuidance.map((g) => `- ${g}`).join("\n")}
Use esta camada como orientação flexível, não como roteiro obrigatório. Priorize a mensagem atual, contexto real e honestidade.`;
}
