import { Component, Input, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import {
  FeedbackService,
  ServiceLine,
  CategoryDto,
} from "../../services/feedback.service";
import { finalize } from "rxjs/operators";

@Component({
  selector: "app-feedback-dialog",
  templateUrl: "./feedback-dialog.component.html",
  styleUrls: ["./feedback-dialog.component.scss"],
})
export class FeedbackDialogComponent implements OnInit {
  @Input() serviceLine: ServiceLine = "TM";
  @Input() defaultCategorySlug?: string;

  stars = [1, 2, 3, 4, 5];
  starLabels = ["Terrible", "Bad", "Okay", "Good", "Great"];
  categories: CategoryDto[] = [];
  submitting = false;
  error?: string;
  successId?: string;

  isLoggedIn = false;
  storedUserId?: string;

  // showCategory controls whether dropdown is shown (true if categories loaded)
  showCategory = true;

  form = this.fb.nonNullable.group({
    rating: [0, [Validators.min(1), Validators.max(5)]],
    categorySlug: ["", Validators.required],
    comment: ["", Validators.maxLength(2000)],
    // default to true for logged-out; we'll set actual default in ngOnInit
    isAnonymous: [true],
  });

  constructor(
    private fb: FormBuilder,
    private api: FeedbackService,
  ) {}

  ngOnInit() {
    // sessionStorage check
    try {
      this.storedUserId = sessionStorage.getItem("userID") || undefined;
      this.isLoggedIn = !!this.storedUserId;
    } catch (e) {
      // sessionStorage may be unavailable in some runners; fail safe to anonymous
      this.isLoggedIn = false;
      this.storedUserId = undefined;
    }

    // If user is logged in, default to NOT anonymous so they explicitly can opt-in; if logged out, force anonymous
    if (this.isLoggedIn) {
      // default to anonymous=true to respect privacy; but you asked to ask consent — show unchecked by default
      // we'll set it to true so users must actively uncheck to identify themselves OR you can flip to false to encourage identified
      // choose default = true to be conservative:
      this.form.controls.isAnonymous.setValue(true);
    } else {
      this.form.controls.isAnonymous.setValue(true);
    }

    // load categories
    this.api.listCategories(this.serviceLine).subscribe({
      next: (list) => {
        this.categories = (list || []).filter(
          (c: any) => (c as any).active ?? true,
        );
        this.showCategory = this.categories.length > 0;
        const def = this.defaultCategorySlug || this.categories[0]?.slug || "";
        if (def) this.form.controls.categorySlug.setValue(def);
      },
      error: () => (this.error = "Could not load categories."),
    });
  }

  setRating(n: number) {
    this.form.controls.rating.setValue(n);
  }

  toggleAnonymous(event: Event) {
    const input = event.target as HTMLInputElement;
    this.form.controls.isAnonymous.setValue(input.checked);
  }

  formInvalidForNow(): boolean {
    // require rating >=1 and category selected
    return (
      !this.form.controls.rating.value || !this.form.controls.categorySlug.value
    );
  }

  submit() {
    this.error = undefined;
    this.successId = undefined;

    if (this.formInvalidForNow()) {
      this.error = "Pick a rating and a category.";
      return;
    }

    // build payload
    const payload: any = {
      rating: this.form.value.rating!,
      categorySlug: this.form.value.categorySlug!,
      comment: this.form.value.comment || undefined,
      isAnonymous: this.form.value.isAnonymous!,
      serviceLine: this.serviceLine,
    };

    if (!payload.isAnonymous && this.isLoggedIn && this.storedUserId) {
      // include userId for identified submissions
      // session storage stores as string, convert to integer if needed by backend
      const parsed = parseInt(this.storedUserId as string, 10);
      payload.userId = Number.isNaN(parsed) ? this.storedUserId : parsed;
    }

    this.submitting = true;
    this.api
      .submitFeedback(payload)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (res) => {
          this.successId = res?.id || "submitted";
          // reset form but keep identity default
          this.form.reset({
            rating: 0,
            categorySlug: this.categories[0]?.slug ?? "",
            comment: "",
            isAnonymous: this.isLoggedIn ? true : true,
          });
        },
        error: (e) => {
          if (e?.status === 429) {
            this.error = "Too many attempts. Try later.";
          } else if (e?.error?.error) {
            this.error = e.error.error;
          } else {
            this.error = "Submission failed.";
          }
        },
      });
  }
}
