import { Component, Input } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import {
  FeedbackService,
  ServiceLine,
  CategoryDto,
} from "../../services/feedback.service";

@Component({
  selector: "app-feedback-dialog",
  templateUrl: "./feedback-dialog.component.html",
  styleUrls: ["./feedback-dialog.component.scss"],
})
export class FeedbackDialogComponent {
  @Input() serviceLine: ServiceLine = "TM";
  @Input() defaultCategorySlug?: string;

  stars = [1, 2, 3, 4, 5];
  categories: CategoryDto[] = [];
  showCategory = true; // <— NEW: hide category row if fetch fails
  submitting = false;
  error?: string;
  successId?: string;

  form = this.fb.nonNullable.group({
    rating: [0, [Validators.min(1), Validators.max(5)]],
    categorySlug: ["", Validators.required], // becomes optional if showCategory=false
    comment: ["", Validators.maxLength(2000)],
  });

  constructor(
    private fb: FormBuilder,
    private api: FeedbackService,
  ) {}

  ngOnInit() {
    this.api.listCategories(this.serviceLine).subscribe({
      next: (list) => {
        this.categories = (list || []).filter((c) => (c as any).Active ?? true);
        // Set default value only if we have categories
        const def = this.defaultCategorySlug || this.categories[0]?.Slug || "";
        if (def) this.form.controls.categorySlug.setValue(def);
        this.showCategory = this.categories.length > 0;
        if (!this.showCategory) {
          // Make category optional if there’s nothing to pick
          this.form.controls.categorySlug.clearValidators();
          this.form.controls.categorySlug.updateValueAndValidity();
        }
      },
      error: () => {
        // Don’t block the user if categories fail; just hide the row
        this.showCategory = false;
        this.form.controls.categorySlug.clearValidators();
        this.form.controls.categorySlug.updateValueAndValidity();
        // Optional: still keep an error note somewhere if you want
        // this.error = "Could not load categories.";
      },
    });
  }

  setRating(n: number) {
    this.form.controls.rating.setValue(n);
  }

  /** disable submit only if rating invalid OR (category required & missing) */
  formInvalidForNow(): boolean {
    const r = this.form.value.rating ?? 0;
    const ratingInvalid = r < 1 || r > 5;
    const categoryInvalid =
      this.showCategory && this.form.controls.categorySlug.invalid;
    return ratingInvalid || categoryInvalid;
  }

  submit() {
    this.error = undefined;
    this.successId = undefined;
    if (this.formInvalidForNow()) {
      this.error = this.showCategory
        ? "Pick a rating and a category."
        : "Pick a rating.";
      return;
    }
    this.submitting = true;

    this.api
      .submitFeedback({
        rating: this.form.value.rating!,
        categorySlug: this.form.value.categorySlug!, // okay even if empty when showCategory=false
        comment: this.form.value.comment || undefined,
        isAnonymous: true,
        serviceLine: this.serviceLine,
      })
      .subscribe({
        next: (res) => {
          this.successId = res?.id || "submitted";
          this.form.reset({
            rating: 0,
            categorySlug: this.categories[0]?.Slug ?? "",
            comment: "",
          });
        },
        error: (e) =>
          (this.error =
            e?.status === 429
              ? "Too many attempts. Try later."
              : "Submission failed."),
        complete: () => (this.submitting = false),
      });
  }
}
