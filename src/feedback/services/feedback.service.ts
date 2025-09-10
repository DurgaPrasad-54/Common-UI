/*
 * AMRIT – Accessible Medical Records via Integrated Technology
 * Integrated EHR (Electronic Health Records) Solution
 *
 * Copyright (C) "Piramal Swasthya Management and Research Institute"
 *
 * This file is part of AMRIT.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/.
 */
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
  private readonly apiBase = `${window.location.origin}/common-api`;

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
