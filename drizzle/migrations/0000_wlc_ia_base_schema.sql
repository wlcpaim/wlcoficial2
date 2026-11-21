-- WLC.IA base schema, rebuilt from the app's generated types and call sites.

-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ core tables ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  preset text NOT NULL DEFAULT '',
  default_model text,
  context_summary text,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = auth.uid());
$$;

CREATE TABLE public.api_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  provider text NOT NULL,
  name text NOT NULL,
  model text,
  google_project text,
  secret_ciphertext text NOT NULL,
  secret_hint text,
  status text NOT NULL DEFAULT 'untested',
  is_active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  last_error text,
  last_tested_at timestamptz,
  quota_exceeded_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES public.api_connections(id) ON DELETE SET NULL,
  owner text NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL,
  html_url text,
  default_branch text NOT NULL DEFAULT 'main',
  private boolean NOT NULL DEFAULT false,
  is_authorized boolean NOT NULL DEFAULT true,
  last_commit_sha text,
  last_synced_at timestamptz,
  analysis jsonb,
  analyzed_at timestamptz,
  analyzed_sha text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, full_name)
);

CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  repository_id uuid REFERENCES public.repositories(id) ON DELETE SET NULL,
  branch text,
  model text NOT NULL,
  title text NOT NULL DEFAULT 'Novo chat',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  tool_calls jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  chat_id uuid NOT NULL UNIQUE REFERENCES public.chats(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  api_connection_id uuid REFERENCES public.api_connections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'idle',
  lock_token text,
  started_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE public.agent_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  version integer NOT NULL,
  goal text NOT NULL,
  plan jsonb NOT NULL,
  plan_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, version)
);

CREATE TABLE public.agent_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL UNIQUE REFERENCES public.agent_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  lease_generation integer NOT NULL DEFAULT 0,
  worker_id text,
  available_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  cancel_requested_at timestamptz,
  last_error text,
  checkpoint_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_job_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  lease_generation integer NOT NULL,
  sequence integer NOT NULL,
  step_id text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  state_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_jobs ADD CONSTRAINT agent_jobs_checkpoint_id_fkey
  FOREIGN KEY (checkpoint_id) REFERENCES public.agent_job_checkpoints(id) ON DELETE SET NULL;

CREATE TABLE public.agent_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.agent_jobs(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  agent text NOT NULL DEFAULT 'dev-agent',
  operation text NOT NULL,
  file_path text,
  change_summary text,
  status text NOT NULL DEFAULT 'completed',
  result text,
  commit_sha text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  api_connection_id uuid REFERENCES public.api_connections(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'open',
  branch text,
  head_sha text,
  repo_full_name text,
  last_operation text,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  modified_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  resumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.development_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.development_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.file_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  repository_id uuid REFERENCES public.repositories(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  change_type text NOT NULL,
  diff_summary text,
  previous_sha text,
  new_sha text,
  commit_sha text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.repository_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  branch text NOT NULL,
  head_sha text NOT NULL,
  file_count integer NOT NULL DEFAULT 0,
  tree jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  suite text NOT NULL,
  test_name text NOT NULL,
  status text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- live preview / deploy / publish
CREATE TABLE public.preview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  branch text NOT NULL,
  commit_sha text,
  framework text NOT NULL DEFAULT 'static',
  entry_path text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.preview_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.preview_sessions(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  branch text NOT NULL,
  commit_sha text NOT NULL,
  commit_message text,
  target_url text,
  status text NOT NULL DEFAULT 'queued',
  health_status integer,
  rolled_back_from uuid,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deployment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  deployment_id uuid NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  step text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deployment_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  repository_id uuid NOT NULL UNIQUE REFERENCES public.repositories(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  active_release_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.publication_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  release_number integer NOT NULL,
  branch text NOT NULL,
  commit_sha text NOT NULL,
  commit_message text,
  framework text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  artifact_html text,
  artifact_bytes integer,
  file_count integer,
  activated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, release_number)
);
ALTER TABLE public.publications ADD CONSTRAINT publications_active_release_id_fkey
  FOREIGN KEY (active_release_id) REFERENCES public.publication_releases(id) ON DELETE SET NULL;

CREATE TABLE public.site_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  collection text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.migration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  name text NOT NULL,
  description text,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- ============ cognitive ============
CREATE TABLE public.cognitive_motors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_learning_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE OR REPLACE FUNCTION public.owns_cognitive_motor(_motor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.cognitive_motors WHERE id = _motor_id AND user_id = auth.uid());
$$;

CREATE TABLE public.cognitive_motor_settings (
  motor_id uuid PRIMARY KEY REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  share_new_knowledge boolean NOT NULL DEFAULT false,
  use_global_knowledge boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  motor_id uuid NOT NULL REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova conversa',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  motor_id uuid NOT NULL REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.cognitive_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  document_ids uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  motor_id uuid NOT NULL REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.cognitive_conversations(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  file_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  analysis text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_file_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  motor_id uuid NOT NULL REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.cognitive_documents(id) ON DELETE CASCADE,
  path text NOT NULL,
  status text NOT NULL,
  language text,
  reason text,
  content text,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  motor_id uuid NOT NULL REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  root_id uuid,
  previous_id uuid REFERENCES public.cognitive_knowledge(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  kind text NOT NULL DEFAULT 'fact',
  status text NOT NULL DEFAULT 'active',
  validation text NOT NULL DEFAULT 'unverified',
  visibility text NOT NULL DEFAULT 'motor',
  learned_how text,
  keywords text[] NOT NULL DEFAULT '{}',
  related_ids uuid[] NOT NULL DEFAULT '{}',
  conflicts_with uuid[] NOT NULL DEFAULT '{}',
  search tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  knowledge_id uuid NOT NULL REFERENCES public.cognitive_knowledge(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.cognitive_messages(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.cognitive_documents(id) ON DELETE SET NULL,
  file_path text,
  excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  motor_id uuid NOT NULL REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  stage text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_memory_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  motor_id uuid NOT NULL REFERENCES public.cognitive_motors(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.cognitive_messages(id) ON DELETE SET NULL,
  query text NOT NULL,
  knowledge_ids uuid[] NOT NULL DEFAULT '{}',
  global_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ grants ============
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
GRANT ALL ON
  public.projects, public.api_connections, public.repositories, public.chats, public.chat_messages, public.agent_sessions,
  public.agent_plans, public.agent_jobs, public.agent_job_checkpoints, public.agent_events, public.audit_logs, public.checkpoints,
  public.development_logs, public.development_tasks, public.file_changes, public.project_memory, public.repository_snapshots,
  public.test_results, public.preview_sessions, public.preview_logs, public.deployments, public.deployment_logs,
  public.deployment_domains, public.publications, public.publication_releases, public.site_records, public.migration_history,
  public.cognitive_motors, public.cognitive_motor_settings, public.cognitive_conversations, public.cognitive_messages,
  public.cognitive_documents, public.cognitive_file_contents, public.cognitive_knowledge, public.cognitive_knowledge_sources,
  public.cognitive_learning_events, public.cognitive_memory_index
  TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.agent_events_id_seq TO service_role;

-- ============ RLS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','api_connections','repositories','chats','chat_messages','agent_sessions','agent_plans',
    'agent_jobs','agent_job_checkpoints','agent_events','audit_logs','checkpoints','development_logs','development_tasks',
    'file_changes','project_memory','repository_snapshots','test_results','preview_sessions','preview_logs','deployments',
    'deployment_logs','deployment_domains','publications','publication_releases','site_records','migration_history',
    'cognitive_motors','cognitive_motor_settings','cognitive_conversations','cognitive_messages','cognitive_documents',
    'cognitive_file_contents','cognitive_knowledge','cognitive_knowledge_sources','cognitive_learning_events','cognitive_memory_index']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['projects','api_connections','repositories','chats','chat_messages','agent_sessions','agent_plans',
    'agent_jobs','agent_job_checkpoints','agent_events','audit_logs','checkpoints','development_logs','development_tasks',
    'file_changes','project_memory','repository_snapshots','test_results','preview_sessions','preview_logs','deployments',
    'deployment_logs','deployment_domains','publications','publication_releases','site_records',
    'cognitive_motors','cognitive_motor_settings','cognitive_conversations','cognitive_messages','cognitive_documents',
    'cognitive_file_contents','cognitive_knowledge','cognitive_knowledge_sources','cognitive_learning_events','cognitive_memory_index']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t || '_select_own', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['projects','repositories','chats','chat_messages','agent_sessions','audit_logs','checkpoints',
    'development_logs','development_tasks','file_changes','project_memory','repository_snapshots','test_results',
    'preview_sessions','preview_logs','deployments','deployment_logs','deployment_domains','publications','publication_releases',
    'cognitive_motors','cognitive_motor_settings','cognitive_conversations','cognitive_messages','cognitive_documents',
    'cognitive_file_contents','cognitive_knowledge','cognitive_knowledge_sources','cognitive_learning_events','cognitive_memory_index']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t || '_update_own', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['projects','repositories','chats','chat_messages','audit_logs','checkpoints','development_logs',
    'development_tasks','file_changes','project_memory','repository_snapshots','test_results','preview_sessions','preview_logs',
    'deployments','deployment_logs','deployment_domains','publications','publication_releases','site_records']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t || '_delete_own', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['chats','checkpoints','development_tasks','file_changes','project_memory']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.owns_project(project_id))', t || '_insert_own', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['audit_logs','development_logs','repository_snapshots','test_results']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (project_id IS NULL OR public.owns_project(project_id)))', t || '_insert_own', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['projects','chat_messages','preview_sessions','preview_logs','deployments','deployment_logs',
    'deployment_domains','publications','publication_releases','cognitive_motors','cognitive_knowledge_sources']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', t || '_insert_own', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['cognitive_motor_settings','cognitive_conversations','cognitive_messages','cognitive_documents',
    'cognitive_file_contents','cognitive_knowledge','cognitive_learning_events','cognitive_memory_index']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.owns_cognitive_motor(motor_id))', t || '_insert_own', t);
  END LOOP;
END $$;

CREATE POLICY "repositories_insert_own" ON public.repositories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (project_id IS NULL OR public.owns_project(project_id)));

-- ============ updated_at triggers ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','projects','api_connections','repositories','chats','agent_jobs','audit_logs',
    'development_tasks','project_memory','publications','site_records','cognitive_motors','cognitive_motor_settings',
    'cognitive_conversations','cognitive_documents','cognitive_knowledge']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_set_updated_at', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_cognitive_motor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cognitive_motor_settings (motor_id, user_id) VALUES (NEW.id, NEW.user_id) ON CONFLICT (motor_id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_cognitive_motor() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER cognitive_motors_settings AFTER INSERT ON public.cognitive_motors FOR EACH ROW EXECUTE FUNCTION public.handle_new_cognitive_motor();

CREATE OR REPLACE FUNCTION public.cognitive_knowledge_search_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search :=
    setweight(to_tsvector('portuguese', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', array_to_string(COALESCE(NEW.keywords, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END; $$;
CREATE TRIGGER cognitive_knowledge_search BEFORE INSERT OR UPDATE OF title, content, keywords ON public.cognitive_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.cognitive_knowledge_search_update();

-- ============ indexes ============
CREATE INDEX ON public.projects (user_id, last_activity_at DESC);
CREATE INDEX ON public.chats (project_id);
CREATE INDEX ON public.chats (user_id, updated_at DESC);
CREATE INDEX ON public.chat_messages (chat_id, created_at);
CREATE INDEX ON public.agent_events (chat_id, created_at);
CREATE INDEX ON public.agent_plans (chat_id, status);
CREATE INDEX ON public.agent_jobs (status, available_at);
CREATE INDEX ON public.agent_job_checkpoints (job_id, sequence DESC);
CREATE INDEX ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX ON public.checkpoints (project_id, status, created_at DESC);
CREATE INDEX ON public.development_tasks (project_id, status);
CREATE INDEX ON public.development_logs (project_id, created_at DESC);
CREATE INDEX ON public.file_changes (project_id, created_at DESC);
CREATE INDEX ON public.project_memory (project_id);
CREATE INDEX ON public.repositories (project_id);
CREATE INDEX ON public.test_results (user_id, created_at DESC);
CREATE INDEX ON public.site_records (repository_id, collection, created_at DESC);
CREATE INDEX ON public.publication_releases (publication_id);
CREATE INDEX ON public.cognitive_conversations (motor_id);
CREATE INDEX ON public.cognitive_messages (conversation_id, created_at);
CREATE INDEX ON public.cognitive_documents (motor_id);
CREATE INDEX ON public.cognitive_file_contents (document_id);
CREATE INDEX ON public.cognitive_knowledge (motor_id, status);
CREATE INDEX ON public.cognitive_knowledge USING gin (search);
CREATE INDEX ON public.cognitive_learning_events (motor_id, created_at DESC);

-- ============ RPCs: agent lock ============
CREATE OR REPLACE FUNCTION public.acquire_agent_lock(_chat_id uuid, _stale_seconds integer DEFAULT 60)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_project uuid; v_token text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT project_id INTO v_project FROM public.chats WHERE id = _chat_id AND user_id = v_uid;
  IF v_project IS NULL THEN RAISE EXCEPTION 'chat not found'; END IF;
  INSERT INTO public.agent_sessions (chat_id, project_id, user_id, status, lock_token, started_at, heartbeat_at, ended_at)
  VALUES (_chat_id, v_project, v_uid, 'running', gen_random_uuid()::text, now(), now(), NULL)
  ON CONFLICT (chat_id) DO UPDATE
    SET status = 'running', lock_token = EXCLUDED.lock_token, started_at = now(), heartbeat_at = now(), ended_at = NULL
    WHERE public.agent_sessions.status <> 'running'
       OR public.agent_sessions.heartbeat_at < now() - make_interval(secs => GREATEST(COALESCE(_stale_seconds, 60), 5))
  RETURNING lock_token INTO v_token;
  RETURN v_token;
END; $$;

CREATE OR REPLACE FUNCTION public.release_agent_lock(_chat_id uuid, _token text, _status text DEFAULT 'idle')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_sessions
     SET status = CASE WHEN COALESCE(_status, 'idle') = 'running' THEN 'idle' ELSE COALESCE(_status, 'idle') END,
         lock_token = NULL, ended_at = now(), heartbeat_at = now()
   WHERE chat_id = _chat_id AND lock_token = _token AND user_id = auth.uid();
END; $$;

-- ============ RPCs: plan approval ============
CREATE OR REPLACE FUNCTION public.approve_agent_plan(_plan_id uuid, _expected_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan public.agent_plans; v_job uuid;
BEGIN
  SELECT * INTO v_plan FROM public.agent_plans WHERE id = _plan_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;
  IF v_plan.status <> 'pending' THEN RAISE EXCEPTION 'Este plano não está mais pendente'; END IF;
  IF v_plan.plan_hash <> _expected_hash THEN RAISE EXCEPTION 'O plano mudou; recarregue antes de aprovar'; END IF;
  UPDATE public.agent_plans SET status = 'approved', approved_at = now() WHERE id = _plan_id;
  INSERT INTO public.agent_jobs (user_id, project_id, chat_id, plan_id, status)
  VALUES (v_plan.user_id, v_plan.project_id, v_plan.chat_id, v_plan.id, 'queued')
  RETURNING id INTO v_job;
  RETURN v_job;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_agent_plan(_plan_id uuid, _expected_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_plans SET status = 'rejected'
   WHERE id = _plan_id AND user_id = auth.uid() AND status = 'pending' AND plan_hash = _expected_hash;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.request_agent_job_cancel(_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_jobs
     SET cancel_requested_at = COALESCE(cancel_requested_at, now()),
         status = CASE WHEN status IN ('queued', 'retry_wait') THEN 'cancelled' ELSE status END,
         finished_at = CASE WHEN status IN ('queued', 'retry_wait') THEN now() ELSE finished_at END,
         updated_at = now()
   WHERE id = _job_id AND user_id = auth.uid();
  RETURN FOUND;
END; $$;

-- ============ RPCs: external worker (service role only) ============
CREATE OR REPLACE FUNCTION public.claim_agent_job_v2(_worker_id text, _stale_seconds integer DEFAULT 120)
RETURNS SETOF public.agent_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH c AS (
    SELECT id FROM public.agent_jobs
     WHERE cancel_requested_at IS NULL AND attempts < max_attempts
       AND ((status IN ('queued', 'retry_wait') AND available_at <= now())
         OR (status = 'running' AND heartbeat_at < now() - make_interval(secs => GREATEST(COALESCE(_stale_seconds, 120), 5))))
     ORDER BY available_at, created_at
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.agent_jobs j
     SET status = 'running', worker_id = _worker_id, attempts = j.attempts + 1, lease_generation = j.lease_generation + 1,
         started_at = COALESCE(j.started_at, now()), heartbeat_at = now(), finished_at = NULL, updated_at = now()
    FROM c WHERE j.id = c.id
  RETURNING j.*;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_agent_job(_worker_id text, _stale_seconds integer DEFAULT 120)
RETURNS SETOF public.agent_jobs LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.claim_agent_job_v2(_worker_id, _stale_seconds);
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_agent_job_v2(_job_id uuid, _worker_id text, _lease_generation integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_jobs SET heartbeat_at = now(), updated_at = now()
   WHERE id = _job_id AND worker_id = _worker_id AND lease_generation = _lease_generation
     AND status = 'running' AND cancel_requested_at IS NULL;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.heartbeat_agent_job(_job_id uuid, _worker_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_jobs SET heartbeat_at = now(), updated_at = now()
   WHERE id = _job_id AND worker_id = _worker_id AND status = 'running' AND cancel_requested_at IS NULL;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.finish_agent_job_v2(_job_id uuid, _worker_id text, _lease_generation integer, _status text,
  _last_error text DEFAULT NULL, _available_at timestamptz DEFAULT NULL, _checkpoint_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _status NOT IN ('completed', 'failed', 'cancelled', 'retry_wait') THEN RAISE EXCEPTION 'invalid status %', _status; END IF;
  UPDATE public.agent_jobs
     SET status = _status,
         last_error = _last_error,
         available_at = COALESCE(_available_at, available_at),
         checkpoint_id = COALESCE(_checkpoint_id, checkpoint_id),
         finished_at = CASE WHEN _status = 'retry_wait' THEN NULL ELSE now() END,
         worker_id = CASE WHEN _status = 'retry_wait' THEN NULL ELSE worker_id END,
         updated_at = now()
   WHERE id = _job_id AND worker_id = _worker_id AND lease_generation = _lease_generation AND status = 'running';
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.finish_agent_job(_job_id uuid, _worker_id text, _status text,
  _last_error text DEFAULT NULL, _available_at timestamptz DEFAULT NULL, _checkpoint_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gen integer;
BEGIN
  SELECT lease_generation INTO v_gen FROM public.agent_jobs WHERE id = _job_id;
  RETURN public.finish_agent_job_v2(_job_id, _worker_id, v_gen, _status, _last_error, _available_at, _checkpoint_id);
END; $$;

CREATE OR REPLACE FUNCTION public.save_agent_job_checkpoint(_job_id uuid, _worker_id text, _lease_generation integer,
  _sequence integer, _step_id text, _state jsonb, _state_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.agent_jobs; v_id uuid;
BEGIN
  SELECT * INTO v_job FROM public.agent_jobs
   WHERE id = _job_id AND worker_id = _worker_id AND lease_generation = _lease_generation AND status = 'running' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lease lost'; END IF;
  INSERT INTO public.agent_job_checkpoints (job_id, user_id, lease_generation, sequence, step_id, state, state_hash)
  VALUES (_job_id, v_job.user_id, _lease_generation, _sequence, _step_id, COALESCE(_state, '{}'::jsonb), _state_hash)
  RETURNING id INTO v_id;
  UPDATE public.agent_jobs SET checkpoint_id = v_id, heartbeat_at = now(), updated_at = now() WHERE id = _job_id;
  RETURN v_id;
END; $$;

-- ============ RPCs: publishing ============
CREATE OR REPLACE FUNCTION public.get_published_site(_slug text)
RETURNS TABLE (html text, release_number integer, commit_sha text, activated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.artifact_html, r.release_number, r.commit_sha, r.activated_at
    FROM public.publications p
    JOIN public.publication_releases r ON r.id = p.active_release_id
   WHERE p.slug = _slug AND p.status <> 'disabled' AND r.artifact_html IS NOT NULL
   LIMIT 1;
$$;

-- ============ RPCs: knowledge search ============
CREATE OR REPLACE FUNCTION public.search_cognitive_knowledge(_motor_id uuid, _query text, _include_global boolean, _limit integer DEFAULT 12)
RETURNS TABLE (id uuid, motor_id uuid, motor_name text, title text, content text, category text, kind text,
  validation text, version integer, visibility text, is_global boolean, rank real)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE q tsquery; qt text;
BEGIN
  qt := replace(plainto_tsquery('portuguese', left(COALESCE(_query, ''), 4000))::text, '&', '|');
  IF qt IS NULL OR btrim(qt) = '' THEN RETURN; END IF;
  q := qt::tsquery;
  RETURN QUERY
  SELECT k.id, k.motor_id, m.name, k.title, k.content, k.category, k.kind, k.validation, k.version, k.visibility,
         (k.motor_id <> _motor_id) AS is_global, ts_rank(k.search, q) AS rank
    FROM public.cognitive_knowledge k
    JOIN public.cognitive_motors m ON m.id = k.motor_id
   WHERE k.status = 'active'
     AND k.search @@ q
     AND (k.motor_id = _motor_id OR (_include_global AND k.visibility = 'global'))
   ORDER BY 12 DESC, k.updated_at DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 12), 1), 50);
END; $$;

-- ============ RPCs: installation status ============
CREATE OR REPLACE FUNCTION public.devstudio_schema_status()
RETURNS TABLE (table_name text, exists_flag boolean, rls_enabled boolean, policy_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.name,
         c.oid IS NOT NULL,
         COALESCE(c.relrowsecurity, false),
         (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.name)
    FROM unnest(ARRAY['profiles','projects','api_connections','repositories','chats','chat_messages','agent_sessions','agent_plans',
      'agent_jobs','agent_job_checkpoints','agent_events','audit_logs','checkpoints','development_logs','development_tasks',
      'file_changes','project_memory','repository_snapshots','test_results','preview_sessions','preview_logs','deployments',
      'deployment_logs','deployment_domains','publications','publication_releases','site_records','migration_history',
      'cognitive_motors','cognitive_motor_settings','cognitive_conversations','cognitive_messages','cognitive_documents',
      'cognitive_file_contents','cognitive_knowledge','cognitive_knowledge_sources','cognitive_learning_events','cognitive_memory_index']) AS t(name)
    LEFT JOIN pg_class c ON c.relname = t.name AND c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
   ORDER BY t.name;
$$;

CREATE OR REPLACE FUNCTION public.devstudio_installed_version()
RETURNS TABLE (version text, name text, applied_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT version, name, applied_at FROM public.migration_history ORDER BY applied_at DESC;
$$;

INSERT INTO public.migration_history (version, name, description)
VALUES ('0.17.0', 'wlc_ia_base_schema', 'Base schema rebuilt in Lovable Cloud from the WLC.IA app');

-- ============ function privileges ============
REVOKE EXECUTE ON FUNCTION
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

-- ============ realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events, public.agent_sessions, public.chat_messages, public.agent_plans;