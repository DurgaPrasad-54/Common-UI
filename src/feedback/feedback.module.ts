import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";

import { FeedbackRoutingModule } from "./feedback-routing.module";
import { MaterialModule } from "src/app/app-modules/core/material.module"; // your shared material bundle

import { FeedbackPublicPageComponent } from "./pages/feedback-public-page/feedback-public-page-component";
import { FeedbackDialogComponent } from "./shared/feedback-dialog/feedback-dialog.component";

import { FeedbackService } from "./services/feedback.service";

@NgModule({
  declarations: [FeedbackPublicPageComponent, FeedbackDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MaterialModule,
    FeedbackRoutingModule,
  ],
  exports: [FeedbackDialogComponent],
  providers: [FeedbackService],
})
export class FeedbackModule {}
