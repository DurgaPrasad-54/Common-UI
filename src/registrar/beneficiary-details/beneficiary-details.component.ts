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
import {
  Component,
  DoCheck,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { SetLanguageComponent } from 'src/app/app-modules/core/components/set-language.component';
import {
  BeneficiaryDetailsService,
  ConfirmationService,
} from 'src/app/app-modules/core/services';
import { HttpServiceService } from 'src/app/app-modules/core/services/http-service.service';
import { RegistrarService } from '../services/registrar.service';
import { SessionStorageService } from '../services/session-storage.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-beneficiary-details',
  templateUrl: './beneficiary-details.component.html',
  styleUrls: ['./beneficiary-details.component.css'],
})
export class BeneficiaryDetailsComponent implements OnInit, DoCheck, OnDestroy {
  beneficiary: any;
  today: any;
  beneficiaryDetailsSubscription: any;
  familyIdStatusStatusSubscription!: Subscription;
  current_language_set: any;
  benDetails: any;
  healthIDArray: any = [];
  healthIDValue = '';
  beneficiaryId: any;
  benFlowStatus = false;
  getBenFamilyData = false;
  benFamilySubscription!: Subscription;
  benFamilyId: any;
  beneficiaryName: any;
  firstName: any;
  lastName: any;
  regDate: any;
  isEnableES: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private beneficiaryDetailsService: BeneficiaryDetailsService,
    public httpServiceService: HttpServiceService,
    private registrarService: RegistrarService,
    private confirmationService: ConfirmationService,
    private sessionstorage: SessionStorageService,
  ) {}

  ngOnInit() {
    this.isEnableES = environment.isEnableES || false;
    this.assignSelectedLanguage();
    this.today = new Date();
    this.getHealthIDDetails();
    const benFlowID = this.sessionstorage.getItem('benFlowID');
    if (benFlowID) {
      this.getBenDetails();
      this.benFlowStatus = true;
    } else {
      this.getBenFamilyDetails();
      this.benFlowStatus = false;
    }
    this.benFamilySubscription =
      this.registrarService.benFamilyDetails$.subscribe((response: any) => {
        this.benFamilyId = response;
      });
  }

  ngDoCheck() {
    this.assignSelectedLanguage();
  }

  assignSelectedLanguage() {
    const getLanguageJson = new SetLanguageComponent(this.httpServiceService);
    getLanguageJson.setLanguage();
    this.current_language_set = getLanguageJson.currentLanguageObject;
  }

  ngOnDestroy() {
    if (this.beneficiaryDetailsSubscription)
      this.beneficiaryDetailsSubscription.unsubscribe();
    this.sessionstorage.removeItem('benFlowID');
    if (this.benFamilySubscription) this.benFamilySubscription.unsubscribe();
  }

  getBenDetails() {
    const benFlowID: any = this.sessionstorage.getItem('benFlowID');
    this.route.params.subscribe((param) => {
      this.beneficiaryDetailsService.getBeneficiaryDetails(
        param['beneficiaryRegID'],
        benFlowID,
      );
      this.beneficiaryDetailsSubscription =
        this.beneficiaryDetailsService.beneficiaryDetails$.subscribe((res) => {
          if (res !== null) {
            this.beneficiary = res;
            if (res.serviceDate) {
              this.today = res.serviceDate;
            }
          }
        });

      this.beneficiaryDetailsService
        .getBeneficiaryImage(param['beneficiaryRegID'])
        .subscribe((data: any) => {
          if (data && data.benImage) {
            this.beneficiary.benImage = data.benImage;
          }
        });
    });
  }

  getBenFamilyDetails() {
    this.route.params.subscribe((param) => {
      const beneficiaryId = param['beneficiaryId'];
      const benFlowID = param['beneficiaryRegID'];

      // Fetch beneficiary details based on search method
      const searchObservable = this.isEnableES
        ? this.searchWithElasticsearch(beneficiaryId)
        : this.searchTraditional(beneficiaryId);

      searchObservable.subscribe({
        next: (res: any) => this.handleSearchResponse(res),
        error: (err: any) => this.handleSearchError(err),
      });

      // Fetch beneficiary image independently
      this.fetchBeneficiaryImage(benFlowID);
    });
  }

  private searchWithElasticsearch(searchTerm: string) {
    return this.registrarService.identityQuickSearchES({ search: searchTerm });
  }

  private searchTraditional(beneficiaryId: string) {
    const reqObj = {
      beneficiaryRegID: null,
      beneficiaryName: null,
      beneficiaryID: beneficiaryId,
      phoneNo: null,
      HealthID: null,
      HealthIDNumber: null,
      familyId: null,
      identity: null,
    };
    return this.registrarService.identityQuickSearch(reqObj);
  }

  private handleSearchResponse(res: any) {
    if (!res?.data || res.data.length === 0) {
      this.showAlert(
        this.current_language_set?.alerts?.info?.beneficiarynotfound ||
          'Beneficiary not found',
        'info'
      );
      return;
    }

    if (res.data.length > 1) {
      this.showAlert(
        'Multiple beneficiaries found with this ID. Please use advanced search.',
        'info'
      );
      return;
    }

    // Single result found
    this.beneficiary = res.data[0];
    this.benFamilyId = res.data[0].familyID || res.data[0].familyId;
    this.beneficiaryName = this.formatBeneficiaryName(this.beneficiary);
    this.regDate = moment
      .utc(this.beneficiary.createdDate)
      .format('DD-MM-YYYY hh:mm A');
  }

  private formatBeneficiaryName(beneficiary: any): string {
    const { firstName, lastName } = beneficiary;
    return lastName?.trim() ? `${firstName} ${lastName}` : firstName;
  }

  private handleSearchError(err: any) {
    console.error('Error fetching beneficiary details:', err);
    this.showAlert('Error fetching beneficiary details', 'error');
  }

  private fetchBeneficiaryImage(benFlowID: string) {
    this.beneficiaryDetailsService
      .getBeneficiaryImage(benFlowID)
      .subscribe({
        next: (data: any) => {
          if (data?.benImage) {
            this.beneficiary.benImage = data.benImage;
          }
        },
        error: (err: any) => {
          console.error('Error fetching beneficiary image:', err);
          // Optionally show error to user or handle silently
        },
      });
  }

  private showAlert(message: string, type: string) {
    this.confirmationService.alert(message, type);
  }

  getHealthIDDetails() {
    this.route.params.subscribe((param) => {
      console.log('benID', param);
      const data = {
        beneficiaryRegID: param['beneficiaryRegID'],
        beneficiaryID: null,
      };
      this.registrarService.getHealthIdDetails(data).subscribe(
        (healthIDDetails: any) => {
          if (healthIDDetails.statusCode === 200) {
            console.log('healthID', healthIDDetails);
            if (
              healthIDDetails.data.BenHealthDetails !== undefined &&
              healthIDDetails.data.BenHealthDetails !== null
            ) {
              this.benDetails = healthIDDetails.data.BenHealthDetails;
              if (this.benDetails.length > 0) {
                this.benDetails.forEach((healthID: any, index: any) => {
                  if (
                    healthID.healthId !== undefined &&
                    healthID.healthId !== null &&
                    index !== this.benDetails.length - 1
                  )
                    this.healthIDArray.push(healthID.healthId + ',');
                  else if (
                    healthID.healthId !== undefined &&
                    healthID.healthId !== null
                  )
                    this.healthIDArray.push(healthID.healthId);
                  if (
                    healthID.healthId !== undefined &&
                    healthID.healthId !== null
                  )
                    this.healthIDValue =
                      this.healthIDValue + healthID.healthId + ',';
                });
              }
              if (
                this.healthIDValue !== undefined &&
                this.healthIDValue !== null &&
                this.healthIDValue.length > 1
              ) {
                this.healthIDValue = this.healthIDValue.substring(
                  0,
                  this.healthIDValue.length - 1,
                );
                this.beneficiaryDetailsService.healthID = this.healthIDValue;
              }
            }
          } else {
            this.confirmationService.alert(
              this.current_language_set.issueInGettingBeneficiaryABHADetails,
              'error',
            );
          }
        },
        (err: any) => {
          this.confirmationService.alert(
            this.current_language_set.issueInGettingBeneficiaryABHADetails,
            'error',
          );
        },
      );
    });
  }
}
