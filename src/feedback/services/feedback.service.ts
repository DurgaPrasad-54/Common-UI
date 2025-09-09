import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export type ServiceLine = "1097" | "104" | "AAM" | "MMU" | "TM" | "ECD";

export interface CategoryDto {
  categoryID: string;
  slug: string;
  label: string;
  scope: "GLOBAL" | ServiceLine;
  active: boolean;
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
  private readonly apiBase = "http://localhost:8083"; // centralize if you want to inject later

  constructor(private http: HttpClient) {}

  listCategories(serviceLine: ServiceLine): Observable<CategoryDto[]> {
    const params = new HttpParams().set("serviceLine", serviceLine);
    return this.http.get<CategoryDto[]>(
      `${this.apiBase}/platform-feedback/categories`,
    );
  }

  submitFeedback(payload: SubmitFeedbackRequest) {
    return this.http.post<{ id: string; createdAt?: string }>(
      `${this.apiBase}/platform-feedback`,
      payload,
    );
  }
}
