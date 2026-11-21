export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  provider?: string;
  model?: string;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type RuleType = "when" | "priority" | "format" | "behavior" | "avoid";

export interface BehaviorRule {
  id: string;
  name: string;
  type: RuleType;
  /** Palavras-chave separadas por vírgula (usado em regras do tipo "when"). */
  condition?: string;
  instruction: string;
  priority: number;
  enabled: boolean;
}

export interface AIConfig {
  name: string;
  identity: string;
  personality: string;
  objective: string;
  tone: string;
  language: string;
  rules: string;
  restrictions: string;
  instructions: string;
  systemPrompt: string;
  behaviorRules: BehaviorRule[];
}

export interface ConfigVersion {
  id: string;
  number: number;
  name: string;
  description: string;
  createdAt: number;
  config: AIConfig;
}

export interface VersionState {
  versions: ConfigVersion[];
  activeId: string | null;
}

export interface TestCase {
  id: string;
  name: string;
  prompt: string;
  expected: string;
  createdAt: number;
}

export type Verdict = "pass" | "fail";

export interface TestRun {
  id: string;
  caseId: string;
  /** "draft" quando executado com o rascunho atual do Lab. */
  versionId: string;
  versionLabel: string;
  provider: string;
  isRealProvider: boolean;
  response: string;
  error?: string;
  durationMs: number;
  at: number;
  verdict?: Verdict;
}
