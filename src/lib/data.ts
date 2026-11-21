import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("*").neq("status", "archived").order("last_activity_at", { ascending: false, nullsFirst: false });
    if (error) throw error; return data;
  } });
}
export function useRepos() {
  return useQuery({ queryKey: ["repos"], queryFn: async () => {
    const { data, error } = await supabase.from("repositories").select("*").order("updated_at", { ascending: false });
    if (error) throw error; return data;
  } });
}
export function useConnections() {
  return useQuery({ queryKey: ["connections"], queryFn: async () => {
    const { data, error } = await supabase.from("api_connections")
      .select("id, provider, name, model, status, is_primary, is_active, google_project, secret_hint, last_tested_at, last_error, quota_exceeded_at, metadata, created_at")
      .order("is_primary", { ascending: false }).order("created_at");
    if (error) throw error; return data;
  } });
}
export function useChats(projectId?: string) {
  return useQuery({ queryKey: ["chats", projectId ?? "all"], queryFn: async () => {
    let q = supabase.from("chats").select("*, projects(name)").order("updated_at", { ascending: false }).limit(200);
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q; if (error) throw error; return data;
  } });
}
