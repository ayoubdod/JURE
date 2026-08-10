import axiosInstance from "@/utils/axiosInstance";

export type ResearchNote = {
  id: number;
  title: string;
  citation: string;
  content: string;
  matter: number | null;
  matter_reference: string | null;
  matter_title: string | null;
  author: number | null;
  author_name: string | null;
  created: string;
  modified: string;
};

export type ResearchNotePayload = {
  title: string;
  citation?: string;
  content?: string;
  matter?: number | null;
};

export type ResearchNoteListResponse =
  | ResearchNote[]
  | {
      count: number;
      results: ResearchNote[];
      page?: number;
      last_page?: number;
    };

export function unwrapResearchNoteList(data: ResearchNoteListResponse): ResearchNote[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export const apiGetResearchNotes = (params?: {
  matter?: number;
  unscoped?: boolean;
  page?: number;
  page_size?: number;
}) =>
  axiosInstance.get<ResearchNoteListResponse>("/research-notes/", {
    params: {
      ...(params?.matter != null ? { matter: params.matter } : {}),
      ...(params?.unscoped ? { unscoped: "1" } : {}),
      ...(params?.page != null ? { page: params.page } : {}),
      ...(params?.page_size != null ? { page_size: params.page_size } : {}),
    },
  });

export const apiCreateResearchNote = (data: ResearchNotePayload) =>
  axiosInstance.post<ResearchNote>("/research-notes/", data);

export const apiUpdateResearchNote = (id: number, data: Partial<ResearchNotePayload>) =>
  axiosInstance.patch<ResearchNote>(`/research-notes/${id}/`, data);

export const apiDeleteResearchNote = (id: number) =>
  axiosInstance.delete(`/research-notes/${id}/`);
