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
import { Component, DoCheck, Inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { SetLanguageComponent } from 'src/app/app-modules/core/components/set-language.component';
import { ConfirmationService } from 'src/app/app-modules/core/services';
import { HttpServiceService } from 'src/app/app-modules/core/services/http-service.service';
import { RegistrarService } from '../../services/registrar.service';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { SessionStorageService } from '../../services/session-storage.service';
import { DownloadSearchAbhaComponent } from '../download-search-abha/download-search-abha.component';

@Component({
  selector: 'app-health-id-display-modal',
  templateUrl: './health-id-display-modal.component.html',
  styleUrls: ['./health-id-display-modal.component.css'],
  providers: [
    {
      provide: DatePipe,
    },
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'en-US', // Set the desired locale (e.g., 'en-GB' for dd/MM/yyyy)
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
          dateInput: 'LL',
        },
        display: {
          dateInput: 'DD/MM/YYYY', // Set the desired display format
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
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
    'sno',
    'abhaNumber',
    'abha',
    'dateOfCreation',
    'abhaMode',
  ];
  searchDetails = new MatTableDataSource<any>();

  displayedColumns1: any = [
    'sno',
    'abhaNumber',
    'abha',
    'dateOfCreation',
    'abhaMode',
    'action',
  ];
  displayedColumns2: any = [
    'sno',
    'healthIDNo',
    'healthID',
    'createdDate',
    'healthIDMode',
    'rblMode',
  ];
  healthIDArray = new MatTableDataSource<any>();

  constructor(
    public dialogRef: MatDialogRef<HealthIdDisplayModalComponent>,
    @Inject(MAT_DIALOG_DATA) public input: any,
    public httpServiceService: HttpServiceService,
    private formBuilder: FormBuilder,
    private registrarService: RegistrarService,
    private confirmationService: ConfirmationService,
    private datePipe: DatePipe,
    private dialogMd: MatDialog,
    private sessionstorage:SessionStorageService,
  ) {
    dialogRef.disableClose = true;
  }

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
    if (
      this.input.dataList !== undefined &&
      this.input.search === true
    ) {
      let tempVal: any = this.input.dataList;
      this.benDetails = this.input.dataList;
      let tempCreatDate: any = this.input.dataList.createdDate;
      console.log("tempVal", tempVal);
        this.searchDetails.data.push(tempVal);
        console.log("this.searchDetails.data%%", this.searchDetails.data)

    }
    if (this.input.dataList !== undefined &&
      this.input.dataList.data?.BenHealthDetails !== undefined
    ){
      this.benDetails = this.input.dataList.data.BenHealthDetails;
      console.log("this.benDetails1",this.benDetails)
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
          'yyyy-MM-dd hh:mm:ss a',
        );
        this.healthIDArray.data.push(healthID);
      });
    }
  }

  onRadioChange(data: any) {
    this.selectedHealthID = data;
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
      abdmFacilityId: (abdmFacilityId !== null && abdmFacilityId !== undefined && abdmFacilityId !== "") ? abdmFacilityId : null,
      abdmFacilityName: (abdmFacilityName !== null && abdmFacilityName !== undefined && abdmFacilityName !== "") ? abdmFacilityName : null
    };
    this.registrarService.generateOtpForMappingCareContext(reqObj).subscribe(
      (receivedOtpResponse: any) => {
        if (receivedOtpResponse.statusCode === 200) {
          this.showProgressBar = false;
          this.confirmationService.alert(
            this.currentLanguageSet.OTPSentToRegMobNo,
            'success',
          );
          this.transactionId = receivedOtpResponse.data.txnId;
          this.enablehealthIdOTPForm = true;
        } else {
          this.confirmationService.alert(
            receivedOtpResponse.errorMessage,
            'error',
          );
          this.enablehealthIdOTPForm = false;
          this.showProgressBar = false;
        }
      },
      (err) => {
        this.showProgressBar = false;
        this.confirmationService.alert(err.errorMessage, 'error');
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
    const otp = this.healthIdOTPForm.controls['otp'].value;
    let cflag = false;
    if (otp !== '' && otp !== undefined && otp !== null) {
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
      otp: this.healthIdOTPForm.controls['otp'].value,
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
        this.sessionstorage.getItem('visitCategory') === 'General OPD (QC)'
          ? 'Emergency'
          : this.sessionstorage.getItem('visitCategory'),
      abdmFacilityId: (abdmFacilityId !== null && abdmFacilityId !== undefined && abdmFacilityId !== "") ? abdmFacilityId : null,
      abdmFacilityName: (abdmFacilityName !== null && abdmFacilityName !== undefined && abdmFacilityName !== "") ? abdmFacilityName : null
    };
    this.registrarService
      .verifyOtpForMappingCarecontext(verifyOtpData)
      .subscribe(
        (verifiedMappingData: any) => {
          if (verifiedMappingData.statusCode === 200) {
            this.showProgressBar = false;
            this.confirmationService.alert(
              verifiedMappingData.data.response,
              'success',
            );
            this.closeDialog();
          } else {
            this.showProgressBar = false;
            this.confirmationService.alert(
              verifiedMappingData.errorMessage,
              'error',
            );
          }
        },
        (err) => {
          this.showProgressBar = false;
          this.confirmationService.alert(err.errorMessage, 'error');
        },
      );
  }
  resendOtp() {
    this.healthIdOTPForm.controls['otp'].reset;
    this.healthIdOTPForm.controls['otp'].patchValue(null);
    this.generateOtpForMapping();
  }
  closeDialog() {
    this.dialogRef.close();
  }

  printHealthIDCard(data: any) {
    const dialogRefValue = this.dialogMd.open(DownloadSearchAbhaComponent, {
      height: '330px',
      width: '500px',
      disableClose: true, 
      data: {
        printCard: true,
        healthId: data.healthId 
      }
    });
  }
}
