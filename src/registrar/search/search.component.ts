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
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  DoCheck,
  AfterViewChecked,
  OnDestroy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SearchDialogComponent } from '../search-dialog/search-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { SetLanguageComponent } from 'src/app/app-modules/core/components/set-language.component';
import {
  ConfirmationService,
  CameraService,
  BeneficiaryDetailsService,
} from 'src/app/app-modules/core/services';
import { HttpServiceService } from 'src/app/app-modules/core/services/http-service.service';
import { RegistrarService } from 'Common-UI/src/registrar/services/registrar.service';
import * as moment from 'moment';
import { environment } from 'src/environments/environment';
import { SessionStorageService } from '../services/session-storage.service';
import { HealthIdDisplayModalComponent } from '../abha-components/health-id-display-modal/health-id-display-modal.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

export interface Consent {
  consentGranted: string;
}

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent implements OnInit, DoCheck, AfterViewChecked, OnDestroy {
  rowsPerPage = 5;
  activePage = 1;
  pagedList = [];
  rotate = true;
  beneficiaryList: any;
  filteredBeneficiaryList: any = [];
  quicksearchTerm: any;
  advanceSearchTerm: any;
  blankTable = [1, 2, 3, 4, 5];
  languageComponent!: SetLanguageComponent;
  currentLanguageSet: any;
  searchPattern!: string;
  consentGranted: any;
  isEnableES: boolean = false;
  displayedColumns: string[] = [
    'edit',
    'beneficiaryID',
    'benName',
    'genderName',
    'age',
    'fatherName',
    'districtVillage',
    'phoneNo',
    'registeredOn',
    'abhaAddress',
    'image',
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator | null = null;
  dataSource = new MatTableDataSource<any>();
  searchCategory: any;

  // Add these for debounced search
  private searchSubject$ = new Subject<string>();
  private searchSubscription: any;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dialog: MatDialog,
    private httpServiceService: HttpServiceService,
    private confirmationService: ConfirmationService,
    private registrarService: RegistrarService,
    private cameraService: CameraService,
    private router: Router,
    private sessionstorage: SessionStorageService,
    private beneficiaryDetailsService: BeneficiaryDetailsService,
  ) {}

  ngOnInit() {
    this.fetchLanguageResponse();
    this.isEnableES = environment.isEnableES || false;
    console.log("IsEnable:", this.isEnableES);
    

    this.searchPattern = this.isEnableES ? '/^[a-zA-Z0-9]*$/;' : '/^[a-zA-Z0-9](.|@|-)*$/;';
    if (this.isEnableES) {
      this.setupDebouncedSearch();
    }
  }

  ngAfterViewChecked() {
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // Setup debounced search for typing
  setupDebouncedSearch() {
    this.searchSubscription = this.searchSubject$
      .pipe(
        debounceTime(500), // 500ms delay after typing stops
        distinctUntilChanged(), // Only emit if value changed
        switchMap((searchTerm: string) => {
          console.log('switchMap called with:', searchTerm); // Debug log
          // Validate alphanumeric
          const alphanumericPattern = /^[a-zA-Z0-9]*$/;
          if (!alphanumericPattern.test(searchTerm)) {
            this.confirmationService.alert(
              'Please enter valid alphanumeric input',
              'info'
            );
            return [];
          }
          console.log('Calling API with:', { search: searchTerm }); // Debug log
          // Call new ES API
          return this.registrarService.identityQuickSearchES({ search: searchTerm });
        })
      )
      .subscribe(
        (response: any) => {
          console.log('API Response:', response); // Debug log
          this.handleESSearchResponse(response);
        },
        (error: any) => {
          console.error('API Error:', error); // Debug log
          this.confirmationService.alert(error, 'error');
        }
      );
  }

  // Method to handle input changes with debounce (for typing)
  onSearchInputChange(searchTerm: string) {
    console.log('common UI onSearchInputChange called with:', searchTerm); // Debug log
    const trimmed = searchTerm?.trim() || '';
    console.log('Trimmed length:', trimmed.length); // Debug log
    if (trimmed.length >= 3) {
      console.log('Emitting to searchSubject$'); // Debug log
      this.searchSubject$.next(trimmed);
    } else if (trimmed.length === 0) {
      this.resetWorklist();
    }
  }

  // Method for search button click (immediate search, no debounce)
  onSearchButtonClick(searchTerm: any) {
    if (this.isEnableES) {
      // ES Flow: Immediate search with alphanumeric validation
      console.log('ES: Button click with:', searchTerm);
      if (!searchTerm || searchTerm.trim().length < 3) {
        this.confirmationService.alert(
          'Please enter at least 3 characters',
          'info'
        );
        this.resetWorklist();
        return;
      }

      const trimmed = searchTerm.trim();
      const alphanumericPattern = /^[a-zA-Z0-9]*$/;
      if (!alphanumericPattern.test(trimmed)) {
        this.confirmationService.alert(
          'Please enter valid alphanumeric input',
          'info'
        );
        return;
      }

      console.log('ES: Calling API directly with:', { search: trimmed });
      this.registrarService.identityQuickSearchES({ search: trimmed })
        .subscribe(
          (response: any) => {
            console.log('ES: Button API Response:', response);
            this.handleESSearchResponse(response);
          },
          (error: any) => {
            console.error('ES: Button API Error:', error);
            this.confirmationService.alert(error, 'error');
          }
        );
    } else {
      // Old Flow: Use existing identityQuickSearch method
      console.log('Old API: Button click with:', searchTerm);
      this.identityQuickSearch(searchTerm);
    }
  }


  // Common method to handle ES API response
  handleESSearchResponse(response: any) {
    if (!response?.data || response.data.length === 0) {
      this.resetWorklist();
      this.confirmationService.alert(
        this.currentLanguageSet?.alerts?.info?.beneficiarynotfound || 'Beneficiary not found',
        'info'
      );
    } else {
      this.beneficiaryList = this.searchRestructES(response.data);
      this.filteredBeneficiaryList = this.beneficiaryList;
      this.dataSource.data = this.beneficiaryList;
      this.dataSource.paginator = this.paginator;
      console.log('Updated dataSource:', this.dataSource.data); // Debug log
      this.changeDetectorRef.detectChanges();
    }
  }

  // Restructure ES API response
  searchRestructES(benList: any[]) {
    const requiredBenData: any[] = [];
    benList.forEach((element: any) => {
      requiredBenData.push({
        beneficiaryID: element.beneficiaryID,
        beneficiaryRegID: element.beneficiaryRegID,
        benName: `${element.firstName} ${element.lastName || ''}`,
        genderName: element.m_gender?.genderName || element.genderName || 'Not Available',
        fatherName: element.fatherName || 'Not Available',
        districtName: element.i_bendemographics?.districtName || 'Not Available',
        villageName: element.i_bendemographics?.villageName || 
                     element.i_bendemographics?.districtBranchName || 'Not Available',
        phoneNo: element.benPhoneMaps?.[0]?.phoneNo || 'Not Available',
        age: moment(element.dob || element.dOB).fromNow(true) === 'a few seconds'
          ? 'Not Available'
          : moment(element.dob || element.dOB).fromNow(true),
        registeredOn: moment(element.createdDate).format('DD-MM-YYYY'),
        benObject: element,
      });
    });
    console.log('Restructured data:', requiredBenData); // Debug log
    return requiredBenData;
  }

  // Reset worklist
  resetWorklist() {
    this.beneficiaryList = [];
    this.filteredBeneficiaryList = [];
    this.dataSource.data = [];
    this.pagedList = [];
  }

  // Keep old method for backward compatibility (used in advanced search, etc.)
  identityQuickSearch(searchTerm: any) {
    console.log("Entered old search");
    
    const searchObject = {
      beneficiaryRegID: null,
      beneficiaryID: null,
      phoneNo: null,
      HealthID: null,
      HealthIDNumber: null,
      familyId: null,
      identity: null,
    };
    if (
      searchTerm === undefined ||
      searchTerm.trim() === '' ||
      searchTerm.trim().length <= 0
    ) {
      this.confirmationService.alert(
        this.currentLanguageSet.alerts.info.pleaseenterBeneficiaryID,
        'info',
      );
    } else {
      if (
        searchTerm.trim().length === 10 ||
        searchTerm.trim().length === 12 ||
        searchTerm.trim().length === 14 ||
        searchTerm.trim().length === 17
      ) {
        if (searchTerm.trim().length === 10) {
          searchObject['phoneNo'] = searchTerm;
        } else if (searchTerm.trim().length === 12) {
          searchObject['beneficiaryID'] = searchTerm;
        } else if (
          searchTerm.trim().length === 14 ||
          searchTerm.trim().length === 17
        ) {
          searchObject['HealthID'] = searchTerm;
          searchObject['HealthIDNumber'] = searchTerm;
        }
        this.registrarService.identityQuickSearch(searchObject).subscribe(
          (beneficiaryList: any) => {
            if (!beneficiaryList || beneficiaryList.length <= 0) {
              this.beneficiaryList = [];
              this.filteredBeneficiaryList = [];
              this.dataSource.data = [];
              console.log('this.dataSource.data1', this.dataSource.data);
              this.dataSource.paginator = this.paginator;
              this.confirmationService.alert(
                this.currentLanguageSet.alerts.info.beneficiarynotfound,
                'info',
              );
            } else {
              this.beneficiaryList = this.searchRestruct(
                beneficiaryList,
                searchObject,
              );
              console.log('this.beneficiaryList2', this.beneficiaryList);
              this.filteredBeneficiaryList = this.beneficiaryList;
              this.dataSource.data = this.beneficiaryList;
              console.log('this.dataSource.data2', this.dataSource.data);
              this.dataSource.paginator = this.paginator;
            }
            console.log('hi', JSON.stringify(beneficiaryList, null, 4));
          },
          (error) => {
            this.confirmationService.alert(error, 'error');
          },
        );
      } else {
        this.confirmationService.alert(
          this.currentLanguageSet.alerts.info.phoneDetails,
          'info',
        );
      }
    }
  }

  getHealthIDDetails(data: any) {
    console.log('data', data);
    if (
      data.benObject != undefined &&
      data.benObject.abhaDetails != undefined &&
      data.benObject.abhaDetails != null &&
      data.benObject.abhaDetails.length > 0
    ) 
    {
      this.dialog.open(HealthIdDisplayModalComponent, {
        data: { dataList: data.benObject.abhaDetails[0], search: true },
      });
    } else
      this.confirmationService.alert(
        this.currentLanguageSet.abhaDetailsNotAvailable,
        'info',
      );
  }

  /**
   * ReStruct the response object of Identity Search to be as per search table requirements
   */
  searchRestruct(benList: any, benObject: any) {
    const requiredBenData: any = [];
    benList.data.forEach((element: any, i: any) => {
      requiredBenData.push({
        beneficiaryID: element.beneficiaryID,
        beneficiaryRegID: element.beneficiaryRegID,
        benName: `${element.firstName} ${element.lastName || ''}`,
        genderName: `${element.genderName || 'Not Available'}`,
        fatherName: `${element.fatherName || 'Not Available'}`,
        districtName: `${
          element.i_bendemographics.districtName || 'Not Available'
        }`,
        villageName: `${
          element.i_bendemographics.districtBranchName || 'Not Available'
        }`,
        phoneNo: this.getCorrectPhoneNo(element.benPhoneMaps, benObject),
        age:
          moment(element.dOB).fromNow(true) === 'a few seconds'
            ? 'Not Available'
            : moment(element.dOB).fromNow(true),
        registeredOn: moment(element.createdDate).format('DD-MM-YYYY'),
        benObject: element,
      });
    });
    console.log(JSON.stringify(requiredBenData, null, 4), 'yoooo!');
    console.log('requiredBenData', JSON.stringify(requiredBenData));
    return requiredBenData;
  }

  pageChanged(event: any): void {
    console.log('called', event);
    const startItem = (event.page - 1) * event.itemsPerPage;
    const endItem = event.page * event.itemsPerPage;
    this.pagedList = this.filteredBeneficiaryList.slice(startItem, endItem);
    console.log('list', this.pagedList);
  }

  getCorrectPhoneNo(phoneMaps: any[], benObject: any): string {
    if (!phoneMaps || !phoneMaps.length) {
      return 'Not Available';
    }

    if (benObject && benObject.phoneNo) {
      for (const elem of phoneMaps) {
        if (elem.phoneNo === benObject.phoneNo) {
          return elem.phoneNo;
        }
      }
    }

    return phoneMaps[0].phoneNo;
  }

  filterBeneficiaryList(searchTerm?: string) {
    if (!searchTerm) this.filteredBeneficiaryList = this.beneficiaryList;
    else {
      this.filteredBeneficiaryList = [];
      this.dataSource.data = [];
      this.dataSource.paginator = this.paginator;
      this.beneficiaryList.forEach((item: any) => {
        for (const key in item) {
          if (key !== 'benObject') {
            const value: string = '' + item[key];
            if (value.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0) {
              (this.filteredBeneficiaryList as any[]).push(item);
              this.dataSource.data.push(item);
              this.dataSource.paginator = this.paginator;
              this.dataSource.data.forEach(
                (sectionCount: any, index: number) => {
                  sectionCount.sno = index + 1;
                },
              );
              break;
            }
          }
        }
      });
    }
  }

  patientRevisited(benObject: any) {
    if (
      benObject &&
      benObject.m_gender &&
      benObject.m_gender.genderName &&
      benObject.dOB
    ) {
      const action = false;
      console.log(JSON.stringify(benObject, null, 4), 'benObject');
      const serviceLineDetails: any =
        this.sessionstorage.getItem('serviceLineDetails');
      const vanID = JSON.parse(serviceLineDetails).vanID;
      benObject['providerServiceMapId'] =
        this.sessionstorage.getItem('providerServiceID');
      benObject['vanID'] = vanID;

      this.confirmationService
        .confirm(
          `info`,
          this.currentLanguageSet.alerts.info.confirmSubmitBeneficiary,
        )
        .subscribe((result) => {
          if (result) this.sendToNurseWindow(result, benObject);
        });
    } else if (!benObject.m_gender.genderName && !benObject.dOB) {
      this.confirmationService.alert(
        this.currentLanguageSet.alerts.info.genderAndAgeDetails,
        'info',
      );
    } else if (!benObject.m_gender.genderName) {
      this.confirmationService.alert(
        this.currentLanguageSet.alerts.info.noGenderDetails,
        'info',
      );
    } else if (!benObject.dOB) {
      this.confirmationService.alert(
        this.currentLanguageSet.alerts.info.noAgeDetailsAvail,
        'info',
      );
    }
  }

  editPatientInfo(beneficiary: any) {
    this.confirmationService
      .confirm(`info`, this.currentLanguageSet.alerts.info.editDetails)
      .subscribe((result) => {
        if (result) {
          this.registrarService.saveBeneficiaryEditDataASobservable(
            beneficiary.benObject,
          );
          console.log('beneficiaryyy details', beneficiary);
          this.router.navigate([
            '/registrar/search/' + beneficiary.beneficiaryID,
          ]);
        }
      });
  }

  sendToNurseWindow(userResponse: boolean, benObject: any) {
    if (userResponse) {
      this.registrarService.identityPatientRevisit(benObject).subscribe(
        (result: any) => {
          if (result.data)
            this.confirmationService.alert(result.data.response, 'success');
          else this.confirmationService.alert(result.status, 'warn');
        },
        (error) => {
          this.confirmationService.alert(error, 'error');
        },
      );
    }
  }

  patientImageView(benregID: any) {
    if (
      benregID &&
      benregID !== null &&
      benregID !== '' &&
      benregID !== undefined
    ) {
      this.beneficiaryDetailsService
        .getBeneficiaryImage(benregID)
        .subscribe((data: any) => {
          if (data && data.benImage)
            this.cameraService.viewImage(data.benImage);
          else
            this.confirmationService.alert(
              this.currentLanguageSet.alerts.info.imageNotFound,
            );
        });
    }
  }

  openSearchDialog() {
    const mdDialogRef: MatDialogRef<SearchDialogComponent> = this.dialog.open(
      SearchDialogComponent,
      {
        width: '60%',
        disableClose: false,
      },
    );

    mdDialogRef.afterClosed().subscribe((result) => {
      
      if (result) {
        this.advanceSearchTerm = result;
        this.registrarService
          .advanceSearchIdentity(this.advanceSearchTerm)
          .subscribe(
            (beneficiaryList: any) => {
              if (
                !beneficiaryList ||
                (beneficiaryList.data && beneficiaryList.data.length <= 0)
              ) {
                this.beneficiaryList = [];
                this.filteredBeneficiaryList = [];
                this.dataSource.data = [];
                console.log('this.dataSource.data3', this.dataSource.data);
                this.dataSource.paginator = this.paginator;
                this.quicksearchTerm = null;
                this.confirmationService.alert(
                  this.currentLanguageSet.alerts.info.beneficiaryNotFound,
                  'info',
                );
              } else {
                this.beneficiaryList = this.searchRestruct(beneficiaryList, {});
                this.filteredBeneficiaryList = this.beneficiaryList;
                this.dataSource.data = this.beneficiaryList;
                console.log('this.dataSource.data4', this.dataSource.data);
                this.dataSource.paginator = this.paginator;
                this.dataSource.data.forEach(
                  (sectionCount: any, index: number) => {
                    sectionCount.sno = index + 1;
                  },
                );
              }
              console.log(JSON.stringify(beneficiaryList, null, 4));
            },
            (error) => {
              this.confirmationService.alert(error, 'error');
            },
          );
      }
    });
  }

  navigateTORegistrar() {
    const link = '/registrar/registration';
    const currentRoute = this.router.routerState.snapshot.url;
    console.log('currentRoute', currentRoute);
    if (currentRoute !== link) {
      console.log('log in');
      if (this.beneficiaryList === undefined) {
        this.router.navigate([link]);
      } else if (this.beneficiaryList !== undefined) {
        if (this.beneficiaryList.length === 0) {
          this.router.navigate([link]);
        } else {
          this.confirmationService
            .confirm(
              `info`,
              `Do you really want to navigate? Any searched data would be lost`,
              'Yes',
              'No',
            )
            .subscribe((result) => {
              if (result) {
                this.router.navigate([link]);
              }
            });
        }
      }
    }
  }

  //AN40085822 13/10/2021 Integrating Multilingual Functionality --Start--
  ngDoCheck() {
    this.fetchLanguageResponse();
  }

  fetchLanguageResponse() {
    this.languageComponent = new SetLanguageComponent(this.httpServiceService);
    this.languageComponent.setLanguage();
    this.currentLanguageSet = this.languageComponent.currentLanguageObject;
  }
  //--End--
}