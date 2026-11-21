export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_events: {
        Row: {
          chat_id: string
          created_at: string
          detail: Json
          event_type: string
          id: number
          job_id: string | null
          project_id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          detail?: Json
          event_type: string
          id?: number
          job_id?: string | null
          project_id: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          detail?: Json
          event_type?: string
          id?: number
          job_id?: string | null
          project_id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_job_checkpoints: {
        Row: {
          created_at: string
          id: string
          job_id: string
          lease_generation: number
          sequence: number
          state: Json
          state_hash: string
          step_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          lease_generation: number
          sequence: number
          state?: Json
          state_hash: string
          step_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          lease_generation?: number
          sequence?: number
          state?: Json
          state_hash?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_job_checkpoints_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_jobs: {
        Row: {
          attempts: number
          available_at: string
          cancel_requested_at: string | null
          chat_id: string
          checkpoint_id: string | null
          created_at: string
          finished_at: string | null
          heartbeat_at: string | null
          id: string
          last_error: string | null
          lease_generation: number
          max_attempts: number
          plan_id: string
          project_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          available_at?: string
          cancel_requested_at?: string | null
          chat_id: string
          checkpoint_id?: string | null
          created_at?: string
          finished_at?: string | null
          heartbeat_at?: string | null
          id?: string
          last_error?: string | null
          lease_generation?: number
          max_attempts?: number
          plan_id: string
          project_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          available_at?: string
          cancel_requested_at?: string | null
          chat_id?: string
          checkpoint_id?: string | null
          created_at?: string
          finished_at?: string | null
          heartbeat_at?: string | null
          id?: string
          last_error?: string | null
          lease_generation?: number
          max_attempts?: number
          plan_id?: string
          project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "agent_job_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "agent_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_plans: {
        Row: {
          approved_at: string | null
          chat_id: string
          created_at: string
          goal: string
          id: string
          plan: Json
          plan_hash: string
          project_id: string
          status: string
          user_id: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          chat_id: string
          created_at?: string
          goal: string
          id?: string
          plan: Json
          plan_hash: string
          project_id: string
          status?: string
          user_id: string
          version: number
        }
        Update: {
          approved_at?: string | null
          chat_id?: string
          created_at?: string
          goal?: string
          id?: string
          plan?: Json
          plan_hash?: string
          project_id?: string
          status?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_plans_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          api_connection_id: string | null
          chat_id: string
          ended_at: string | null
          heartbeat_at: string
          id: string
          lock_token: string | null
          project_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          api_connection_id?: string | null
          chat_id: string
          ended_at?: string | null
          heartbeat_at?: string
          id?: string
          lock_token?: string | null
          project_id: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Update: {
          api_connection_id?: string | null
          chat_id?: string
          ended_at?: string | null
          heartbeat_at?: string
          id?: string
          lock_token?: string | null
          project_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_api_connection_id_fkey"
            columns: ["api_connection_id"]
            isOneToOne: false
            referencedRelation: "api_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: true
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_connections: {
        Row: {
          created_at: string
          google_project: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          last_error: string | null
          last_tested_at: string | null
          metadata: Json
          model: string | null
          name: string
          provider: string
          quota_exceeded_at: string | null
          secret_ciphertext: string
          secret_hint: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_project?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          last_error?: string | null
          last_tested_at?: string | null
          metadata?: Json
          model?: string | null
          name: string
          provider: string
          quota_exceeded_at?: string | null
          secret_ciphertext: string
          secret_hint?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          google_project?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          last_error?: string | null
          last_tested_at?: string | null
          metadata?: Json
          model?: string | null
          name?: string
          provider?: string
          quota_exceeded_at?: string | null
          secret_ciphertext?: string
          secret_hint?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          agent: string
          change_summary: string | null
          chat_id: string | null
          commit_sha: string | null
          created_at: string
          evidence: Json
          file_path: string | null
          id: string
          operation: string
          project_id: string | null
          result: string | null
          status: string
          tests: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          agent?: string
          change_summary?: string | null
          chat_id?: string | null
          commit_sha?: string | null
          created_at?: string
          evidence?: Json
          file_path?: string | null
          id?: string
          operation: string
          project_id?: string | null
          result?: string | null
          status?: string
          tests?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          agent?: string
          change_summary?: string | null
          chat_id?: string | null
          commit_sha?: string | null
          created_at?: string
          evidence?: Json
          file_path?: string | null
          id?: string
          operation?: string
          project_id?: string | null
          result?: string | null
          status?: string
          tests?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          chat_id: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          tool_calls?: Json | null
          user_id?: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          tool_calls?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          branch: string | null
          created_at: string
          id: string
          model: string
          project_id: string
          repository_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          id?: string
          model: string
          project_id: string
          repository_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          id?: string
          model?: string
          project_id?: string
          repository_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          api_connection_id: string | null
          branch: string | null
          chat_id: string | null
          created_at: string
          errors: Json
          head_sha: string | null
          id: string
          last_operation: string | null
          modified_files: Json
          pending_tasks: Json
          project_id: string
          reason: string
          repo_full_name: string | null
          resumed_at: string | null
          state: Json
          status: string
          user_id: string
        }
        Insert: {
          api_connection_id?: string | null
          branch?: string | null
          chat_id?: string | null
          created_at?: string
          errors?: Json
          head_sha?: string | null
          id?: string
          last_operation?: string | null
          modified_files?: Json
          pending_tasks?: Json
          project_id: string
          reason?: string
          repo_full_name?: string | null
          resumed_at?: string | null
          state?: Json
          status?: string
          user_id?: string
        }
        Update: {
          api_connection_id?: string | null
          branch?: string | null
          chat_id?: string | null
          created_at?: string
          errors?: Json
          head_sha?: string | null
          id?: string
          last_operation?: string | null
          modified_files?: Json
          pending_tasks?: Json
          project_id?: string
          reason?: string
          repo_full_name?: string | null
          resumed_at?: string | null
          state?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoints_api_connection_id_fkey"
            columns: ["api_connection_id"]
            isOneToOne: false
            referencedRelation: "api_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkpoints_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkpoints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_conversations: {
        Row: {
          created_at: string
          id: string
          motor_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motor_id: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          motor_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_conversations_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_documents: {
        Row: {
          analysis: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          file_count: number
          id: string
          kind: string
          motor_id: string
          name: string
          processed_count: number
          size_bytes: number
          skipped_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          file_count?: number
          id?: string
          kind: string
          motor_id: string
          name: string
          processed_count?: number
          size_bytes?: number
          skipped_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          analysis?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          file_count?: number
          id?: string
          kind?: string
          motor_id?: string
          name?: string
          processed_count?: number
          size_bytes?: number
          skipped_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_documents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "cognitive_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_documents_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_file_contents: {
        Row: {
          content: string | null
          created_at: string
          document_id: string
          id: string
          language: string | null
          motor_id: string
          path: string
          reason: string | null
          size_bytes: number
          status: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          language?: string | null
          motor_id: string
          path: string
          reason?: string | null
          size_bytes?: number
          status: string
          user_id?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          language?: string | null
          motor_id?: string
          path?: string
          reason?: string | null
          size_bytes?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_file_contents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "cognitive_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_file_contents_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_knowledge: {
        Row: {
          category: string
          conflicts_with: string[]
          content: string
          created_at: string
          id: string
          keywords: string[]
          kind: string
          learned_how: string | null
          motor_id: string
          previous_id: string | null
          related_ids: string[]
          root_id: string | null
          search: unknown
          status: string
          title: string
          updated_at: string
          user_id: string
          validation: string
          version: number
          visibility: string
        }
        Insert: {
          category?: string
          conflicts_with?: string[]
          content: string
          created_at?: string
          id?: string
          keywords?: string[]
          kind?: string
          learned_how?: string | null
          motor_id: string
          previous_id?: string | null
          related_ids?: string[]
          root_id?: string | null
          search?: unknown
          status?: string
          title: string
          updated_at?: string
          user_id?: string
          validation?: string
          version?: number
          visibility?: string
        }
        Update: {
          category?: string
          conflicts_with?: string[]
          content?: string
          created_at?: string
          id?: string
          keywords?: string[]
          kind?: string
          learned_how?: string | null
          motor_id?: string
          previous_id?: string | null
          related_ids?: string[]
          root_id?: string | null
          search?: unknown
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          validation?: string
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_knowledge_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_knowledge_previous_id_fkey"
            columns: ["previous_id"]
            isOneToOne: false
            referencedRelation: "cognitive_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_knowledge_sources: {
        Row: {
          created_at: string
          document_id: string | null
          excerpt: string | null
          file_path: string | null
          id: string
          knowledge_id: string
          message_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          excerpt?: string | null
          file_path?: string | null
          id?: string
          knowledge_id: string
          message_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          excerpt?: string | null
          file_path?: string | null
          id?: string
          knowledge_id?: string
          message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_knowledge_sources_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "cognitive_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_knowledge_sources_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "cognitive_knowledge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_knowledge_sources_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "cognitive_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_learning_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          motor_id: string
          stage: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          motor_id: string
          stage: string
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          motor_id?: string
          stage?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_learning_events_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_memory_index: {
        Row: {
          created_at: string
          global_ids: string[]
          id: string
          knowledge_ids: string[]
          message_id: string | null
          motor_id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          global_ids?: string[]
          id?: string
          knowledge_ids?: string[]
          message_id?: string | null
          motor_id: string
          query: string
          user_id?: string
        }
        Update: {
          created_at?: string
          global_ids?: string[]
          id?: string
          knowledge_ids?: string[]
          message_id?: string | null
          motor_id?: string
          query?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_memory_index_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "cognitive_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_memory_index_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          document_ids: string[]
          id: string
          metadata: Json
          motor_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          document_ids?: string[]
          id?: string
          metadata?: Json
          motor_id: string
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          document_ids?: string[]
          id?: string
          metadata?: Json
          motor_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "cognitive_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitive_messages_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_motor_settings: {
        Row: {
          motor_id: string
          share_new_knowledge: boolean
          updated_at: string
          use_global_knowledge: boolean
          user_id: string
        }
        Insert: {
          motor_id: string
          share_new_knowledge?: boolean
          updated_at?: string
          use_global_knowledge?: boolean
          user_id?: string
        }
        Update: {
          motor_id?: string
          share_new_knowledge?: boolean
          updated_at?: string
          use_global_knowledge?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cognitive_motor_settings_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: true
            referencedRelation: "cognitive_motors"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_motors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_activity_at: string
          last_learning_at: string | null
          name: string
          slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_activity_at?: string
          last_learning_at?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_activity_at?: string
          last_learning_at?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deployment_domains: {
        Row: {
          created_at: string
          id: string
          repository_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          repository_id: string
          url: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          repository_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_domains_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: true
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_logs: {
        Row: {
          created_at: string
          deployment_id: string
          id: string
          level: string
          message: string
          step: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployment_id: string
          id?: string
          level?: string
          message: string
          step: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deployment_id?: string
          id?: string
          level?: string
          message?: string
          step?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_logs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          branch: string
          commit_message: string | null
          commit_sha: string
          created_at: string
          finished_at: string | null
          health_status: number | null
          id: string
          repository_id: string
          rolled_back_from: string | null
          status: string
          target_url: string | null
          user_id: string
        }
        Insert: {
          branch: string
          commit_message?: string | null
          commit_sha: string
          created_at?: string
          finished_at?: string | null
          health_status?: number | null
          id?: string
          repository_id: string
          rolled_back_from?: string | null
          status?: string
          target_url?: string | null
          user_id?: string
        }
        Update: {
          branch?: string
          commit_message?: string | null
          commit_sha?: string
          created_at?: string
          finished_at?: string | null
          health_status?: number | null
          id?: string
          repository_id?: string
          rolled_back_from?: string | null
          status?: string
          target_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      development_logs: {
        Row: {
          chat_id: string | null
          created_at: string
          details: Json
          id: string
          level: string
          message: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          level?: string
          message: string
          project_id?: string | null
          user_id?: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          level?: string
          message?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_logs_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      development_tasks: {
        Row: {
          chat_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          payload: Json
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          chat_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_tasks_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      file_changes: {
        Row: {
          change_type: string
          chat_id: string | null
          commit_sha: string | null
          created_at: string
          diff_summary: string | null
          file_path: string
          id: string
          new_sha: string | null
          previous_sha: string | null
          project_id: string
          repository_id: string | null
          user_id: string
        }
        Insert: {
          change_type: string
          chat_id?: string | null
          commit_sha?: string | null
          created_at?: string
          diff_summary?: string | null
          file_path: string
          id?: string
          new_sha?: string | null
          previous_sha?: string | null
          project_id: string
          repository_id?: string | null
          user_id?: string
        }
        Update: {
          change_type?: string
          chat_id?: string | null
          commit_sha?: string | null
          created_at?: string
          diff_summary?: string | null
          file_path?: string
          id?: string
          new_sha?: string | null
          previous_sha?: string | null
          project_id?: string
          repository_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_changes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_changes_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_history: {
        Row: {
          applied_at: string
          description: string | null
          id: string
          name: string
          version: string
        }
        Insert: {
          applied_at?: string
          description?: string | null
          id?: string
          name: string
          version: string
        }
        Update: {
          applied_at?: string
          description?: string | null
          id?: string
          name?: string
          version?: string
        }
        Relationships: []
      }
      preview_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          session_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "preview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_sessions: {
        Row: {
          branch: string
          commit_sha: string | null
          created_at: string
          entry_path: string | null
          framework: string
          id: string
          repository_id: string
          status: string
          user_id: string
        }
        Insert: {
          branch: string
          commit_sha?: string | null
          created_at?: string
          entry_path?: string | null
          framework?: string
          id?: string
          repository_id: string
          status?: string
          user_id?: string
        }
        Update: {
          branch?: string
          commit_sha?: string | null
          created_at?: string
          entry_path?: string | null
          framework?: string
          id?: string
          repository_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_sessions_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_memory: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          project_id: string
          source_chat_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          project_id: string
          source_chat_id?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          project_id?: string
          source_chat_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memory_source_chat_id_fkey"
            columns: ["source_chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          context_summary: string | null
          created_at: string
          default_model: string | null
          description: string | null
          id: string
          last_activity_at: string
          name: string
          preset: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_summary?: string | null
          created_at?: string
          default_model?: string | null
          description?: string | null
          id?: string
          last_activity_at?: string
          name: string
          preset?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          context_summary?: string | null
          created_at?: string
          default_model?: string | null
          description?: string | null
          id?: string
          last_activity_at?: string
          name?: string
          preset?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publication_releases: {
        Row: {
          activated_at: string | null
          artifact_bytes: number | null
          artifact_html: string | null
          branch: string
          commit_message: string | null
          commit_sha: string
          completed_at: string | null
          created_at: string
          error: string | null
          file_count: number | null
          framework: string | null
          id: string
          publication_id: string
          release_number: number
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          artifact_bytes?: number | null
          artifact_html?: string | null
          branch: string
          commit_message?: string | null
          commit_sha: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_count?: number | null
          framework?: string | null
          id?: string
          publication_id: string
          release_number: number
          status?: string
          user_id?: string
        }
        Update: {
          activated_at?: string | null
          artifact_bytes?: number | null
          artifact_html?: string | null
          branch?: string
          commit_message?: string | null
          commit_sha?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          file_count?: number | null
          framework?: string | null
          id?: string
          publication_id?: string
          release_number?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_releases_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          active_release_id: string | null
          created_at: string
          id: string
          repository_id: string
          slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_release_id?: string | null
          created_at?: string
          id?: string
          repository_id: string
          slug: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active_release_id?: string | null
          created_at?: string
          id?: string
          repository_id?: string
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_active_release_id_fkey"
            columns: ["active_release_id"]
            isOneToOne: false
            referencedRelation: "publication_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repositories: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          analyzed_sha: string | null
          connection_id: string | null
          created_at: string
          default_branch: string
          full_name: string
          html_url: string | null
          id: string
          is_authorized: boolean
          last_commit_sha: string | null
          last_synced_at: string | null
          name: string
          owner: string
          private: boolean
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          analyzed_sha?: string | null
          connection_id?: string | null
          created_at?: string
          default_branch?: string
          full_name: string
          html_url?: string | null
          id?: string
          is_authorized?: boolean
          last_commit_sha?: string | null
          last_synced_at?: string | null
          name: string
          owner: string
          private?: boolean
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          analyzed_sha?: string | null
          connection_id?: string | null
          created_at?: string
          default_branch?: string
          full_name?: string
          html_url?: string | null
          id?: string
          is_authorized?: boolean
          last_commit_sha?: string | null
          last_synced_at?: string | null
          name?: string
          owner?: string
          private?: boolean
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repositories_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "api_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repositories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_snapshots: {
        Row: {
          branch: string
          created_at: string
          file_count: number
          head_sha: string
          id: string
          project_id: string | null
          repository_id: string
          tree: Json
          user_id: string
        }
        Insert: {
          branch: string
          created_at?: string
          file_count?: number
          head_sha: string
          id?: string
          project_id?: string | null
          repository_id: string
          tree?: Json
          user_id?: string
        }
        Update: {
          branch?: string
          created_at?: string
          file_count?: number
          head_sha?: string
          id?: string
          project_id?: string | null
          repository_id?: string
          tree?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_snapshots_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_records: {
        Row: {
          collection: string
          created_at: string
          data: Json
          id: string
          repository_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection: string
          created_at?: string
          data?: Json
          id?: string
          repository_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection?: string
          created_at?: string
          data?: Json
          id?: string
          repository_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_records_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          details: Json
          duration_ms: number | null
          id: string
          project_id: string | null
          run_id: string
          status: string
          suite: string
          test_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          project_id?: string | null
          run_id: string
          status: string
          suite: string
          test_name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          details?: Json
          duration_ms?: number | null
          id?: string
          project_id?: string | null
          run_id?: string
          status?: string
          suite?: string
          test_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_agent_lock: {
        Args: { _chat_id: string; _stale_seconds?: number }
        Returns: string
      }
      approve_agent_plan: {
        Args: { _expected_hash: string; _plan_id: string }
        Returns: string
      }
      claim_agent_job: {
        Args: { _stale_seconds?: number; _worker_id: string }
        Returns: {
          attempts: number
          available_at: string
          cancel_requested_at: string | null
          chat_id: string
          checkpoint_id: string | null
          created_at: string
          finished_at: string | null
          heartbeat_at: string | null
          id: string
          last_error: string | null
          lease_generation: number
          max_attempts: number
          plan_id: string
          project_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_agent_job_v2: {
        Args: { _stale_seconds?: number; _worker_id: string }
        Returns: {
          attempts: number
          available_at: string
          cancel_requested_at: string | null
          chat_id: string
          checkpoint_id: string | null
          created_at: string
          finished_at: string | null
          heartbeat_at: string | null
          id: string
          last_error: string | null
          lease_generation: number
          max_attempts: number
          plan_id: string
          project_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      devstudio_installed_version: {
        Args: never
        Returns: {
          applied_at: string
          name: string
          version: string
        }[]
      }
      devstudio_schema_status: {
        Args: never
        Returns: {
          exists_flag: boolean
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      finish_agent_job: {
        Args: {
          _available_at?: string
          _checkpoint_id?: string
          _job_id: string
          _last_error?: string
          _status: string
          _worker_id: string
        }
        Returns: boolean
      }
      finish_agent_job_v2: {
        Args: {
          _available_at?: string
          _checkpoint_id?: string
          _job_id: string
          _last_error?: string
          _lease_generation: number
          _status: string
          _worker_id: string
        }
        Returns: boolean
      }
      get_published_site: {
        Args: { _slug: string }
        Returns: {
          activated_at: string
          commit_sha: string
          html: string
          release_number: number
        }[]
      }
      heartbeat_agent_job: {
        Args: { _job_id: string; _worker_id: string }
        Returns: boolean
      }
      heartbeat_agent_job_v2: {
        Args: { _job_id: string; _lease_generation: number; _worker_id: string }
        Returns: boolean
      }
      owns_cognitive_motor: { Args: { _motor_id: string }; Returns: boolean }
      owns_project: { Args: { _project_id: string }; Returns: boolean }
      reject_agent_plan: {
        Args: { _expected_hash: string; _plan_id: string }
        Returns: boolean
      }
      release_agent_lock: {
        Args: { _chat_id: string; _status?: string; _token: string }
        Returns: undefined
      }
      request_agent_job_cancel: { Args: { _job_id: string }; Returns: boolean }
      save_agent_job_checkpoint: {
        Args: {
          _job_id: string
          _lease_generation: number
          _sequence: number
          _state: Json
          _state_hash: string
          _step_id: string
          _worker_id: string
        }
        Returns: string
      }
      search_cognitive_knowledge: {
        Args: {
          _include_global: boolean
          _limit?: number
          _motor_id: string
          _query: string
        }
        Returns: {
          category: string
          content: string
          id: string
          is_global: boolean
          kind: string
          motor_id: string
          motor_name: string
          rank: number
          title: string
          validation: string
          version: number
          visibility: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
