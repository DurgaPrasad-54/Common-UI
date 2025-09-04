import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export type ServiceLine = "1097" | "104" | "HWC" | "MMU" | "TM" | "ECD";

export interface CategoryDto {
  CategoryID: string;
  Slug: string;
  Label: string;
  Scope: "GLOBAL" | ServiceLine;
  Active: boolean;
}

export interface SubmitFeedbackRequest {
  rating: number;
  categorySlug: string; // FE sends slug; BE resolves to CategoryID
  comment?: string;
  isAnonymous: boolean; // true for logout flow
  serviceLine: ServiceLine;
}

@Injectable()
export class FeedbackService {
  private readonly apiBase = "/common-api"; // centralize if you want to inject later

  constructor(private http: HttpClient) {}

  listCategories(serviceLine: ServiceLine): Observable<CategoryDto[]> {
    const params = new HttpParams().set("serviceLine", serviceLine);
    return this.http.get<CategoryDto[]>(`${this.apiBase}/feedback/categories`, {
      params,
    });
  }

  submitFeedback(payload: SubmitFeedbackRequest) {
    return this.http.post<{ id: string; createdAt?: string }>(
      `${this.apiBase}/feedback`,
      payload,
    );
  }
}
