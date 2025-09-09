import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { map } from "rxjs/operators";

type SL = "1097" | "104" | "AAM" | "MMU" | "TM" | "ECD";

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
      }
    `,
  ],
})
export class FeedbackPublicPageComponent {
  serviceLine: SL = "AAM"; // default fallback

  constructor(private route: ActivatedRoute) {
    // Check query param ?sl=
    this.route.queryParamMap
      .pipe(map((q) => (q.get("sl") as SL) || this.detectFromLocation()))
      .subscribe((sl) => (this.serviceLine = sl));
  }

  private detectFromLocation(): SL {
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    // path-based service lines
    if (path.includes("/1097")) return "1097";
    if (path.includes("/104")) return "104";
    if (path.includes("/aam")) return "AAM";
    if (path.includes("/mmu")) return "MMU";
    if (path.includes("/tm")) return "TM";
    if (path.includes("/ecd")) return "ECD";

    // fallback
    return "AAM";
  }
}
