export interface LibraryCategory {
  id: string;
  organization_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export type LibraryContentType = 'pdf' | 'image' | 'video' | 'video_link' | 'link';

export interface LibraryContent {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  category_id: string;
  formative_track_id: string | null;
  course_id: string | null;
  subject_id: string | null;
  content_type: LibraryContentType;
  content_url: string | null;
  storage_path: string | null;
  file_mime: string | null;
  file_size: number | null;
  cover_color: string;
  cover_icon: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  published_by?: string | null;
  sort_order?: number | null;
}

export interface LibraryContentWithRefs extends LibraryContent {
  category?: { id: string; name: string } | null;
  formative_track?: { id: string; name: string } | null;
  course?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
}

export interface LibraryFolder {
  id: string;
  organization_id: string;
  category_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryContentFolderLink {
  content_id: string;
  folder_id: string;
}
