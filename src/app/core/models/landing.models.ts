export interface LandingSummary {
  file: string;
  number: number;
  sections: number;
  modifiedAt?: string;
  error?: string;
}

export interface MediaRef {
  key: string;
  url: string;
}

export interface SectionSummary {
  file: string;
  sectionIndex: number;
  component: string;
  id: string;
  title: string;
  classes: string[];
  media: MediaRef[];
  previewImage: string;
  banners: number;
  units?: SectionUnitSummary[];
}

export interface SectionUnitSummary {
  type: string;
  hasImage: boolean;
  hasVideo: boolean;
  hasText: boolean;
}

export interface SectionMove {
  fromIndex: number;
  toIndex: number;
}

export interface LandingRaw {
  sections?: unknown[];
}

export interface LandingDetail {
  file: string;
  modifiedAt?: string;
  sections: SectionSummary[];
  raw: LandingRaw;
}

export interface CreateLandingResponse {
  ok: boolean;
  file: string;
  landing: LandingRaw;
}

export interface ImportLandingResponse {
  ok: boolean;
  file: string;
  sections: number;
}

export interface TplStatus {
  file: string;
  tplPath: string;
  exists: boolean;
  modifiedAt?: string;
  classes: string[];
  missing: string[];
  css?: string;
  themeCss?: string;
  themeCssModifiedAt?: string;
  themeCssPath?: string;
}

export interface FileStamps {
  file: string;
  modifiedAt: string;
  tplPath: string;
  tplModifiedAt: string;
  themeCssModifiedAt: string;
}

export interface DeleteModal {
  type: 'landing' | 'section';
  title: string;
  body: string;
  target: string;
  sectionIndex?: number;
}

export interface CreateLandingRequest {
  number: string;
  slug: string;
}

export interface AppendIdChange {
  key: string;
  value: string;
}

export type AppTheme = 'light' | 'dark' | 'forest' | 'ocean' | 'cyberpunk' | 'eye-care';

export interface AppThemeOption {
  label: string;
  value: AppTheme;
}
