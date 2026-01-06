import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RegistrationRoutingModule } from './registration-routing.module';
import { PersonalInformationComponent } from './registration/personal-information/personal-information.component';
import { LocationInformationComponent } from './registration/location-information/location-information.component';
import { OtherInformationComponent } from './registration/other-information/other-information.component';
import { AbhaInformationComponent } from './registration/abha-information/abha-information.component';
import { MatStepperModule } from '@angular/material/stepper';
import { MaterialModule } from 'src/app/app-modules/core/material.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegistrationComponent } from './registration/registration.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SearchDialogComponent } from './search-dialog/search-dialog.component';
import { SearchComponent } from './search/search.component';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RegistrarService } from './services/registrar.service';
import { RegistrationService } from './services/registration.service';
import { BiometricAuthenticationComponent } from './abha-components/biometric-authentication/biometric-authentication.component';
import { FamilyTaggingDetailsComponent } from './family-tagging/family-tagging-details/family-tagging-details.component';
import { CreateFamilyTaggingComponent } from './family-tagging/create-family-tagging/create-family-tagging.component';
import { EditFamilyTaggingComponent } from './family-tagging/edit-family-tagging/edit-family-tagging.component';
import { HealthIdDisplayModalComponent } from './abha-components/health-id-display-modal/health-id-display-modal.component';
import { SearchFamilyComponent } from './search-family/search-family.component';
import { BeneficiaryDetailsComponent } from './beneficiary-details/beneficiary-details.component';
import { SharedModule } from 'src/app/app-modules/core/components/shared/shared.module';
import { FamilyTaggingService } from './services/familytagging.service';
import { ConsentFormComponent } from './registration/consent-form/consent-form.component';
import { RdDeviceService } from './services/rddevice.service';
import { AbhaEnterOtpComponentComponent } from './abha-components/abha-enter-otp-component/abha-enter-otp-component.component';
import { AbhaMobileComponentComponent } from './abha-components/abha-mobile-component/abha-mobile-component.component';
import { AbhaGenerationSuccessComponentComponent } from './abha-components/abha-generation-success-component/abha-generation-success-component.component';
import { GenerateAbhaComponentComponent } from './abha-components/generate-abha-component/generate-abha-component.component';
import { DownloadSearchAbhaComponent } from './abha-components/download-search-abha/download-search-abha.component';
import { DisplayAbhaCardComponent } from './abha-components/display-abha-card/display-abha-card.component';
import { AbhaVerifySuccessComponentComponent } from './abha-components/abha-verify-success-component/abha-verify-success-component.component';
import { AbhaEnterMobileOtpComponentComponent } from './abha-components/abha-enter-mobile-otp-component/abha-enter-mobile-otp-component.component';
import { AbhaConsentFormComponent } from './abha-components/abha-consent-form/abha-consent-form.component';

@NgModule({
  declarations: [
    PersonalInformationComponent,
    LocationInformationComponent,
    OtherInformationComponent,
    AbhaInformationComponent,
    DashboardComponent,
    RegistrationComponent,
    SearchComponent,
    SearchDialogComponent,
    BiometricAuthenticationComponent,
    FamilyTaggingDetailsComponent,
    CreateFamilyTaggingComponent,
    EditFamilyTaggingComponent,
    GenerateAbhaComponentComponent,
    HealthIdDisplayModalComponent,
    SearchFamilyComponent,
    BeneficiaryDetailsComponent,
    ConsentFormComponent,
    AbhaEnterOtpComponentComponent,
    AbhaMobileComponentComponent,
    AbhaGenerationSuccessComponentComponent,
    DownloadSearchAbhaComponent,
    DisplayAbhaCardComponent,
    AbhaVerifySuccessComponentComponent,
    AbhaEnterMobileOtpComponentComponent,
    AbhaConsentFormComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    MatStepperModule,
    ReactiveFormsModule,
    FormsModule,
    RegistrationRoutingModule,
    SharedModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  exports: [
    PersonalInformationComponent,
    LocationInformationComponent,
    OtherInformationComponent,
    AbhaInformationComponent,
    RegistrationComponent,
    SearchComponent,
    SearchDialogComponent,
    BiometricAuthenticationComponent,
    FamilyTaggingDetailsComponent,
    CreateFamilyTaggingComponent,
    EditFamilyTaggingComponent,
    GenerateAbhaComponentComponent,
    HealthIdDisplayModalComponent,
    BeneficiaryDetailsComponent,
  ],
  providers: [
    RegistrarService,
    RegistrationService,
    FamilyTaggingService,
    RdDeviceService
  ]
})
export class RegistrationModule { }
