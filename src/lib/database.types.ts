import type { Price, Spot, Article, Metal } from "./domain";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type SubscriptionRow = {
  id: string;
  device_hash: string;
  endpoint_hash: string;
  encrypted_subscription: string;
  created_at: string;
  updated_at: string;
};
export type PreferenceRow = {
  subscription_id: string;
  metals: Metal[];
  daily: boolean;
  consent_at: string;
  consent_version: string;
};
export type DeliveryRow = {
  id: string;
  subscription_id: string;
  publication_date: string;
  kind: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  received_at: string | null;
  receipt_hash: string | null;
  provider_status: number | null;
};
export type SourceRow = {
  id: string;
  name: string;
  url: string;
  category: string;
  terms_url: string;
  permission_note: string;
  enabled: boolean;
  last_status: string;
  last_checked_at: string | null;
  created_at: string;
};
export type Database = {
  public: {
    Tables: {
      currencies: Table<{ code: string; name: string }>;
      countries: Table<{ code: string; name: string; currency: string }>;
      metals: Table<{ code: Metal; name: string }>;
      admin_users: Table<{ user_id: string; created_at: string }>;
      price_observations: Table<
        Price & {
          country: "NP";
          currency: "NPR";
          unit: "tola";
          verified_by: string;
        }
      >;
      spot_cache: Table<Spot>;
      spot_history: Table<Omit<Spot, "id" | "fetched_at">>;
      news_sources: Table<SourceRow>;
      news_articles: Table<
        Article & { source_id: string; enabled: boolean; fetched_at: string }
      >;
      push_subscriptions: Table<SubscriptionRow>;
      notification_preferences: Table<PreferenceRow>;
      notification_deliveries: Table<DeliveryRow>;
      ingestion_logs: Table<{
        id: number;
        source: string;
        status: string;
        message: string;
        created_at: string;
      }>;
      admin_audit: Table<{
        id: number;
        actor: string;
        action: string;
        record_id: string;
        before_data: Json | null;
        after_data: Json | null;
        reason: string;
        created_at: string;
      }>;
      rate_limits: Table<{ key: string; window_start: string; count: number }>;
      job_locks: Table<{ name: string; locked_until: string; owner: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      latest_nepal_rates: { Args: Record<string, never>; Returns: Price[] };
      pending_daily_subscriptions: {
        Args: { p_date: string; p_limit: number };
        Returns: {
          id: string;
          encrypted_subscription: string;
          metals: Metal[];
        }[];
      };
      publish_nepal_rate: {
        Args: {
          p_actor: string;
          p_metal: string;
          p_amount: number;
          p_publication_date: string;
          p_published_at: string;
          p_source_url: string;
          p_reason: string;
        };
        Returns: string;
      };
      consume_limit: {
        Args: { p_key: string; p_max: number; p_seconds: number };
        Returns: boolean;
      };
      acquire_job: {
        Args: { p_name: string; p_owner: string; p_seconds: number };
        Returns: boolean;
      };
      save_subscription: {
        Args: {
          p_device: string;
          p_endpoint: string;
          p_encrypted: string;
          p_metals: Metal[];
          p_daily: boolean;
        };
        Returns: string;
      };
      save_news_source: {
        Args: {
          p_actor: string;
          p_name: string;
          p_url: string;
          p_category: string;
          p_terms_url: string;
          p_permission: string;
          p_enabled: boolean;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
