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

  private getRequestIdStorageKey(): string {
    const abha = this.selectedHealthID?.healthIdNumber ?? null;
    const fallback =
      this.beneficiaryDetails?.beneficiaryID ?? "unknown_beneficiary";
    return `linkRequestId_${abha ?? fallback}`;
  }

  private persistRequestIdToSession(requestId: string) {
    try {
      const key = this.getRequestIdStorageKey();
      // use your sessionstorage service if available; fallback to window.sessionStorage
      if (
        this.sessionstorage &&
        typeof this.sessionstorage.setItem === "function"
      ) {
        this.sessionstorage.setItem(key, requestId);
      } else {
        sessionStorage.setItem(key, requestId);
      }
      console.debug(`[link] persisted requestId ${requestId} to ${key}`);
    } catch (e) {
      console.warn("[link] failed to persist requestId to sessionStorage", e);
    }
  }

  private readRequestIdFromSession(): string | null {
    try {
      const key = this.getRequestIdStorageKey();
      if (
        this.sessionstorage &&
        typeof this.sessionstorage.getItem === "function"
      ) {
        return this.sessionstorage.getItem(key);
      }
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn("[link] failed to read requestId from sessionStorage", e);
      return null;
    }
  }

  private extractRequestIdFromString(s?: string): string | null {
    if (!s) return null;
    const match = s.match(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
    );
    return match ? match[0] : null;
  }

  // ---------- Primary: generateTokenForLinking() (single combined version) ----------
  generateTokenForLinking() {
    // guard: prevent concurrent generates
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

        // normalize any Error payload (backend might use `error` or `Error`)
        const dataError = data?.Error ?? data?.error ?? null;
        if (dataError) {
          // persist requestId if backend included it alongside the error
          if (data?.requestId) this.persistRequestIdToSession(data.requestId);

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

        // happy path: linkToken present -> start polling
        if (data?.linkToken) {
          if (data?.requestId) this.persistRequestIdToSession(data.requestId);
          this.linkToken = data.linkToken;
          this.confirmationService.alert(
            this.currentLanguageSet.pleaseWaitWhileLinkingCareContext ||
              "Please wait while linking care context",
            "info",
          );
          this.startLinkCareContextPolling();
          return;
        }

        // CASE: data.requestId present (no linkToken)
        if (data?.requestId && !data?.linkToken) {
          // persist and immediately call second API to resume/check status
          const requestId = data.requestId;
          this.persistRequestIdToSession(requestId);
          this.confirmationService.alert(
            "Request received. Resuming check with server...",
            "info",
          );

          // call second API to resume — this will either return linkToken, linked, or an error
          this.resumeViaSecondApi(requestId, reqObj);
          return;
        }

        // Fallback: some servers return duplicate as a wrapped string in res.errorMessage/status
        const fallbackMsg =
          res?.errorMessage ?? res?.status ?? "Failed to generate link token";

        if (
          String(fallbackMsg).toLowerCase().includes("duplicate") ||
          String(fallbackMsg).toLowerCase().includes("abdm-1092")
        ) {
          // existing duplicate flow: call second API (it will try stored/extracted reqId)
          this.handleDuplicateByCallingSecondApi(reqObj, fallbackMsg);
          return;
        }

        // fallback generic
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

        // Duplicate returned as Http error string
        if (
          String(errMsg).toLowerCase().includes("duplicate") ||
          String(errMsg).toLowerCase().includes("abdm-1092")
        ) {
          this.handleDuplicateByCallingSecondApi(reqObj, errMsg);
          return;
        }

        // Aadhaar mismatch as structured error in error body
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

  /**
   * When the first API tells us it's a duplicate, resume using the second API (linkCareContext)
   * with the stored/extracted requestId. If none is found, ask the user/dev to follow up.
   */
  private handleDuplicateByCallingSecondApi(
    originalReqObj: any,
    rawMsg: string,
  ) {
    // 1) try sessionStorage for an earlier requestId
    const stored = this.readRequestIdFromSession();
    if (stored) {
      this.confirmationService.alert(
        "Duplicate token detected. Resuming using stored RequestId.",
        "info",
      );
      this.resumeViaSecondApi(stored, originalReqObj);
      return;
    }

    // 2) try to extract requestId from the raw error string
    const extracted = this.extractRequestIdFromString(rawMsg);
    if (extracted) {
      this.persistRequestIdToSession(extracted);
      this.confirmationService.alert(
        "Duplicate token detected. Resuming using extracted RequestId.",
        "info",
      );
      this.resumeViaSecondApi(extracted, originalReqObj);
      return;
    }

    // 3) nothing found -> inform user/dev to share original request details
    this.confirmationService.alert(
      "Duplicate token request detected but no RequestId found locally. Please contact server with the error details.",
      "error",
    );
    console.warn(
      "[link] duplicate token but no requestId found. rawMsg:",
      rawMsg,
    );
  }

  /**
   * Call the second API (linkCareContext) with requestId so backend can look up in Mongo.
   * Handles possible responses:
   *  - data.Error -> Aadhaar mismatch (open dialog) or other error
   *  - data.linkToken -> set token and start polling
   *  - data.linked / data.careContextId -> success (stop)
   *  - data.requestId -> persist and inform user
   *  - fallback -> show friendly message
   */
  /**
   * Resume via second API with polling (5s interval, 3 attempts total).
   * Handles cases where response may be empty or delayed.
   */
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

    this.showProgressBar = true;
    this.isGenerating = false;

    let attempts = 0;
    const maxAttempts = 3;
    const delayMs = 5000;

    if (this.linkPollingSub) {
      this.linkPollingSub.unsubscribe();
      this.linkPollingSub = null;
    }

    this.linkPollingSub = interval(delayMs)
      .pipe(startWith(0))
      .subscribe(() => {
        attempts++;
        this.registrarService.linkCareContext(reqObj).subscribe(
          (res: any) => {
            const data = res?.data ?? null;
            const isEmpty = data && Object.keys(data).length === 0;
            const respError = data?.Error ?? data?.error ?? null;

            // Error case (e.g. Aadhaar mismatch)
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

            // Success markers (linked)
            const linkedFlag =
              data?.statusCode === 200 && data?.status === "Success";

            if (linkedFlag) {
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(
                this.currentLanguageSet.linkSuccess ||
                  "Care context linked successfully",
                "success",
              );
              this.linkToken = null;
              return;
            }

            // If linkToken returned → start normal polling
            if (data?.linkToken) {
              this.persistRequestIdToSession(data?.requestId ?? requestId);
              this.linkToken = data.linkToken;
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(
                this.currentLanguageSet.pleaseWaitWhileLinkingCareContext ||
                  "Please wait while linking care context",
                "info",
              );
              this.startLinkCareContextPolling();
              return;
            }

            // If still empty → continue retrying until attempts done
            if (isEmpty) {
              console.debug(
                `[link] resumeViaSecondApi: empty response attempt ${attempts}/${maxAttempts}`,
              );
              if (attempts >= maxAttempts) {
                this.stopLinkCareContextPolling();
                this.showProgressBar = false;
                this.confirmationService.alert(
                  `Still processing. Please try again later with RequestId: ${requestId}`,
                  "info",
                );
              }
              return;
            }

            // fallback
            if (attempts >= maxAttempts) {
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(
                res?.errorMessage ?? "Failed to resume request",
                "error",
              );
            }
          },
          (err) => {
            if (attempts >= maxAttempts) {
              const msg =
                err?.error?.message ??
                err?.message ??
                "Failed after retries (resumeViaSecondApi)";
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(msg, "error");
            } else {
              console.warn(
                "[link] resumeViaSecondApi retrying after error",
                err,
              );
            }
          },
        );
      });
  }

  // ---------- startLinkCareContextPolling() - ORIGINAL style (unchanged) ----------
  /**
   * Polls linkCareContext every 5s for up to 3 attempts when linkToken is present.
   * Stops when linked, error, or Aadhaar mismatch occurs.
   */
  private startLinkCareContextPolling() {
    if (this.isPollingLink) return;
    if (!this.linkToken) {
      this.confirmationService.alert(
        "No link token available to start linking",
        "error",
      );
      return;
    }

    this.isPollingLink = true;
    this.isGenerating = false;
    this.showProgressBar = true;
    let attempts = 0;
    const maxAttempts = 3;
    const delayMs = 5000;

    if (this.linkPollingSub) {
      this.linkPollingSub.unsubscribe();
      this.linkPollingSub = null;
    }

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

    this.linkPollingSub = interval(delayMs)
      .pipe(startWith(0))
      .subscribe(() => {
        attempts++;
        const reqObj = makeReqObj();

        this.registrarService.linkCareContext(reqObj).subscribe(
          (res: any) => {
            const data = res?.data ?? null;
            const isEmpty = data && Object.keys(data).length === 0;
            const respError = data?.Error ?? data?.error ?? null;

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

            const linkedFlag =
              data?.statusCode === 200 && data?.status === "Success";

            if (linkedFlag) {
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(
                this.currentLanguageSet.linkSuccess ||
                  "Care context linked successfully",
                "success",
              );
              this.linkToken = null;
              return;
            }

            // Empty data → retry until maxAttempts
            if (isEmpty) {
              console.debug(
                `[link] startLinkCareContextPolling: empty response attempt ${attempts}/${maxAttempts}`,
              );
              if (attempts >= maxAttempts) {
                this.stopLinkCareContextPolling();
                this.showProgressBar = false;
                this.confirmationService.alert(
                  "Linking is still processing. Please try again later.",
                  "info",
                );
              }
              return;
            }

            // linkToken updated mid-poll (rare)
            if (data?.linkToken && !this.linkToken) {
              this.linkToken = data.linkToken;
            }

            // fallback after all retries
            if (attempts >= maxAttempts) {
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              const msg =
                res?.errorMessage ??
                "Linking care context failed after maximum retries";
              this.confirmationService.alert(msg, "error");
            }
          },
          (err) => {
            if (attempts >= maxAttempts) {
              const msg =
                err?.error?.message ??
                err?.message ??
                "Linking care context failed after retries";
              this.stopLinkCareContextPolling();
              this.showProgressBar = false;
              this.confirmationService.alert(msg, "error");
            } else {
              console.warn(
                "[link] startLinkCareContextPolling retrying...",
                err,
              );
            }
          },
        );
      });
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
          if (data?.requestId) this.persistRequestIdToSession(data.requestId);

          this.confirmationService.alert(
            this.currentLanguageSet?.pleaseWaitWhileLinkingCareContext ||
              "Please wait while linking care context",
            "info",
          );
          this.generateResubmitAttempts = 0;
          this.startLinkCareContextPolling();
          return;
        }

        // CASE 3: Success (200) but only requestId, no linkToken
        if (data?.requestId && !data?.linkToken) {
          this.persistRequestIdToSession(data.requestId);
          this.confirmationService.alert(
            "Request received, checking server for existing link...",
            "info",
          );

          // immediately call the second API (resume logic)
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
          this.handleDuplicateByCallingSecondApi(reqObj, fallbackMsg);
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
          this.handleDuplicateByCallingSecondApi(reqObj, errMsg);
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
