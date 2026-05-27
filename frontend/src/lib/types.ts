// Mirror configuration types

export interface Mirror {
  name: string;
  desc: string;
  url: string;
  help_url?: string;
  category?: string;
  is_master?: boolean;
  status?: string;
  last_update?: string;
  size?: string;
}

export interface SyncStatus {
  updated_at: string;
  version: string;
  mirrors: SyncMirrorResult[];
}

export interface SyncMirrorResult {
  name: string;
  status: "success" | "failed" | "skipped" | "pending";
  size?: string;
  duration?: string;
  error?: string;
  timestamp: string;
  last_update?: string;
}

export interface HelpDoc {
  mirrorid: string;
  title: string;
  content: string;
}

export interface NewsItem {
  title: string;
  date: string;
  content: string;
  author?: string;
  slug: string;
}
