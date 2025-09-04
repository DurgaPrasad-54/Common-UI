import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { FeedbackPublicPageComponent } from "./pages/feedback-public-page/feedback-public-page-component";

const routes: Routes = [
  {
    path: "",
    component: FeedbackPublicPageComponent, // public post-logout page
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FeedbackRoutingModule {}
