export type HelpCategory =
  | 'inicio'
  | 'cadastros'
  | 'rotina_pedagogica'
  | 'recursos_agenda'
  | 'rh'
  | 'analise_acompanhamento'
  | 'comunicacao'
  | 'compartilhamento_externo'
  | 'sistema'
  | 'conta';

export type HelpAudience = 'admin_coord_rh' | 'admin_coord' | 'admin_coord_prof';

export type HelpContentType = 'video_upload' | 'video_link' | 'pdf' | 'image' | 'link';

export interface HelpTutorial {
  id: string;
  organization_id: string;
  category: HelpCategory;
  feature_name: string;
  title: string;
  description: string;
  content_type: HelpContentType;
  content_url: string | null;
  storage_path: string | null;
  file_mime: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  cover_color: string;
  cover_icon: string;
  audience: HelpAudience;
  is_featured: boolean;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HelpTutorialView {
  id: string;
  tutorial_id: string;
  user_id: string;
  progress_seconds: number;
  completed: boolean;
  first_viewed_at: string;
  last_viewed_at: string;
}
