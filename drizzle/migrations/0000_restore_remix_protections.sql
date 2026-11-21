DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','projects','api_connections','repositories','chats','chat_messages','agent_sessions','agent_plans',
    'agent_jobs','agent_job_checkpoints','agent_events','audit_logs','checkpoints','development_logs','development_tasks',
    'file_changes','project_memory','repository_snapshots','test_results','preview_sessions','preview_logs','deployments',
    'deployment_logs','deployment_domains','publications','publication_releases','site_records','migration_history',
    'cognitive_motors','cognitive_motor_settings','cognitive_conversations','cognitive_messages','cognitive_documents',
    'cognitive_file_contents','cognitive_knowledge','cognitive_knowledge_sources','cognitive_learning_events','cognitive_memory_index']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
REVOKE ALL ON SEQUENCE public.agent_events_id_seq FROM anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.agent_events_id_seq TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.projects, public.repositories, public.chats, public.chat_messages,
  public.audit_logs, public.checkpoints, public.development_logs, public.development_tasks,
  public.file_changes, public.project_memory, public.repository_snapshots, public.test_results,
  public.preview_sessions, public.preview_logs, public.deployments, public.deployment_logs,
  public.deployment_domains, public.publications, public.publication_releases
  TO authenticated;
GRANT SELECT ON public.agent_events, public.agent_plans, public.agent_jobs, public.agent_job_checkpoints TO authenticated;
GRANT SELECT, UPDATE ON public.agent_sessions TO authenticated;
GRANT SELECT, DELETE ON public.site_records TO authenticated;
GRANT SELECT (id, user_id, provider, name, model, google_project, secret_hint, status, is_active, is_primary,
  last_error, last_tested_at, quota_exceeded_at, metadata, created_at, updated_at) ON public.api_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON
  public.cognitive_motors, public.cognitive_motor_settings, public.cognitive_conversations, public.cognitive_messages,
  public.cognitive_documents, public.cognitive_file_contents, public.cognitive_knowledge, public.cognitive_knowledge_sources,
  public.cognitive_learning_events, public.cognitive_memory_index
  TO authenticated;

-- Profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function privileges
REVOKE EXECUTE ON FUNCTION
  public.handle_new_user(), public.handle_new_cognitive_motor(),
  public.owns_project(uuid), public.owns_cognitive_motor(uuid),
  public.acquire_agent_lock(uuid, integer), public.release_agent_lock(uuid, text, text),
  public.approve_agent_plan(uuid, text), public.reject_agent_plan(uuid, text), public.request_agent_job_cancel(uuid),
  public.claim_agent_job_v2(text, integer), public.claim_agent_job(text, integer),
  public.heartbeat_agent_job_v2(uuid, text, integer), public.heartbeat_agent_job(uuid, text),
  public.finish_agent_job_v2(uuid, text, integer, text, text, timestamptz, uuid),
  public.finish_agent_job(uuid, text, text, text, timestamptz, uuid),
  public.save_agent_job_checkpoint(uuid, text, integer, integer, text, jsonb, text),
  public.search_cognitive_knowledge(uuid, text, boolean, integer),
  public.devstudio_schema_status(), public.devstudio_installed_version(),
  public.get_published_site(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.owns_project(uuid), public.owns_cognitive_motor(uuid),
  public.acquire_agent_lock(uuid, integer), public.release_agent_lock(uuid, text, text),
  public.approve_agent_plan(uuid, text), public.reject_agent_plan(uuid, text), public.request_agent_job_cancel(uuid),
  public.search_cognitive_knowledge(uuid, text, boolean, integer),
  public.devstudio_schema_status(), public.devstudio_installed_version()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_site(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.owns_project(uuid), public.owns_cognitive_motor(uuid),
  public.claim_agent_job_v2(text, integer), public.claim_agent_job(text, integer),
  public.heartbeat_agent_job_v2(uuid, text, integer), public.heartbeat_agent_job(uuid, text),
  public.finish_agent_job_v2(uuid, text, integer, text, text, timestamptz, uuid),
  public.finish_agent_job(uuid, text, text, text, timestamptz, uuid),
  public.save_agent_job_checkpoint(uuid, text, integer, integer, text, jsonb, text),
  public.get_published_site(text), public.devstudio_schema_status(), public.devstudio_installed_version()
  TO service_role;

-- Realtime
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agent_events','agent_sessions','chat_messages','agent_plans']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

INSERT INTO public.migration_history (version, name, description)
SELECT '0.17.0', 'wlc_ia_base_schema', 'Base schema rebuilt in Lovable Cloud from the WLC.IA app'
WHERE NOT EXISTS (SELECT 1 FROM public.migration_history);