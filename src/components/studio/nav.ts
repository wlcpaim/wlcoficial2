import {
  MessageSquarePlus,
  History,
  BrainCircuit,
  Settings,
  LayoutDashboard,
  FolderKanban,
  Bug,
  Github,
  Radio,
} from "lucide-react";

/**
 * Navegação principal — WLC.IA
 * Foco: Chat (estilo ChatGPT), Histórico, WLC.IA, Configuração GitHub.
 * Sem seleção de agente externo. WLC.IA é a única inteligência.
 */
export const NAV = [
  { to: "/chat", label: "Novo chat", icon: MessageSquarePlus },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/cognitive", label: "WLC.IA", icon: BrainCircuit },
  { to: "/repos", label: "Repositórios", icon: Github },
  { to: "/live", label: "WLC.IA Preview", icon: Radio },
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/projects", label: "Projetos", icon: FolderKanban },
  { to: "/debugger", label: "Depurador", icon: Bug },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

/** Navegação inferior (mobile) — 5 itens principais */
export const BOTTOM = ["/chat", "/history", "/cognitive", "/repos", "/settings"] as const;
