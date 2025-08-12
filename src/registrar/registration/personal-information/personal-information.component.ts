import { Component, Input } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  BeneficiaryDetailsService,
  CameraService,
  ConfirmationService,
} from 'src/app/app-modules/core/services';
import { RegistrarService } from '../../services/registrar.service';
import { Subscription } from 'rxjs';
import { SetLanguageComponent } from 'src/app/app-modules/core/components/set-language.component';
import * as moment from 'moment';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { HttpServiceService } from 'src/app/app-modules/core/services/http-service.service';
import { AmritTrackingService } from 'Common-UI/src/tracking';

@Component({
  selector: 'app-personal-information',
  templateUrl: './personal-information.component.html',
  styleUrls: ['./personal-information.component.css'],
  providers: [
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
export class PersonalInformationComponent {
  @Input()
  personalInfoFormGroup!: FormGroup;

  @Input()
  formData: any;

  @Input()
  patientRevisit = false;

  @Input()
  revisitData: any;

  masterDataSubscription!: Subscription;
  masterData: any;
  revisitDataSubscription!: Subscription;
  _parentBenRegID: any;
  dateForCalendar: any;
  currentLanguageSet: any;
  ageLimit = 120;
  ageforMarriage = 12;
  maritalStatusMaster: any;
  personalInfoSubscription!: Subscription;

  constructor(
    private fb: FormBuilder,
    private cameraService: CameraService,
    private registrarService: RegistrarService,
    private beneficiaryDetailsService: BeneficiaryDetailsService,
    private confirmationService: ConfirmationService,
    private languageComponent: SetLanguageComponent,
    private httpServiceService: HttpServiceService,
    private trackingService: AmritTrackingService 
  ) {
    this.personalInfoSubscription =
      this.registrarService.registrationABHADetails$.subscribe(
        (response: any) => {
          if (response) {
            console.log('responseMY', response);
            const formattedDate = response?.dob
              ? new Date(response?.dob)
              : null;
            console.log('formattedDate', formattedDate);
            this.personalInfoFormGroup.patchValue({
              firstName: response?.firstName,
              lastName: response?.lastName,
              phoneNo: response?.phoneNo,
              genderName: response?.genderName,
              dOB: formattedDate,
            });
          }
        }
      );
  }
  
  ngOnInit() {
    this.fetchLanguageResponse();
    this.formData.forEach((item: any) => {
      if (item.fieldName && item.allowText) {
        this.personalInfoFormGroup.addControl(
          item.fieldName,
          new FormControl(null, [
            Validators.pattern(this.allowTextValidator(item.allowText)),
            Validators.minLength(parseInt(item?.allowMin)),
            Validators.maxLength(parseInt(item?.allowMax)),
          ])
        );
      } else {
        this.personalInfoFormGroup.addControl(
          item.fieldName,
          new FormControl(null)
        );
      }
    });
    this.personalInfoFormGroup.addControl('image', new FormControl());
    console.log('personalInfoFormGroup Data', this.personalInfoFormGroup);
    if (this.patientRevisit) {
      this.personalInfoFormGroup.addControl(
        'beneficiaryRegID',
        new FormControl()
      );
      this.personalInfoFormGroup.addControl('beneficiaryID', new FormControl());
      this.personalInfoFormGroup.patchValue(this.revisitData);
      this.personalInfoFormGroup
        .get('phoneNo')
        ?.patchValue(this.revisitData.benPhoneMaps[0].phoneNo);
    }
    console.log('personal Form Data', this.formData);
    console.log('this.revist data - personal info', this.revisitData);
    this.setupFormValueChanges();

    this.setDateLimits();
  }

  /**
   * set Date Limits for Calendar and Age
   *
   */
  today!: Date;
  minDate!: Date;
  setDateLimits() {
    this.today = new Date();
    this.minDate = new Date();
    this.minDate.setFullYear(this.today.getFullYear() - (this.ageLimit + 1));
  }

  allowTextValidator(allowText: any) {
    let regex: RegExp;

    switch (allowText) {
      case 'alpha':
        regex = /^[a-zA-Z]*$/;
        break;
      case 'numeric':
        regex = /^[0-9]*$/;
        break;
      case 'alphaNumeric':
        regex = /^[a-zA-Z0-9]*$/;
        break;
      case 'alphaWithSpace':
        regex = /^[a-zA-Z ]*$/;
        break;
      default:
        regex = /^[a-zA-Z0-9 ]*$/;
        break;
    }

    return regex;
  }

  onInputChanged(event: Event, maxLength: any, fieldName: any) {
    const inputElement = event.target as HTMLInputElement;
    const inputValue = inputElement.value;

    if (maxLength && inputValue.length >= parseInt(maxLength)) {
      // Add 'A' character when the input length exceeds the limit
      inputElement.value = inputValue.slice(0, maxLength);
      this.personalInfoFormGroup.controls[fieldName].patchValue(
        inputElement.value
      );
      const currentErrors =
        this.personalInfoFormGroup.controls[fieldName].errors;
      if (currentErrors && currentErrors['maxlength']) {
        delete currentErrors['maxlength'];
      }
    }
  }

  captureImage() {
    this.cameraService.capture().subscribe((result: any) => {
      if (result) {
        if (this.patientRevisit) {
          this.personalInfoFormGroup.patchValue({
            imageChangeFlag: true,
          });
        }
        this.personalInfoFormGroup.patchValue({ image: result });
      }
    });
  }

  /**
   *
   * Load Basic Master Data Observable
   */
  loadMasterDataObservable() {
    this.masterDataSubscription =
      this.registrarService.registrationMasterDetails$.subscribe(res => {
        // console.log('res personal', res)
        if (res !== null) {
          this.masterData = res;
          console.log('masterData');
          if (this.patientRevisit) {
            this.loadPersonalDataForEditing();
          }
        }
      });
  }

  /**
   *
   * Load Personal Details Componen Details
   *
   */
  loadPersonalDataForEditing() {
    this.revisitDataSubscription =
      this.registrarService.beneficiaryEditDetails$.subscribe(res => {
        if (res && res.beneficiaryID) {
          this.revisitData = Object.assign({}, res);
          this.validateMaritalStatusMaster(this.revisitData);
          this.pushEditingDatatoForm(Object.assign({}, this.revisitData));
          this.getBenImage();
        }
      });
  }

  onGenderSelected() {
    const genderMaster = this.masterData.genderMaster;
    genderMaster.forEach((element: any, i: any) => {
      if (element.genderID === this.personalInfoFormGroup.value.gender) {
        this.personalInfoFormGroup.patchValue({
          genderName: element.genderName,
        });
      }
    });
    console.log(
      'this.masterData',
      genderMaster,
      this.masterData.maritalStatusMaster
    );

    if (this.personalInfoFormGroup.value.gender === 3) {
      this.confirmationService
        .confirm('info', 'You have selected Transgender, please confirm')
        .subscribe(
          res => {
            if (!res) {
              this.personalInfoFormGroup.patchValue({
                gender: null,
                genderName: null,
              });
            } else {
              this.maritalStatusMaster = this.masterData.maritalStatusMaster;
            }
          },
          err => {}
        );
    } else {
      this.maritalStatusMaster = this.masterData.maritalStatusMaster.filter(
        (maritalStatus: any) => {
          if (
            this.personalInfoFormGroup.value.gender === 1 &&
            maritalStatus.maritalStatusID !== 5
          ) {
            return maritalStatus;
          }
          if (
            this.personalInfoFormGroup.value.gender === 2 &&
            maritalStatus.maritalStatusID !== 6
          ) {
            return maritalStatus;
          }
        }
      );
    }
  }

  validateMaritalStatusMaster(revisitData: any) {
    if (revisitData.m_gender.genderID === 3) {
      this.maritalStatusMaster = this.masterData.maritalStatusMaster;
    } else {
      this.maritalStatusMaster = this.masterData.maritalStatusMaster.filter(
        (maritalStatus: any) => {
          if (
            revisitData.m_gender.genderID === 1 &&
            maritalStatus.maritalStatusID !== 5
          ) {
            return maritalStatus;
          }
          if (
            revisitData.m_gender.genderID === 2 &&
            maritalStatus.maritalStatusID !== 6
          ) {
            return maritalStatus;
          }
        }
      );
    }
  }

  changeLiteracyStatus() {
    const literacyStatus = this.personalInfoFormGroup.value.literacyStatus;

    if (literacyStatus !== 'Literate') {
      console.log(this.personalInfoFormGroup.controls, 'controls');
      // this.personalInfoFormGroup.controls['educationQualification'].clearValidators();
      console.log(
        this.personalInfoFormGroup.controls['educationQualification'],
        'controls'
      );
    } else {
      this.personalInfoFormGroup.controls['educationQualification'].reset();
    }
  }

  /**
   * Phone Number Parent Relations
   */
  getParentDetails() {
    const searchTerm = this.personalInfoFormGroup.value.phoneNo;
    const searchObject = {
      beneficiaryRegID: null,
      beneficiaryID: null,
      phoneNo: null,
    };
    if (searchTerm && searchTerm.trim().length === 10) {
      searchObject['phoneNo'] = searchTerm;
      this.registrarService.identityQuickSearch(searchObject).subscribe(
        (beneficiaryList: any) => {
          if (
            beneficiaryList &&
            beneficiaryList.length > 0 &&
            beneficiaryList[0].benPhoneMaps.length > 0
          ) {
            console.log(
              'ta d ad a d a',
              JSON.stringify(beneficiaryList, null, 4)
            );
            this.personalInfoFormGroup.patchValue({
              parentRegID: beneficiaryList[0].benPhoneMaps[0].parentBenRegID,
              parentRelation: 11,
            });
            console.log(this.personalInfoFormGroup.value.parentRegID);
          } else {
            this.personalInfoFormGroup.patchValue({
              parentRegID: null,
              parentRelation: 1,
            });
            console.log(this.personalInfoFormGroup.value.parentRegID);

            if (this.patientRevisit) {
              this.personalInfoFormGroup.patchValue({
                parentRegID: this.personalInfoFormGroup.value.beneficiaryRegID,
              });
              console.log(this.personalInfoFormGroup.value.parentRegID);
            }
          }
        },
        error => {
          this.confirmationService.alert(error, 'error');
          this.personalInfoFormGroup.patchValue({
            parentRegID: null,
            parentRelation: 1,
            phoneNo: null,
          });
        }
      );
    } else {
      if (this.patientRevisit) {
        this.personalInfoFormGroup.patchValue({
          parentRegID: this._parentBenRegID,
          parentRelation: null,
          phoneNo: null,
        });
      } else {
        this.personalInfoFormGroup.patchValue({
          parentRegID: null,
          parentRelation: null,
          phoneNo: null,
        });
      }
    }
  }
  /**
   *
   * Age Entered in Input
   */
  enableMaritalStatus = false;
  setupFormValueChanges() {
    // Listen to both age and ageUnits changes
    this.personalInfoFormGroup.get('age')!.valueChanges.subscribe(() => {
      this.onAgeOrUnitEntered();
    });

    this.personalInfoFormGroup.get('ageUnits')!.valueChanges.subscribe(() => {
      this.onAgeOrUnitEntered();
    });

    // Listen to dOB changes
    this.personalInfoFormGroup.get('dOB')!.valueChanges.subscribe(() => {
      this.dobChangeByCalender();
    });
  }

  onAgeOrUnitEntered() {
    const ageValue = this.personalInfoFormGroup.get('age')!.value;
    const ageUnits = this.personalInfoFormGroup.get('ageUnits')!.value;

    const benAge = parseInt(ageValue);

    if (benAge < 1) {
      this.personalInfoFormGroup.controls['age'].patchValue('');
    } else if (ageValue && ageUnits) {
      this.calculateDOB();
    }
  }

  calculateDOB() {
    const ageValue = this.personalInfoFormGroup.get('age')!.value;
    const ageUnits = this.personalInfoFormGroup.get('ageUnits')!.value;

    if (ageValue && ageUnits) {
      const valueEntered = parseInt(ageValue, 10);
      if (!isNaN(valueEntered)) {
        if (
          valueEntered > this.ageLimit &&
          ageUnits.toLowerCase() === 'years'
        ) {
          this.confirmationService.alert(
            'Age can only be set between Today to 120 Years',
            'info'
          );
          this.personalInfoFormGroup.patchValue({ age: null });
        } else {
          const dob = moment().subtract(valueEntered, ageUnits).toDate();
          const fromDate = moment(dob).toISOString();
          console.log('dob after conversion', fromDate);
          this.personalInfoFormGroup.patchValue(
            {
              dOB: fromDate,
            },
            { emitEvent: false }
          );
          this.checkAgeAtMarriage();
        }
      }
    }
  }

  dobChangeByCalender() {
    const dobValue = this.personalInfoFormGroup.get('dOB')?.value;
    const today = new Date();
    if (dobValue) {
      this.dateForCalendar = moment(dobValue);
      const date = new Date(this.dateForCalendar);

      if (
        this.dateForCalendar &&
        dobValue &&
        this.personalInfoFormGroup.controls['dOB'].valid
      ) {
        const dateDiff = Date.now() - date.getTime();
        const age = new Date(dateDiff);
        const yob = Math.abs(age.getUTCFullYear() - 1970);
        const mob = Math.abs(age.getUTCMonth());
        const dob = Math.abs(age.getUTCDate() - 1);
        if (yob > 0) {
          this.personalInfoFormGroup.patchValue(
            { age: yob, ageUnits: 'Years' },
            { emitEvent: false }
          );
        } else if (mob > 0) {
          this.personalInfoFormGroup.patchValue(
            { age: mob, ageUnits: 'Months' },
            { emitEvent: false }
          );
        } else if (dob > 0) {
          this.personalInfoFormGroup.patchValue(
            { age: dob, ageUnits: 'Days' },
            { emitEvent: false }
          );
        }

        if (date.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
          this.personalInfoFormGroup.patchValue(
            { age: 1, ageUnits: 'Days' },
            { emitEvent: false }
          );
        }

        this.checkAgeAtMarriage();
      } else if (dobValue === 'Invalid date') {
        this.personalInfoFormGroup.patchValue({ dOB: null });
        this.dateForCalendar = null;
        this.confirmationService.alert(
          this.currentLanguageSet.alerts.info.invalidData,
          'info'
        );
      } else {
        this.personalInfoFormGroup.patchValue({ age: null });
      }
    }
  }

  checkFieldValidations(field: any) {
    if (field?.fieldName === 'age') this.onAgeOrUnitEntered();
    else if (field?.fieldName === 'ageUnits') this.onAgeOrUnitEntered();
    else if (field?.fieldName?.toLowerCase() === 'dob')
      this.dobChangeByCalender();
    else if (field?.fieldName === 'ageAtMarriage') this.checkAgeAtMarriage();
  }

  /**
   * Income Status Select and get Name
   */
  onIncomeChanged() {
    const incomeMaster = this.masterData.incomeMaster;
    incomeMaster.forEach((element: any, i: any) => {
      if (element.incomeStatusID === this.personalInfoFormGroup.value.income) {
        this.personalInfoFormGroup.patchValue({
          incomeName: element.incomeStatus,
        });
      }
    });
  }

  /**
   *
   * Marital Status Changed
   */
  enableMarriageDetails = false;
  enableSpouseMandatory = false;
  onMaritalStatusChanged() {
    if (
      this.personalInfoFormGroup.value.maritalStatus === 1 ||
      this.personalInfoFormGroup.value.maritalStatus === 7
    ) {
      this.enableMarriageDetails = false;
      this.clearMarriageDetails();
    } else {
      this.enableMarriageDetails = true;
    }
    if (this.personalInfoFormGroup.value.maritalStatus === 2) {
      this.enableSpouseMandatory = true;
      this.clearMarriageDetails();
    } else {
      this.enableSpouseMandatory = false;
      this.clearMarriageDetails();
    }

    const maritalMaster = this.masterData.maritalStatusMaster;
    maritalMaster.forEach((element: any, i: any) => {
      if (
        element.maritalStatusID ===
        this.personalInfoFormGroup.value.maritalStatus
      ) {
        this.personalInfoFormGroup.patchValue({
          maritalStatusName: element.status,
        });
      }
    });
  }

  /**
   * Clear Marriage Details if Entered
   *
   */
  clearMarriageDetails() {
    if (this.personalInfoFormGroup.value.spouseName !== null) {
      this.personalInfoFormGroup.patchValue({ spouseName: null });
    }
    if (this.personalInfoFormGroup.value.ageAtMarriage !== null) {
      this.personalInfoFormGroup.patchValue({ ageAtMarriage: null });
    }
  }

  /**
   *
   * check for validity of Age At Marriage with other Details
   */
  checkAgeAtMarriage() {
    if (this.personalInfoFormGroup.value?.ageAtMarriage !== null) {
      if (this.personalInfoFormGroup.value.age === null) {
        this.confirmationService.alert(
          this.currentLanguageSet.common.pleaseenterBeneficiaryagefirst,
          'info'
        );
        this.personalInfoFormGroup.patchValue({ ageAtMarriage: null });
      } else if (
        this.personalInfoFormGroup.value.ageUnits &&
        this.personalInfoFormGroup.value.ageUnits.toLowerCase() !== 'years'
      ) {
        this.confirmationService.alert(
          this.currentLanguageSet.alerts.info.marriageAge +
            ' ' +
            this.ageforMarriage +
            ' ' +
            this.currentLanguageSet.alerts.info.years,
          'info'
        );
        this.personalInfoFormGroup.patchValue({ ageAtMarriage: null });
      } else if (this.personalInfoFormGroup.value.age < this.ageforMarriage) {
        this.confirmationService.alert(
          this.currentLanguageSet.alerts.info.marriageAge +
            ' ' +
            this.ageforMarriage +
            ' ' +
            this.currentLanguageSet.alerts.info.years,
          'info'
        );
        this.personalInfoFormGroup.patchValue({ ageAtMarriage: null });
      } else if (
        this.personalInfoFormGroup.value.ageAtMarriage < this.ageforMarriage
      ) {
        this.confirmationService.alert(
          this.currentLanguageSet.alerts.info.marriageAge +
            ' ' +
            this.ageforMarriage +
            ' ' +
            this.currentLanguageSet.alerts.info.years,
          'info'
        );
        this.personalInfoFormGroup.patchValue({ ageAtMarriage: null });
      } else if (
        this.personalInfoFormGroup.value.age -
          this.personalInfoFormGroup.value.ageAtMarriage <
        0
      ) {
        this.confirmationService.alert(
          this.currentLanguageSet.common.marriageatageismorethantheactualage,
          'info'
        );
        this.personalInfoFormGroup.patchValue({ ageAtMarriage: null });
      }
    }
  }

  /**
   * Occupation Name when ID is selected
   */
  getOccupationName() {
    this.masterData.occupationMaster.forEach((occupation: any) => {
      if (
        this.personalInfoFormGroup.value.occupation ===
          occupation.occupationID &&
        this.personalInfoFormGroup.value.occupation !== 7
      ) {
        this.personalInfoFormGroup.patchValue({
          occupationOther: occupation.occupationType,
        });
        console.log('reached form');
      }
    });

    if (
      !this.personalInfoFormGroup.value.occupationOther ||
      this.personalInfoFormGroup.value.occupation === 7
    ) {
      this.personalInfoFormGroup.patchValue({
        occupationOther: null,
      });
    }
  }

  /**
   * Education Qualification when ID is selected
   */
  onEducationQualificationChanged() {
    const qualificationMaster = this.masterData.qualificationMaster;
    qualificationMaster.forEach((element: any, i: any) => {
      if (
        element.educationID ===
        this.personalInfoFormGroup.value.educationQualification
      ) {
        this.personalInfoFormGroup.patchValue({
          educationQualificationName: element.educationType,
        });
      }
    });
  }

  /***
   *
   * Load Editing Data to Form
   */
  pushEditingDatatoForm(element: any) {
    console.log(element, 'datahere');
    this.dateForCalendar = moment(element.dOB).toDate(); //calendar ngModel
    this.personalInfoFormGroup.patchValue({
      beneficiaryID: element.beneficiaryID,
      beneficiaryRegID: element.beneficiaryRegID,
      firstName: element.firstName,
      lastName: element.lastName,
      benAccountID: element.benAccountID,
      phoneNo: this.getPhoneMaps(element.benPhoneMaps),
      parentRegID: `${
        (element.benPhoneMaps.length > 0 &&
          element.benPhoneMaps[0].parentBenRegID) ||
        null
      }`,
      parentRelation: `${
        (element.benPhoneMaps.length > 0 &&
          element.benPhoneMaps[0].benRelationshipID) ||
        null
      }`,
      benPhMapID: `${
        (element.benPhoneMaps.length > 0 &&
          element.benPhoneMaps[0].benPhMapID) ||
        null
      }`,
      benRelationshipType: `${
        (element.benPhoneMaps.length > 0 &&
          element.benPhoneMaps[0].benRelationshipType &&
          element.benPhoneMaps[0].benRelationshipType.benRelationshipType) ||
        null
      }`,
      gender: element.m_gender.genderID,
      genderName: element.m_gender.genderName,
      dOB: moment(element.dOB).toDate(),
      maritalStatus:
        (element.maritalStatus && element.maritalStatus.maritalStatusID) ||
        null,
      maritalStatusName: `${
        (element.maritalStatus && element.maritalStatus.status) || null
      }`,
      spouseName: element.spouseName || null,
      ageAtMarriage: element.ageAtMarriage || null,
      // income: element.i_bendemographics && element.i_bendemographics.incomeStatus || null,
      incomeName:
        (element.i_bendemographics && element.i_bendemographics.incomeStatus) ||
        null,
      literacyStatus: element.literacyStatus || null,
      educationQualification:
        (element.i_bendemographics &&
          element.i_bendemographics.i_beneficiaryeducation &&
          element.i_bendemographics.i_beneficiaryeducation.educationID) ||
        null,
      educationQualificationName:
        (element.i_bendemographics &&
          element.i_bendemographics.i_beneficiaryeducation &&
          element.i_bendemographics.i_beneficiaryeducation.educationType) ||
        null,
      occupation:
        (element.i_bendemographics && element.i_bendemographics.occupationID) ||
        null,
      occupationOther:
        (element.i_bendemographics &&
          element.i_bendemographics.occupationName) ||
        null,
      monthlyFamilyIncome: element.monthlyFamilyIncome,
    });
    // this.onMaritalStatusChanged(); // Marital status Changed
    this.masterData.incomeMaster.forEach((stat: any) => {
      if (
        element.i_bendemographics.incomeStatus &&
        stat.incomeStatus === element.i_bendemographics.incomeStatus
      ) {
        this.personalInfoFormGroup.patchValue({
          income: stat.incomeStatusID,
        });
      }
    });
    this.dobChangeByCalender();

    if (
      element.maritalStatus.maritalStatusID === 1 ||
      element.maritalStatus.maritalStatusID === 7
    ) {
      this.enableMarriageDetails = false;
      this.clearMarriageDetails();
    } else {
      this.enableMarriageDetails = true;
    }

    // console.log(this.personalInfoFormGroup.value ,'personal data updated ')
    this._parentBenRegID = `${
      (element.benPhoneMaps.length > 0 &&
        element.benPhoneMaps[0].parentBenRegID) ||
      null
    }`;
    this.personalInfoFormGroup.patchValue({
      checked: true,
    });
  }

  /**
   *
   * get ben image from api
   */
  getBenImage() {
    this.beneficiaryDetailsService
      .getBeneficiaryImage(this.revisitData.beneficiaryRegID)
      .subscribe((data: any) => {
        console.log(data, 'imagedata');
        if (data && data.benImage) {
          this.personalInfoFormGroup.patchValue({
            image: data.benImage,
          });
        }
      });
  }

  getPhoneMaps(phoneMap: any) {
    if (phoneMap && phoneMap.length && phoneMap.length > 0) {
      return phoneMap[0].phoneNo;
    } else {
      return null;
    }
  }

  ngOnDestroy() {
    if (this.masterDataSubscription) {
      this.masterDataSubscription.unsubscribe();
    }
    if (this.patientRevisit && this.revisitDataSubscription) {
      this.revisitDataSubscription.unsubscribe();
    }
    if (this.personalInfoSubscription) {
      this.personalInfoSubscription.unsubscribe();
    }
  }

  ngDoCheck() {
    this.fetchLanguageResponse();
  }

  fetchLanguageResponse() {
    this.languageComponent = new SetLanguageComponent(this.httpServiceService);
    this.languageComponent.setLanguage();
    this.currentLanguageSet = this.languageComponent.currentLanguageObject;
  }

  trackFieldInteraction(fieldName: string) {
    this.trackingService.trackFieldInteraction(fieldName, 'Personal Information');
  }
}

export function maxLengthValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;

    if (value && value.length > maxLength) {
      console.log('maxLnegthvalidator', value);

      return { maxLengthExceeded: true };
    }

    return null;
  };
}
