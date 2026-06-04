import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  CreateLandingRequest,
  CreateLandingResponse,
  FileStamps,
  ImportLandingResponse,
  LandingDetail,
  LandingSummary,
  SectionMove,
  SectionSummary,
  TplStatus
} from '../models/landing.models';

@Injectable({ providedIn: 'root' })
export class LandingApiService {
  private readonly http = inject(HttpClient);

  public getConfig() {
    return this.http.get<{ landingRoot: string; tplRoot: string }>('/api/config');
  }

  public getLandings() {
    return this.http.get<{ landings: LandingSummary[] }>('/api/landings');
  }

  public getLanding(file: string) {
    return this.http.get<LandingDetail>(`/api/landings/${encodeURIComponent(file)}`);
  }

  public createLanding(request: CreateLandingRequest) {
    return this.http.post<CreateLandingResponse>('/api/landings', request);
  }

  public deleteLanding(file: string) {
    return this.http.delete<{ deleted: string }>(`/api/landings/${encodeURIComponent(file)}`);
  }

  public importLanding(payload: { fileName: string; targetFile: string; landing: unknown }) {
    return this.http.post<ImportLandingResponse>('/api/landings/import', payload);
  }

  public getComponents(query = '', limit = 80) {
    const params = `query=${encodeURIComponent(query)}&limit=${limit}`;
    return this.http.get<{ components: SectionSummary[] }>(`/api/components?${params}`);
  }

  public getUtilityClasses() {
    return this.http.get<{ classes: string[] }>('/api/utility-classes');
  }

  public getUnitCustomProperties() {
    return this.http.get<{ properties: Record<'text' | 'card' | 'banner', string[]> }>('/api/unit-custom-properties');
  }

  public appendSection(file: string, payload: { sourceFile: string; sectionIndex: number; id: string }) {
    return this.http.post<{ sections: number }>(
      `/api/landings/${encodeURIComponent(file)}/sections`,
      payload
    );
  }

  public createSection(file: string, payload: { id: string; component: string }) {
    return this.http.post<{ sections: number }>(
      `/api/landings/${encodeURIComponent(file)}/sections`,
      { create: true, ...payload }
    );
  }

  public duplicateSection(file: string, index: number) {
    return this.http.post<{ sections: number; duplicated: SectionSummary }>(
      `/api/landings/${encodeURIComponent(file)}/sections/${index}/duplicate`,
      {}
    );
  }

  public addBanner(file: string, index: number) {
    return this.http.post<{ sections: number; banners: number; updated: SectionSummary }>(
      `/api/landings/${encodeURIComponent(file)}/sections/${index}/banners`,
      {}
    );
  }

  public reorderSections(file: string, move: SectionMove) {
    return this.http.put<{ sections: SectionSummary[] }>(
      `/api/landings/${encodeURIComponent(file)}/sections/reorder`,
      move
    );
  }

  public updateSection(file: string, index: number, section: unknown) {
    return this.http.put<{ modifiedAt?: string; updated: SectionSummary }>(
      `/api/landings/${encodeURIComponent(file)}/sections/${index}`,
      { section }
    );
  }

  public deleteSection(file: string, index: number) {
    return this.http.delete<{ sections: number }>(
      `/api/landings/${encodeURIComponent(file)}/sections/${index}`
    );
  }

  public getTplStatus(file: string) {
    return this.http.get<TplStatus>(`/api/tpl-status?file=${encodeURIComponent(file)}`);
  }

  // Editor TPL desactivado: no se exponen llamadas de lectura/escritura del documento TPL desde la UI.

  public getFileStamps(file: string) {
    return this.http.get<FileStamps>(`/api/file-stamps?file=${encodeURIComponent(file)}`);
  }
}
