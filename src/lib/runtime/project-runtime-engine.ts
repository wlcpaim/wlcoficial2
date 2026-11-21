/**
 * Project Runtime Engine V1 — orchestration contract and state machine.
 * This module deliberately does not execute repository code. Runtime/build providers
 * must be configured behind RuntimeAdapter; absent providers fail closed.
 */
import { analyzeProject, type AnalyzerInput, type ProjectProfile } from "../environment/project-analyzer";

export const RUNTIME_STATES = ["QUEUED","ANALYZING","INSTALLING","BUILDING","STARTING","READY","ERROR","STOPPING","STOPPED"] as const;
export type RuntimeState = typeof RUNTIME_STATES[number];
export type RuntimeEvent = { at: string; state: RuntimeState; message: string; level: "info"|"warn"|"error" };
export type RuntimeSession = { id: string; projectId: string; commitSha: string; state: RuntimeState; createdAt: string; expiresAt: string };
export type RuntimeLog = { timestamp: string; sessionId: string; stage: string; level: "info"|"warn"|"error"; message: string };
export interface RuntimeAdapter {
  configured(): boolean;
  provision(request: RuntimeRequest, profile: ProjectProfile): Promise<RuntimeSession>;
  terminate(session: RuntimeSession): Promise<void>;
}
export interface BuildAdapter {
  build(session: RuntimeSession, profile: ProjectProfile): Promise<{ success: boolean; artifactId?: string; logs: RuntimeLog[]; error?: string }>;
}
export interface PreviewAdapter {
  expose(session: RuntimeSession, port: number): Promise<{ previewUrl: string }>;
  close(session: RuntimeSession): Promise<void>;
}
export interface DeploymentAdapter {
  deploy(artifactId: string, releaseId: string): Promise<{ url: string; deploymentId: string }>;
  rollback(deploymentId: string): Promise<void>;
}
export interface ProcessManager {
  start(session: RuntimeSession, command: string, port?: number): Promise<{ processId: string; port: number }>;
  stop(session: RuntimeSession, processId: string): Promise<void>;
}
export interface PortManager { reserve(sessionId: string): Promise<number>; release(sessionId: string, port: number): Promise<void>; }
export interface LogManager { append(log: RuntimeLog): Promise<void>; read(sessionId: string, limit?: number): Promise<RuntimeLog[]>; }
export type RuntimeRequest = { projectId: string; commitSha: string; files: AnalyzerInput; };
export type RuntimeResult = { profile: ProjectProfile; state: RuntimeState; events: RuntimeEvent[]; error?: string; capability: "static-preview"|"runtime-required"|"provider-unconfigured" };

const ALLOWED: Record<RuntimeState, RuntimeState[]> = {
 QUEUED:["ANALYZING","ERROR","STOPPING"], ANALYZING:["INSTALLING","BUILDING","READY","ERROR","STOPPING"],
 INSTALLING:["BUILDING","ERROR","STOPPING"], BUILDING:["STARTING","READY","ERROR","STOPPING"],
 STARTING:["READY","ERROR","STOPPING"], READY:["STOPPING","ERROR"], ERROR:["STOPPING","STOPPED"],
 STOPPING:["STOPPED","ERROR"], STOPPED:["QUEUED"]
};
export function transitionRuntime(state: RuntimeState, next: RuntimeState): RuntimeState {
 if (!ALLOWED[state].includes(next)) throw new Error(`Transição inválida de runtime: ${state} → ${next}`);
 return next;
}
export function analyzeRuntimeRequest(request: RuntimeRequest, providerConfigured = false): RuntimeResult {
 const profile = analyzeProject(request.files);
 const events: RuntimeEvent[] = [];
 let state: RuntimeState = "QUEUED";
 const emit = (next: RuntimeState, message: string, level: RuntimeEvent["level"]="info") => {
   state = transitionRuntime(state,next);
   events.push({ at: new Date().toISOString(), state, message, level });
 };
 emit("ANALYZING", `Análise do commit ${request.commitSha.slice(0,7)}`);
 const isStatic = profile.packageManager === "none" && request.files.paths.some(p => p.toLowerCase().endsWith("index.html"));
 if (isStatic) {
   emit("READY", "Projeto estático elegível ao preview HTML; nenhuma execução de código foi iniciada.");
   return { profile, state, events, capability:"static-preview" };
 }
 if (!providerConfigured) {
   emit("ERROR", "Runtime/build remoto não configurado. Preview de framework não será simulado.", "error");
   return { profile, state, events, capability:"provider-unconfigured", error:"Configure um RuntimeAdapter seguro para instalar, compilar e iniciar este projeto." };
 }
 emit("ERROR", "Provider configurado, mas o adapter de build/preview ainda não foi conectado a esta solicitação.", "error");
 return { profile, state, events, capability:"runtime-required", error:"Adapter de runtime/build não conectado." };
}
