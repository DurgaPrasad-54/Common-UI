import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { map } from "rxjs/operators";

type SL = "1097" | "104" | "HWC" | "MMU" | "TM" | "ECD";

@Component({
  selector: "app-feedback-public-page",
  template: `
    <div class="page-wrap">
      <app-feedback-dialog
        [serviceLine]="serviceLine"
        [defaultCategorySlug]="'general-feedback'"
      >
      </app-feedback-dialog>
    </div>
  `,
  styles: [
    `
      .page-wrap {
        min-height: 100vh;
        background: #f5f7fb;
        padding: 24px;
      }
    `,
  ],
})
export class FeedbackPublicPageComponent {
  serviceLine: SL = "TM"; // default fallback

  constructor(private route: ActivatedRoute) {
    this.route.queryParamMap
      .pipe(map((q) => (q.get("sl") as SL) || this.serviceLine))
      .subscribe((sl) => (this.serviceLine = sl));
  }
}
