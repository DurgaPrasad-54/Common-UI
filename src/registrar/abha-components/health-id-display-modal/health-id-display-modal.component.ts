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
import { Component, DoCheck, Inject, OnInit } from "@angular/core";
import { FormGroup, FormBuilder } from "@angular/forms";
import { DatePipe } from "@angular/common";
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatTableDataSource } from "@angular/material/table";
import { SetLanguageComponent } from "src/app/app-modules/core/components/set-language.component";
import {
  BeneficiaryDetailsService,
  ConfirmationService,
} from "src/app/app-modules/core/services";
import { HttpServiceService } from "src/app/app-modules/core/services/http-service.service";
import { RegistrarService } from "../../services/registrar.service";
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from "@angular/material/core";
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from "@angular/material-moment-adapter";
import { SessionStorageService } from "../../services/session-storage.service";
import { DownloadSearchAbhaComponent } from "../download-search-abha/download-search-abha.component";
import { interval, startWith, Subscription } from "rxjs";
import { AadhaarCorrectionDialogComponent } from "../aadhar-correction-dialog/aadhaar-correction-dialog.component";

@Component({
  selector: "app-health-id-display-modal",
  templateUrl: "./health-id-display-modal.component.html",
  styleUrls: ["./health-id-display-modal.component.css"],
  providers: [
    {
      provide: DatePipe,
    },
    {
      provide: MAT_DATE_LOCALE,
      useValue: "en-US", // Set the desired locale (e.g., 'en-GB' for dd/MM/yyyy)
    },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: "LL",
        },
        display: {
          dateInput: "DD/MM/YYYY", // Set the desired display format
          monthYearLabel: "MMM YYYY",
          dateA11yLabel: "LL",
          monthYearA11yLabel: "MMMM YYYY",
        },
      },
    },
  ],
})
export class HealthIdDisplayModalComponent implements OnInit, DoCheck {
  chooseHealthID: any;
  currentLanguageSet: any;
  healthIDMapped: any;
  benDetails: any;
  enablehealthIdOTPForm = false;
  healthIDMapping = false;
  transactionId: any;
  selectedHealthID: any;
  healthIdOTPForm!: FormGroup;
  showProgressBar = false;
  searchPopup = false;

  displayedColumns: any = [
    "sno",
    "abhaNumber",
    "abha",
    "dateOfCreation",
    "abhaMode",
  ];
  searchDetails = new MatTableDataSource<any>();

  displayedColumns1: any = [
    "sno",
    "abhaNumber",
    "abha",
    "dateOfCreation",
    "abhaMode",
    "action",
  ];
  displayedColumns2: any = [
    "sno",
    "healthIDNo",
    "healthID",
    "createdDate",
    "healthIDMode",
    "rblMode",
  ];
  healthIDArray = new MatTableDataSource<any>();
  linkToken: any;
  beneficiaryDetails: any;

  public aadhaarVerification: {
    name: string;
    gender: string;
    yearOfBirth: number | null;
  } = {
    name: "",
    gender: "",
    yearOfBirth: null,
  };
  public aadhaarVerified = false;
  public currentYear = new Date().getFullYear();
  constructor(
    public dialogRef: MatDialogRef<HealthIdDisplayModalComponent>,
    @Inject(MAT_DIALOG_DATA) public input: any,
    public httpServiceService: HttpServiceService,
    private formBuilder: FormBuilder,
    private registrarService: RegistrarService,
    private confirmationService: ConfirmationService,
    private datePipe: DatePipe,
    private dialogMd: MatDialog,
    private sessionstorage: SessionStorageService,
    private beneficiaryDetailsService: BeneficiaryDetailsService,
  ) {
    dialogRef.disableClose = true;
  }

  private closeConfirmationAlertIfOpen() {
    try {
      if (this.lastAlertRef) {
        this.lastAlertRef.close();
        this.lastAlertRef = null;
      }
    } catch (e) {
      console.warn("Failed to close confirmation alert", e);
    }
  }

  // Keep a reference to the last confirmationService alert dialog so we can close
  // it when another dialog (MatDialog) is opened on top.
  private lastAlertRef: MatDialogRef<any> | null = null;


  ngOnInit() {
    console.log("this.input", this.input);
    this.searchDetails.data = [];
    this.selectedHealthID = null;
    this.searchPopup = false;
    this.assignSelectedLanguage();
    this.searchPopup =
      this.input.search !== undefined ? this.input.search : false;
    this.healthIDMapping = this.input.healthIDMapping;
    console.log("this.healthIDMapping", this.healthIDMapping);
    this.getBeneficiaryDetails();
    if (this.input.dataList !== undefined && this.input.search === true) {
      let tempVal: any = this.input.dataList;
      this.benDetails = this.input.dataList;
      let tempCreatDate: any = this.input.dataList.createdDate;
      console.log("tempVal", tempVal);
      this.searchDetails.data.push(tempVal);
      console.log("this.searchDetails.data%%", this.searchDetails.data);
    }
    if (
      this.input.dataList !== undefined &&
      this.input.dataList.data?.BenHealthDetails !== undefined
    ) {
      this.benDetails = this.input.dataList.data.BenHealthDetails;
      console.log("this.benDetails1", this.benDetails);
    }
    this.healthIdOTPForm = this.createOtpGenerationForm();
    this.createList();
  }
  ngDoCheck() {
    this.assignSelectedLanguage();
  }
  assignSelectedLanguage() {
    const getLanguageJson = new SetLanguageComponent(this.httpServiceService);
    getLanguageJson.setLanguage();
    this.currentLanguageSet = getLanguageJson.currentLanguageObject;
  }
  createOtpGenerationForm() {
    return this.formBuilder.group({
      otp: null,
    });
  }
  createList() {
    if (this.benDetails.length > 0) {
      this.benDetails.forEach((healthID: any) => {
        healthID.createdDate = this.datePipe.transform(
          healthID.createdDate,
          "yyyy-MM-dd hh:mm:ss a",
        );
        this.healthIDArray.data.push(healthID);
      });
    }
  }

  onRadioChange(data: any) {
    console.clear();
    console.log(this.selectedHealthID);
    this.selectedHealthID = data;
    console.log(this.selectedHealthID);
  }

  beneficiaryDetailSubscription: any;
  getBeneficiaryDetails() {
    this.beneficiaryDetailSubscription =
      this.beneficiaryDetailsService.beneficiaryDetails$.subscribe(
        (beneficiary) => {
          if (beneficiary) {
            if (beneficiary) {
              this.beneficiaryDetails = beneficiary;
              this.initAadhaarVerificationFromBeneficiary();
            }
          }
        },
      );
  }

  private initAadhaarVerificationFromBeneficiary() {
    try {
      const name = this.beneficiaryDetails?.beneficiaryName ?? "";
      const gender = this.beneficiaryDetails?.genderName ?? "";
      const dob = this.beneficiaryDetails?.dOB ?? null;

      let yob: number | null = null;
      if (dob) {
        const parsed = new Date(dob);
        if (!isNaN(parsed.getTime())) {
          yob = parsed.getFullYear();
        } else {
          const maybe = parseInt(String(dob), 10);
          if (!isNaN(maybe)) yob = maybe;
        }
      }

      this.aadhaarVerification = {
        name,
        gender,
        yearOfBirth: yob ?? this.currentYear - 30,
      };
      this.aadhaarVerified = false;
    } catch (e) {
      console.warn("initAadhaarVerificationFromBeneficiary failed", e);
    }
  }

  public onResetAadhaarVerification() {
    this.initAadhaarVerificationFromBeneficiary();
  }

  // Apply the verified values into beneficiaryDetails and call generateTokenForLinking()
  public applyAndGenerate() {
    if (
      !this.aadhaarVerification.name ||
      !this.aadhaarVerification.gender ||
      !this.aadhaarVerification.yearOfBirth
    ) {
      this.confirmationService.alert(
        this.currentLanguageSet?.pleaseFillAllFields ||
          "Please fill all fields",
        "error",
      );
      return;
    }

    // Copy into beneficiaryDetails so existing generateTokenForLinking reads them
    this.beneficiaryDetails.beneficiaryName = this.aadhaarVerification.name;
    this.beneficiaryDetails.genderName = this.aadhaarVerification.gender;
    this.beneficiaryDetails.dOB = `${this.aadhaarVerification.yearOfBirth}-01-01T00:00:00.000Z`;

    this.aadhaarVerified = true;
    this.suppressAutoGenerate = true;
    if (this.linkPollingSub) {
      this.linkPollingSub.unsubscribe();
      this.linkPollingSub = null;
    }
    // Trigger existing flow
    this.generateTokenForLinking();
  }

  private linkPollingSub: Subscription | null = null;
  private isPollingLink = false;
  private generateResubmitAttempts = 0;
  private readonly maxGenerateResubmitAttempts = 3;
  // prevents concurrent generate calls
  public isGenerating = false;

  // small guard to suppress any automatic re-trigger events while manual resubmit running
  private suppressAutoGenerate = false;

  generateTokenForLinking() {
    if (this.isGenerating) {
      console.debug(
        "[link] generateTokenForLinking suppressed because already generating",
      );
      return;
    }
    this.isGenerating = true;
    this.showProgressBar = true;

    const abdmFacilityId = this.sessionstorage.getItem("abdmFacilityId");
    const abdmFacilityName = this.sessionstorage.getItem("abdmFacilityName");
    const dateString = this.beneficiaryDetails.dOB;
    const yearOfBirth = new Date(dateString).getFullYear();

    const reqObj = {
      abhaNumber: this.selectedHealthID.healthIdNumber
        ? this.selectedHealthID.healthIdNumber
        : null,
      abhaAddress: this.selectedHealthID.healthId
        ? this.selectedHealthID.healthId
        : null,
      name: this.beneficiaryDetails.beneficiaryName,
      gender: this.beneficiaryDetails.genderName,
      yearOfBirth,
      visitCode: this.input.visitCode,
      visitCategory: this.beneficiaryDetails.VisitCategory,
      abdmFacilityId:
        abdmFacilityId !== null &&
        abdmFacilityId !== undefined &&
        abdmFacilityId !== ""
          ? abdmFacilityId
          : null,
      abdmFacilityName:
        abdmFacilityName !== null &&
        abdmFacilityName !== undefined &&
        abdmFacilityName !== ""
          ? abdmFacilityName
          : null,
    };

    this.registrarService.generateTokenForCareContext(reqObj).subscribe(
      (res: any) => {
        this.showProgressBar = false;
        const data = res?.data ?? null;

        if (data?.linkToken) {
          this.linkToken = data.linkToken;
          this.startLinkCareContextPolling();
          return;
        }

        if (data?.requestId && !data?.linkToken) {
          const requestId = data.requestId;
          this.resumeViaSecondApi(requestId, reqObj);
          return;
        }

        const dataError = data?.Error ?? data?.error ?? null;
        if (dataError) {
          const serverMsg =
            dataError?.Message ??
            dataError?.message ??
            "Details do not match Aadhaar";
          this.handleAadhaarMismatchDialog(
            {
              name: reqObj.name,
              gender: reqObj.gender,
              yearOfBirth: reqObj.yearOfBirth,
            },
            serverMsg,
          );
          return;
        }

        const fallbackMsg =
          res?.errorMessage ?? res?.status ?? "Failed to generate link token";

        if (
          String(fallbackMsg).toLowerCase().includes("duplicate") ||
          String(fallbackMsg).toLowerCase().includes("abdm-1092")
        ) {
          this.confirmationService.alert(fallbackMsg, "error");
          return;
        }

        this.confirmationService.alert(fallbackMsg, "error");
      },
      (err) => {
        this.showProgressBar = false;
        const payloadError = err?.error ?? null;
        const errMsg =
          payloadError?.Message ??
          payloadError?.message ??
          err?.error?.errorMessage ??
          err?.message ??
          "";

        if (
          String(errMsg).toLowerCase().includes("duplicate") ||
          String(errMsg).toLowerCase().includes("abdm-1092")
        ) {
          this.confirmationService.alert(errMsg, "error");
          return;
        }

        if (payloadError && (payloadError?.Code || payloadError?.Message)) {
          const serverMsg =
            payloadError?.Message ??
            payloadError?.message ??
            "Details do not match Aadhaar";
          this.handleAadhaarMismatchDialog(
            {
              name: this.beneficiaryDetails.beneficiaryName,
              gender: this.beneficiaryDetails.genderName,
              yearOfBirth: new Date(this.beneficiaryDetails.dOB).getFullYear(),
            },
            serverMsg,
          );
          return;
        }

        // generic
        this.confirmationService.alert(
          errMsg || "Something went wrong",
          "error",
        );
      },
    );
  }

  private resumeViaSecondApi(requestId: string, originalReqObj: any) {
    const reqObj = {
      requestId,
      abdmFacilityId: this.sessionstorage.getItem("abdmFacilityId"),
      abdmFacilityName: this.sessionstorage.getItem("abdmFacilityName"),
      abhaNumber: this.selectedHealthID?.healthIdNumber ?? null,
      abhaAddress: this.selectedHealthID?.healthId ?? null,
      visitCode: this.input.visitCode,
      visitCategory: this.beneficiaryDetails.VisitCategory,
      visitReason: this.beneficiaryDetails.VisitReason,
      beneficiaryId: this.beneficiaryDetails.beneficiaryID,
    };

    this.pollLinkCareContext(reqObj, { resumeRequestId: requestId });
  }

  private pollLinkCareContext(
    reqObj: any,
    options?: { isStartup?: boolean; resumeRequestId?: string },
  ) {
    const maxAttempts = 3;
    const delayMs = 5000;

    if (options?.isStartup) {
      if (this.isPollingLink) return;
      if (!this.linkToken) {
        this.confirmationService.alert(
          "No link token available to start linking",
          "error",
        );
        return;
      }
      this.isPollingLink = true;
    }

    this.isGenerating = false;
    this.showProgressBar = true;

    if (this.linkPollingSub) {
      this.linkPollingSub.unsubscribe();
      this.linkPollingSub = null;
    }

    let attempts = 0;
    this.linkPollingSub = interval(delayMs)
      .pipe(startWith(0))
      .subscribe(() => {
        attempts++;
        this.registrarService.linkCareContext(reqObj).subscribe(
          (res: any) => {
            const data = res?.data ?? null;
            const isEmpty = data && Object.keys(data).length === 0;
            const respError = data?.Error ?? data?.error ?? null;

            if (
              data?.message &&
              String(data.message)
                .toLowerCase()
                .includes("care context added successfully")
            ) {
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(
                data?.message ||
                  this.currentLanguageSet.linkSuccess ||
                "Care context linked successfully",
                "success",
              );
              this.linkToken = null;
              return;
            }
            if (respError) {
              const serverMsg =
                respError?.Message ?? respError?.message ?? "Linking failed";
              const code = String(respError?.Code ?? "").toLowerCase();

              if (
                code.includes("1207") ||
                /aadhar|aadhaar|does not match/i.test(serverMsg)
              ) {
                this.stopLinkCareContextPolling();
                this.showProgressBar = false;
                this.handleAadhaarMismatchDialog(
                  {
                    name: this.beneficiaryDetails.beneficiaryName,
                    gender: this.beneficiaryDetails.genderName,
                    yearOfBirth: new Date(
                      this.beneficiaryDetails.dOB,
                    ).getFullYear(),
                  },
                  serverMsg,
                );
                return;
              }

              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(serverMsg, "error");
              return;
            }

            if (isEmpty) {
              console.debug(
                `[link] pollLinkCareContext: empty response attempt ${attempts}/${maxAttempts}`,
              );
              if (attempts >= maxAttempts) {
                this.stopLinkCareContextPolling();
                this.showProgressBar = false;
                const infoMsg = options?.resumeRequestId
                  ? `Still processing. Please try again later with RequestId: ${options.resumeRequestId}`
                  : "Linking is still processing. Please try again later.";
                this.confirmationService.alert(infoMsg, "info");
              }
              return;
            }

            // fallback after all retries
            if (attempts >= maxAttempts) {
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(
                res?.errorMessage ?? "Linking care context failed after maximum retries",
                "error",
              );
            }
          },
          (err) => {
            if (attempts >= maxAttempts) {
              const msg =
                err?.error?.message ?? err?.message ?? "Linking failed after retries";
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(msg, "error");
            } else {
              console.warn("[link] pollLinkCareContext retrying after error", err);
            }
          },
        );
      });
  }

  private startLinkCareContextPolling() {
    const makeReqObj = () => ({
      linkToken: this.linkToken,
      abhaNumber: this.selectedHealthID?.healthIdNumber ?? null,
      abhaAddress: this.selectedHealthID?.healthId ?? null,
      abdmFacilityId: this.sessionstorage.getItem("abdmFacilityId"),
      abdmFacilityName: this.sessionstorage.getItem("abdmFacilityName"),
      visitCode: this.input.visitCode,
      visitCategory: this.beneficiaryDetails.VisitCategory,
      visitReason: this.beneficiaryDetails.VisitReason,
      beneficiaryId: this.beneficiaryDetails.beneficiaryID,
    });

    this.pollLinkCareContext(makeReqObj(), { isStartup: true });
  }

  private stopLinkCareContextPolling() {
    if (this.linkPollingSub) {
      this.linkPollingSub.unsubscribe();
      this.linkPollingSub = null;
    }
    this.isPollingLink = false;
    this.isGenerating = false;
  }

  private isAadhaarMismatch(errorCandidate: any): boolean {
    if (!errorCandidate) return false;

    if (typeof errorCandidate === "object") {
      const code = String(
        errorCandidate.Code ?? errorCandidate.code ?? "",
      ).toLowerCase();
      const msg = String(
        errorCandidate.Message ??
          errorCandidate.message ??
          errorCandidate.errorMessage ??
          "",
      ).toLowerCase();

      const textMatch =
        msg.includes("aadhar") ||
        msg.includes("aadhaar") ||
        msg.includes("does not match") ||
        msg.includes("doesn't match") ||
        msg.includes("not match") ||
        msg.includes("match the details");

      const code1207 = /\b1207\b/.test(code) || /abdm-?1207/.test(code);

      return (
        textMatch ||
        (code1207 &&
          (msg.includes("match") ||
            msg.includes("aadhaar") ||
            msg.includes("aadhar")))
      );
    }

    const s = String(errorCandidate).toLowerCase();
    return (
      s.includes("aadhar") ||
      s.includes("aadhaar") ||
      s.includes("does not match") ||
      s.includes("doesn't match") ||
      s.includes("not match") ||
      s.includes("match the details")
    );
  }

  private handleAadhaarMismatchDialog(
    prefill: { name: string; gender: string; yearOfBirth: number },
    serverMsg: string,
  ) {
    if (this.generateResubmitAttempts >= this.maxGenerateResubmitAttempts) {
      this.confirmationService.alert(
        "Maximum correction attempts reached. " + (serverMsg || ""),
        "error",
      );
      return;
    }

    // Close any existing confirmation alert before opening the Aadhaar correction dialog
    this.closeConfirmationAlertIfOpen();

    const dialogRef = this.dialogMd.open(AadhaarCorrectionDialogComponent, {
      width: "420px",
      data: {
        title: "Aadhaar details mismatch",
        message:
          serverMsg ||
          "The entered details do not match Aadhaar. Please provide Aadhaar-provided details.",
        formData: prefill,
      },
    });

    dialogRef
      .afterClosed()
      .subscribe(
        (
          result:
            | { name?: string; gender?: string; yearOfBirth?: number }
            | undefined,
        ) => {
          if (!result) {
            this.confirmationService.alert(
              "Linking cancelled by user.",
              "info",
            );
            return;
          }

          this.generateResubmitAttempts++;
          this.resubmitGenerateTokenWithCorrectedDetails(result);
        },
      );
  }

  private resubmitGenerateTokenWithCorrectedDetails(corrected: {
    name?: string;
    gender?: string;
    yearOfBirth?: number;
  }) {
    this.showProgressBar = true;
    const abdmFacilityId = this.sessionstorage.getItem("abdmFacilityId");
    const abdmFacilityName = this.sessionstorage.getItem("abdmFacilityName");

    const reqObj = {
      abhaNumber: this.selectedHealthID?.healthIdNumber ?? null,
      abhaAddress: this.selectedHealthID?.healthId ?? null,
      name: corrected.name ?? this.beneficiaryDetails.beneficiaryName,
      gender: corrected.gender ?? this.beneficiaryDetails.genderName,
      yearOfBirth:
        corrected.yearOfBirth ??
        new Date(this.beneficiaryDetails.dOB).getFullYear(),
      visitCode: this.input.visitCode,
      visitCategory: this.beneficiaryDetails.VisitCategory,
      abdmFacilityId:
        abdmFacilityId !== null &&
        abdmFacilityId !== undefined &&
        abdmFacilityId !== ""
          ? abdmFacilityId
          : null,
      abdmFacilityName:
        abdmFacilityName !== null &&
        abdmFacilityName !== undefined &&
        abdmFacilityName !== ""
          ? abdmFacilityName
          : null,
    };

    this.registrarService.generateTokenForCareContext(reqObj).subscribe(
      (res: any) => {
        this.showProgressBar = false;
        const data = res?.data ?? null;
        const dataError = data?.Error ?? data?.error ?? null;

        // ⚠️ CASE 1: Aadhaar mismatch response
        if (dataError) {
          const serverMsg =
            dataError?.Message ??
            dataError?.message ??
            "Details do not match Aadhaar";
          if (
            this.generateResubmitAttempts < this.maxGenerateResubmitAttempts
          ) {
            this.handleAadhaarMismatchDialog(
              {
                name: reqObj.name,
                gender: reqObj.gender,
                yearOfBirth: reqObj.yearOfBirth,
              },
              serverMsg,
            );
          } else {
            this.confirmationService.alert(serverMsg, "error");
          }
          return;
        }

        // CASE 2: Successful token — start polling
        if (data?.linkToken) {
          this.linkToken = data.linkToken;
          this.generateResubmitAttempts = 0;
          this.startLinkCareContextPolling();
          return;
        }

        // CASE 3: Success (200) but only requestId, no linkToken
        if (data?.requestId && !data?.linkToken) {
          this.resumeViaSecondApi(data.requestId, reqObj);
          return;
        }

        //  CASE 4: Duplicate or other backend signals
        const fallbackMsg =
          res?.errorMessage ?? res?.status ?? "Failed to generate link token";

        if (
          String(fallbackMsg).toLowerCase().includes("duplicate") ||
          String(fallbackMsg).toLowerCase().includes("abdm-1092")
        ) {
          // Flow 4 fallback: show error to user (no resume via duplicate)
          this.confirmationService.alert(fallbackMsg, "error");
          return;
        }

        // CASE 5: Unknown/invalid
        this.confirmationService.alert(fallbackMsg, "error");
      },
      (err) => {
        this.showProgressBar = false;
        const errMsg =
          err?.error?.errorMessage ?? err?.message ?? "Something went wrong";

        if (
          this.isAadhaarMismatch(errMsg) &&
          this.generateResubmitAttempts < this.maxGenerateResubmitAttempts
        ) {
          this.handleAadhaarMismatchDialog(
            {
              name: reqObj.name,
              gender: reqObj.gender,
              yearOfBirth: reqObj.yearOfBirth,
            },
            errMsg,
          );
        } else if (
          String(errMsg).toLowerCase().includes("duplicate") ||
          String(errMsg).toLowerCase().includes("abdm-1092")
        ) {
          // Flow 4: fallback to showing error instead of resuming
          this.confirmationService.alert(errMsg, "error");
        } else {
          this.confirmationService.alert(errMsg, "error");
        }
      },
    );
  }

  generateOtpForMapping() {
    this.showProgressBar = true;
    const abdmFacilityId = this.sessionstorage.getItem("abdmFacilityId");
    const abdmFacilityName = this.sessionstorage.getItem("abdmFacilityName");
    const reqObj = {
      healthID: this.selectedHealthID.healthId
        ? this.selectedHealthID.healthId
        : null,
      healthIdNumber: this.selectedHealthID.healthIdNumber
        ? this.selectedHealthID.healthIdNumber
        : null,
      authenticationMode: this.selectedHealthID.authenticationMode,
      abdmFacilityId:
        abdmFacilityId !== null &&
        abdmFacilityId !== undefined &&
        abdmFacilityId !== ""
          ? abdmFacilityId
          : null,
      abdmFacilityName:
        abdmFacilityName !== null &&
        abdmFacilityName !== undefined &&
        abdmFacilityName !== ""
          ? abdmFacilityName
          : null,
    };
    this.registrarService.generateOtpForMappingCareContext(reqObj).subscribe(
      (receivedOtpResponse: any) => {
        if (receivedOtpResponse.statusCode === 200) {
          this.showProgressBar = false;
          this.confirmationService.alert(
            this.currentLanguageSet.OTPSentToRegMobNo,
            "success",
          );
          this.transactionId = receivedOtpResponse.data.txnId;
          this.enablehealthIdOTPForm = true;
        } else {
          this.confirmationService.alert(
            receivedOtpResponse.errorMessage,
            "error",
          );
          this.enablehealthIdOTPForm = false;
          this.showProgressBar = false;
        }
      },
      (err) => {
        this.showProgressBar = false;
        this.confirmationService.alert(err.errorMessage, "error");
        this.enablehealthIdOTPForm = false;
      },
    );
  }
  numberOnly(event: any): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }
  checkOTP() {
    const otp = this.healthIdOTPForm.controls["otp"].value;
    let cflag = false;
    if (otp !== "" && otp !== undefined && otp !== null) {
      const hid = otp;
      if (hid.length >= 4 && hid.length <= 32) {
        for (let i = 0; i < hid.length; i++) {
          if (!this.is_numeric(hid.charAt(i))) {
            cflag = true;
            break;
          }
        }
        if (cflag) return false;
      } else return false;
    } else return false;
    return true;
  }
  isLetter(str: any) {
    return str.length === 1 && str.match(/[a-z]/i);
  }
  is_numeric(str: any) {
    return /^\d+$/.test(str);
  }

  verifyOtp() {
    this.showProgressBar = true;
    const abdmFacilityId = this.sessionstorage.getItem("abdmFacilityId");
    const abdmFacilityName = this.sessionstorage.getItem("abdmFacilityName");
    const verifyOtpData = {
      otp: this.healthIdOTPForm.controls["otp"].value,
      txnId: this.transactionId,
      beneficiaryID: this.selectedHealthID.beneficiaryRegID,
      healthID: this.selectedHealthID.healthId
        ? this.selectedHealthID.healthId
        : null,
      healthIdNumber: this.selectedHealthID.healthIdNumber
        ? this.selectedHealthID.healthIdNumber
        : null,
      visitCode: this.input.visitCode,
      visitCategory:
        this.sessionstorage.getItem("visitCategory") === "General OPD (QC)"
          ? "Emergency"
          : this.sessionstorage.getItem("visitCategory"),
      abdmFacilityId:
        abdmFacilityId !== null &&
        abdmFacilityId !== undefined &&
        abdmFacilityId !== ""
          ? abdmFacilityId
          : null,
      abdmFacilityName:
        abdmFacilityName !== null &&
        abdmFacilityName !== undefined &&
        abdmFacilityName !== ""
          ? abdmFacilityName
          : null,
    };
    this.registrarService
      .verifyOtpForMappingCarecontext(verifyOtpData)
      .subscribe(
        (verifiedMappingData: any) => {
          if (verifiedMappingData.statusCode === 200) {
            this.showProgressBar = false;
            this.confirmationService.alert(
              verifiedMappingData.data.response,
              "success",
            );
            this.closeDialog();
          } else {
            this.showProgressBar = false;
            this.confirmationService.alert(
              verifiedMappingData.errorMessage,
              "error",
            );
          }
        },
        (err) => {
          this.showProgressBar = false;
          this.confirmationService.alert(err.errorMessage, "error");
        },
      );
  }
  resendOtp() {
    this.healthIdOTPForm.controls["otp"].reset;
    this.healthIdOTPForm.controls["otp"].patchValue(null);
    this.generateOtpForMapping();
  }
  closeDialog() {
    this.dialogRef.close();
  }

  printHealthIDCard(data: any) {
    // Close any lingering confirmation alert before opening the print dialog
    this.closeConfirmationAlertIfOpen();

    const dialogRefValue = this.dialogMd.open(DownloadSearchAbhaComponent, {
      height: "330px",
      width: "500px",
      disableClose: true,
      data: {
        printCard: true,
        healthId: data.healthId,
      },
    });
  }
}
