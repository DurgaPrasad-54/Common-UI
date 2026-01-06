import { Component, ViewChild } from '@angular/core';
import { RegistrationService } from '../services/registration.service';
import { ConfirmationService } from 'src/app/app-modules/core/services';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RegistrarService } from '../services/registrar.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SetLanguageComponent } from 'src/app/app-modules/core/components/set-language.component';
import { HttpServiceService } from 'src/app/app-modules/core/services/http-service.service';
import * as moment from 'moment';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConsentFormComponent } from './consent-form/consent-form.component';
import { SessionStorageService } from '../services/session-storage.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent {

  filteredFieldsData: any = [];
  enablePersonalInfo = false;
  enableLocationInfo = false;
  enableOtherInfo = false;
  enableAbhaInfo = false;
  personalInfoData: any;
  locationInfoData: any;
  otherInfoData: any;
  personalInfoFormValues: any;
  mainForm!: FormGroup;
  country = { id: 1, Name: 'India' };
  patientRevisit = false;
  revisitDataSubscription!: Subscription;
  currentLanguageSet: any;
  revisitData: any;
  abhaInfoData: any;
  serviceLine: any;
  consentGranted: any;
  disableGenerateOTP = false;
  today = new Date();


  constructor(
    private registrationService: RegistrationService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private registrarService: RegistrarService,
    private route: ActivatedRoute,
    private languageComponent: SetLanguageComponent,
    private httpServiceService: HttpServiceService,
    private sessionstorage:SessionStorageService,
    private router: Router,
    private dialog: MatDialog, ){
    this.mainForm = this.fb.group({
      // personalInfoForm: this.fb.group({}),
      personalInfoForm: this.fb.group({
        age: [null], // Add your age control here
        ageAtMarriage: [null],
        genderID: [null] // Add your ageAtMarriage control here
      }, { validators: ageAtMarriageValidator }),
      locationInfoForm: this.fb.group({}),
      otherInfoForm: this.fb.group({}),
      abhaInfoForm: this.fb.group({}),
    });
  }

  ngOnInit(){
    this.serviceLine =  this.sessionstorage.getItem('serviceName');
    this.fetchLanguageResponse();
    this.getRegistrationData();
    this.checkPatientRevisit();
    this.registrarService.healthIdMobVerificationCheck$.subscribe(
      (responseMob) => {
        if (responseMob !== null && responseMob !== undefined) {
          console.log("response to patch the details", responseMob)
          this.setHealthIdAfterGeneration(responseMob);
        }
      },
    );
    }

    minValidator(min: number): ValidatorFn {
      return (control: AbstractControl): { [key: string]: any } | null => {
        if (control.value === null || control.value === undefined) return null;
        const value = +control.value;
        return value >= min ? null : { minValue: { value: control.value } };
      };
    }
     
    maxValidator(max: number): ValidatorFn {
      return (control: AbstractControl): { [key: string]: any } | null => {
        if (control.value === null || control.value === undefined) return null;
        const value = +control.value;
        return value <= max ? null : { maxValue: { value: control.value } };
      };
    }

  allowTextValidator(allowText: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null;

      const value = control.value;
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
          return null;
      }

      return regex.test(value) ? null : { allowText: { value: control.value } };
    };
  }

  get personalInfoFormGroup(): FormGroup{
    return this.mainForm.get('personalInfoForm') as FormGroup;
  }

  get locationInfoFormGroup(): FormGroup{
    return this.mainForm.get('locationInfoForm') as FormGroup;
  }

  get otherInfoFormGroup(): FormGroup{
    return this.mainForm.get('otherInfoForm') as FormGroup;
  }

  get abhaInfoFormGroup(): FormGroup{
    return this.mainForm.get('abhaInfoForm') as FormGroup;
  }

  checkPatientRevisit() {
    if (this.route.snapshot.params['beneficiaryID'] !== undefined) {
      this.patientRevisit = true;
      this.callBeneficiaryDataObservable(
        this.route.snapshot.params['beneficiaryID']
      );
    } else if (this.route.snapshot.params['beneficiaryID'] === undefined) {
      this.patientRevisit = false;
    }
    this.openConsent();
  }

  openConsent() {
    if (this.patientRevisit === false) {
      const mdDialogRef: MatDialogRef<ConsentFormComponent> = this.dialog.open(
        ConsentFormComponent,
        {
          width: '50%',
          height: '330px',
          // disableClose: true,
        },
      );
      mdDialogRef.afterClosed().subscribe((consentProvided) => {
        this.consentGranted = consentProvided;
        this.registrarService.sendConsentStatus(consentProvided);
      });
    }
  }

    /**
   *
   * Loading Data of Beneficiary as Observable
   */
    callBeneficiaryDataObservable(benID: any) {
      let data: any;
      this.revisitDataSubscription =
        this.registrarService.beneficiaryEditDetails$.subscribe(res => {
          if (res !== null && benID === res.beneficiaryID) {
            console.log('beneficiary revisit data', res);
            let addForm = res.otherFields;
            if(addForm !== undefined){
              let otherFieldsData = JSON.parse(res.otherFields);
              data = Object.assign({}, res, otherFieldsData)
            }
            else{
              data = Object.assign({}, res);
            }
            // let otherFieldsData = JSON.parse(res.otherFields);
            // let data = Object.assign({}, res, otherFieldsData)
            this.revisitData = Object.assign({}, data);
            console.log('revist Data json', data);
          } else {
            this.redirectToSearch();
          }
        });
    }

    redirectToSearch() {
      setTimeout(() =>
        this.confirmationService.alert(
          this.currentLanguageSet.alerts.info.issueInFetchDetails,
          'info'
        )
      );
      this.router.navigate(['/registrar/search/']);
    }
  
  

  getRegistrationData(){
    let location: any = this.sessionstorage.getItem('locationData');
    let locationData = JSON.parse(location);
    let services: any = this.sessionstorage.getItem('services');
    let servicesData = JSON.parse(services);
    console.log('servicesData', servicesData);
    let reqObj = {
      serviceLine: this.sessionstorage.getItem('serviceName'),
      serviceLineId: this.sessionstorage.getItem('serviceID'),
      stateId: locationData.stateID,
      districtId: locationData.districtID,
      blockId: locationData.blockID,
      serviceProviderId: servicesData[0].serviceProviderID
    }
    console.log('reqObj', reqObj);
    this.registrationService.fetchAllRegistrationData(reqObj).subscribe((res: any) => {
      if(res && res.data && res.statusCode === 200){
        if(res.data.length > 0){
        this.filterData(res.data);
        } else {
      this.confirmationService.alert('No Project is mapped to the serviceline for choosed block', 'info')
        }
      }else {
        this.confirmationService.alert(res.errorMessage, 'error');
      }
    }, (err: any) => {
      this.confirmationService.alert(err.errorMessage, 'error');
    })
  }

  filterData(res: any) {
    this.filteredFieldsData = res.reduce((acc: { sectionId: number; sectionName: string; fields: any[] }[], curr: any) => {
        const existingSection = acc.find(section => section.sectionName === curr.sectionName && section.sectionId === curr.sectionId);
        if (existingSection) {
            existingSection.fields.push({...curr});
        } else {
            acc.push({
                sectionId: curr.sectionId,
                sectionName: curr.sectionName,
                fields: [{...curr}]
            });
        }
        return acc;
    }, [])
      .map((section: any) => ({
        ...section,
        fields: section.fields.sort((a: { rank: number; }, b: { rank: number; }) => a.rank - b.rank)
    }));
    console.log("filtered data", this.filteredFieldsData);
    this.enableSteps();
  }

  enableSteps(){
    this.filteredFieldsData.find((item: any) => {
      if(item.sectionName.toLowerCase() === "personal information"){
      this.enablePersonalInfo = true;
      this.personalInfoData = item.fields;
      }
      if(item.sectionName.toLowerCase() === "location information"){
      this.enableLocationInfo = true;
      this.locationInfoData = item.fields;
      }
      if(item.sectionName.toLowerCase() === "other information"){
      this.enableOtherInfo = true;
      this.otherInfoData = item.fields;
      }
      if(item.sectionName.toLowerCase() === "abha information"){
        // commented for current purpose will uncomment or remove later 
        // if(this.serviceLine === 'HWC' || this.serviceLine === 'TM'){
        this.abhaInfoData = item.fields;
        this.enableAbhaInfo = true;
        // }
      }
    });
    }

  onFormSubmit() {
    console.log('personalInfoFormValues - ', this.mainForm.value);
    // this.personalInfoFormValues = data;
  }


  submitBeneficiaryDetails() {
    console.log('registration data', this.mainForm);
    const newDate = this.dateFormatChange();
    const valueToSend = this.mainForm.value;
    valueToSend.personalInfoForm.dob = newDate;
    const iEMRForm: any = this.iEMRForm();
    const phoneMaps = iEMRForm.benPhoneMaps;

    // createdBy, vanID, servicePointID
    const serviceLineDetails: any = this.sessionstorage.getItem('serviceLineDetails');
    const servicePointDetails = JSON.parse(serviceLineDetails);
    iEMRForm['vanID'] = servicePointDetails.vanID;
    iEMRForm['parkingPlaceID'] = servicePointDetails.parkingPlaceID;
    iEMRForm['createdBy'] = this.sessionstorage.getItem('userName');
    iEMRForm['providerServiceMapID'] = this.sessionstorage.getItem('providerServiceID');
    iEMRForm['providerServiceMapId'] = this.sessionstorage.getItem('providerServiceID');
    phoneMaps[0]['vanID'] = servicePointDetails.vanID;
    phoneMaps[0]['parkingPlaceID'] = servicePointDetails.parkingPlaceID;
    phoneMaps[0]['createdBy'] = this.sessionstorage.getItem('userName');
    console.log('iemrform', iEMRForm);
    const mainForm = this.mainFormData();
    console.log('mainForm', mainForm);
    console.log('personalInfoFormGENDER', this.mainForm.controls['personalInfoForm'].value);
    const remaingData = this.findMissingKeys(iEMRForm, mainForm)
    let finalRqObj = {
      ...remaingData,
      ...iEMRForm
    }
    console.log('finalRqObj', finalRqObj);
    this.registrarService.submitBeneficiary(finalRqObj).subscribe((res: any) => {
      if (res.statusCode === 200) {
        this.confirmationService.alert(res.data.response, 'success');
        const responseValue = res.data.response;
        const benId = responseValue.replace(/^\D+/g, '');
          const txt = res.data.response;
          const numb = txt.replace(/\D/g, '');
          const reqObj = {
            beneficiaryRegID: null,
            beneficiaryID: numb,
            healthId: this.mainForm.controls['abhaInfoForm'].value['healthIdNumber'],
            healthIdNumber: this.mainForm.controls['abhaInfoForm'].value['healthIdNumber'],
            providerServiceMapId: this.sessionstorage.getItem('providerServiceID'),
            authenticationMode: null,
            createdBy: this.sessionstorage.getItem('userName'),
          };
          if 
            (this.mainForm.controls['abhaInfoForm'].value['healthIdNumber'] !== undefined &&
            this.mainForm.controls['abhaInfoForm'].value['healthIdNumber'] !== null)  {
            this.registrarService.mapHealthId(reqObj).subscribe((res: any) => {
              if (res.statusCode === 200) {
                // this.confirmationService.alert(res.data.response, 'success');
                console.log('success');
              } else {
                this.confirmationService.alert(
                  this.currentLanguageSet.alerts.info.issueInSavngData,
                  'error',
                );
              }
            });
          }
        this.mainForm.reset();
        this.disableGenerateOTP = false;
        this.router.navigate(['/registrar/search/']);
        // this.confirmationService.alert(res.data.response, 'success');
        // this.mainForm.reset();
      } 

      else {
        this.confirmationService.alert(
          this.currentLanguageSet.alerts.info.issueInSavngData,
          'error',
        );
      }
      
      // else {
      //   this.confirmationService.alert(
      //     'issue in saving the data',
      //     'error'
      //   );
      // }
    });
  }

  iEMRForm() {
    const personalForm = Object.assign(
      {},
      this.mainForm.get('personalInfoForm') as FormGroup
    );
    const demographicsForm = Object.assign(
      {},
      this.mainForm.get('locationInfoForm') as FormGroup
    );
    const othersForm = Object.assign(
      {},
      this.mainForm.get('otherInfoForm') as FormGroup
    );

    const abhaForm = Object.assign(
      {},
      this.mainForm.get('abhaInfoForm') as FormGroup
    );
    // const iEMRids = this.iEMRids(othersForm.govID, othersForm.otherGovID);
    const finalForm = {
      beneficiaryConsent: true,
      dob: personalForm.controls['dOB']?.value,


      i_bendemographics: {
        monthlyFamilyIncome: personalForm.controls['monthlyFamilyIncome']?.value || null,
        occupationName: personalForm.controls['occupationName']?.value || null,
        communityName: othersForm.controls['communityName']?.value || null,
        countryID: this.country.id || null,
        countryName: this.country.Name || null,
        stateID: demographicsForm.controls['stateID']?.value  || null,
        stateName: demographicsForm.controls['stateName']?.value || null,
        districtID: demographicsForm.controls['districtID']?.value || null,
        districtName: demographicsForm.controls['districtName']?.value || null,
        blockID: demographicsForm.controls['blockID']?.value || null,
        blockName: demographicsForm.controls['blockName']?.value || null,
        districtBranchID:
          demographicsForm.controls['districtBranchID']?.value || null,
        districtBranchName: demographicsForm.controls['districtBranchName']?.value || null,
        zoneID: demographicsForm.controls['zoneID']?.value || null,
        zoneName: demographicsForm.controls['zoneName']?.value || null,
        // parkingPlaceID: demographicsForm.controls['parkingPlace']?.value || null,
        parkingPlaceName: demographicsForm.controls['parkingPlaceName']?.value || null,
        servicePointID: this.sessionstorage.getItem('servicePointID') || null,
        servicePointName: this.sessionstorage.getItem('servicePointName') || null,
        habitation: demographicsForm.controls['habitation']?.value || null,
        pinCode: demographicsForm.controls['pinCode']?.value || null,
        addressLine1: demographicsForm.controls['addressLine1']?.value || null,
        addressLine2: demographicsForm.controls['addressLine2']?.value || null,
        addressLine3: demographicsForm.controls['addressLine3']?.value || null,
        religionName: othersForm.controls['religionName']?.value || null,
      },
      abha: abhaForm.controls['healthIdNumber']?.value || null,
      genderID: (() => {
        const genderName = personalForm.controls['genderName']?.value;
        if (genderName === 'Female') {
            return 2;
        } else if (genderName === 'Male') {
            return 1;
        } else if (genderName === 'Transgender') {
            return 3;
        } else {
            return null;
        }
    })(),
      benPhoneMaps: [
        {
          // parentBenRegID: personalForm.controls['parentRegID']?.value,
          phoneNo: personalForm.controls['phoneNo']?.value,
          phoneTypeID: this.makePhoneTypeID(personalForm.controls['phoneNo']?.value),
          // benRelationshipID: personalForm.controls['parentRelation']?.value,
        },
      ],
    };
    return finalForm;
  }

  mainFormData(){
    const mainForm = {
    ...this.mainForm.controls['personalInfoForm'].value,
    ...this.mainForm.controls['locationInfoForm'].value,
    ...this.mainForm.controls['otherInfoForm'].value,
    ...this.mainForm.controls['abhaInfoForm'].value,
    }
    return mainForm;
  }

  findMissingKeys(iemrForm: any , mainForm: any): any {
    const differences: { [key: string]: any } = {};

    // Add keys from mainForm that are not in iemrForm
    for (const key in mainForm) {
      if (!(key in iemrForm.i_bendemographics) && !(key in iemrForm.benPhoneMaps)) {
        differences[key] = mainForm[key];
      }
    }
    if (differences['dob']) {
      const dobDate = new Date(differences['dob']);
      differences['dob'] = dobDate.toISOString();
    }
    return differences;
  }

  makePhoneTypeID(phoneNo: any) {
    if (phoneNo) {
      return 1;
    } else {
      return null;
    }
  }

    /**
   *
   * Update Beneficiary Form & Don't Move the Beneficiary To Nurse Worklist
   */
    updateBeneficiaryDetails(passToNurse = false) {  
        const finalReqObj: any = this.updateBenDataManipulation();
        finalReqObj['passToNurse'] = passToNurse;
  
        this.registrarService
          .updateBeneficiary(finalReqObj)
          .subscribe((res: any) => {
            if (res && res.statusCode === 200) {
              this.confirmationService.alert(res.data.response, 'success');
              const personalForm = Object.assign(
                {},
                this.mainForm.value.personalInfoForm,
              );
              console.log("personalForm",personalForm);
              const reqObj = {
                beneficiaryRegID: null,
                beneficiaryID: personalForm.beneficiaryID,
                healthId: this.mainForm.controls['abhaInfoForm'].value['healthIdNumber'],
                healthIdNumber: this.mainForm.controls['abhaInfoForm'].value['healthIdNumber'],
                authenticationMode: null,
                providerServiceMapId: this.sessionstorage.getItem('providerServiceID'),
                createdBy: this.sessionstorage.getItem('userName'),
              };
              this.router.navigate(['/registrar/search/']);
            } 
            else {
              this.confirmationService.alert(res.errorMessage, 'error');
            }
          });
    }

  updateBenDataManipulation() {
    console.log('registration data', this.mainForm);
    const newDate = this.dateFormatChange();
    const valueToSend = this.mainForm.value;
    valueToSend.personalInfoForm.dob = newDate;
    const iEMRForm: any = this.iEMRFormUpdate();
    const phoneMaps = iEMRForm.benPhoneMaps;

    const serviceLineDetails: any = this.sessionstorage.getItem('serviceLineDetails');
    const servicePointDetails = JSON.parse(serviceLineDetails);

    iEMRForm['vanID'] = servicePointDetails.vanID;
    iEMRForm['parkingPlaceID'] = servicePointDetails.parkingPlaceID;
    iEMRForm['createdBy'] = this.sessionstorage.getItem('userName');
    // phoneMaps[0]['vanID'] = servicePointDetails.vanID;
    // phoneMaps[0]['parkingPlaceID'] = servicePointDetails.parkingPlaceID;
    // phoneMaps[0]['modifiedBy'] = this.sessionstorage.getItem('userName');
    const mainForm = this.mainFormData();
    console.log('mainForm', mainForm);
    const remaingData = this.findMissingKeys(iEMRForm, mainForm)
    let finalRqObj = {
      ...remaingData,
      ...iEMRForm
    }
    return finalRqObj;
  }

  iEMRFormUpdate() {
    const personalForm = Object.assign(
      {},
      this.mainForm.get('personalInfoForm') as FormGroup
    );
    const demographicsForm = Object.assign(
      {},
      this.mainForm.get('locationInfoForm') as FormGroup
    );
    const othersForm = Object.assign(
      {},
      this.mainForm.get('otherInfoForm') as FormGroup
    );
    const abhaForm = Object.assign(
      {},
      this.mainForm.get('abhaInfoForm') as FormGroup
    );
    const serviceLineDetails: any = this.sessionstorage.getItem('serviceLineDetails');
    const servicePointDetails = JSON.parse(serviceLineDetails);
    const finalForm = {
      beneficiaryRegID: personalForm.controls['beneficiaryRegID']?.value || null,
      i_bendemographics: {
        beneficiaryRegID: personalForm.controls['beneficiaryRegID']?.value || null,
                // incomeStatusID: personalForm.controls[income,
        // incomeStatusName: personalForm.controls['incomeName']?.value,
        monthlyFamilyIncome: personalForm.controls['monthlyFamilyIncome']?.value || null,
        // occupationID: personalForm.controls[occupation || null,
        occupationName: personalForm.controls['occupationName']?.value || null,
        communityName: othersForm.controls['communityName']?.value || null,
        countryID: this.country.id || null,
        countryName: this.country.Name || null,
        // educationID: personalForm.controls[educationQualification || null,
        // educationName: personalForm.controls['educationQualificationName']?.value || null,
        // communityID: othersForm.controls[community || null,
        // religionID: othersForm.controls[religion || null,
        // religionName: othersForm.controls['religionOther']?.value || null,
        // countryName: this.country.Name || null,
        stateID: demographicsForm.controls['stateID']?.value  || null,
        stateName: demographicsForm.controls['stateName']?.value || null,
        districtID: demographicsForm.controls['districtID']?.value || null,
        districtName: demographicsForm.controls['districtName']?.value || null,
        blockID: demographicsForm.controls['blockID']?.value || null,
        blockName: demographicsForm.controls['blockName']?.value || null,
        districtBranchID:
          demographicsForm.controls['districtBranchID']?.value || null,
        districtBranchName: demographicsForm.controls['districtBranchName']?.value || null,
        zoneID: demographicsForm.controls['zoneID']?.value || null,
        zoneName: demographicsForm.controls['zoneName']?.value || null,
        // parkingPlaceID: demographicsForm.controls['parkingPlace']?.value || null,
        parkingPlaceName: demographicsForm.controls['parkingPlaceName']?.value || null,
        servicePointID: this.sessionstorage.getItem('servicePointID') || null,
        servicePointName: this.sessionstorage.getItem('servicePointName') || null,
        habitation: demographicsForm.controls['habitation']?.value || null,
        pinCode: demographicsForm.controls['pincode']?.value || null,
        addressLine1: demographicsForm.controls['addressLine1']?.value || null,
        addressLine2: demographicsForm.controls['addressLine2']?.value || null,
        addressLine3: demographicsForm.controls['addressLine3']?.value || null,
        religionName: othersForm.controls['religionName']?.value || null,
      },
      abha: abhaForm.controls['healthIdNumber']?.value || null,
      genderID: (() => {
        const genderName = personalForm.controls['genderName']?.value;
        if (genderName === 'Female') {
            return 2;
        } else if (genderName === 'Male') {
            return 1;
        } else if (genderName === 'Transgender') {
            return 3;
        } else {
            return null;
        }
    })(),
      benPhoneMaps: [
        {
          // benPhMapID: this.getBenPhMapID(personalForm.controls.benPhMapID),
          beneficiaryRegID: personalForm.controls['beneficiaryRegID']?.value || null,
          parentBenRegID: personalForm.controls['beneficiaryRegID']?.value || null,
          benRelationshipID: personalForm.controls['parentRelation']?.value || null,
          // benRelationshipType: {
            // benRelationshipID: personalForm.controls['parentRelation']?.value,
            // benRelationshipType: this.getRelationTypeForUpdate(
            //   personalForm.controls['parentRelation']?.value,
            //   personalForm.controls['benRelationshipType']?.value
            // ),
          // },
          phoneNo: personalForm.controls['phoneNo']?.value,
          vanID: servicePointDetails.vanID,
          parkingPlaceID: servicePointDetails.parkingPlaceID,
          modifiedBy: this.sessionstorage.getItem('userName'), 
        },
      ],
      beneficiaryID: personalForm.controls['beneficiaryID']?.value || null,
      changeInSelfDetails: true,
      changeInOtherDetails: true,
      changeInAssociations: true,
      changeInAddress: true,
      changeInContacts: true


    };

    return finalForm;
  }

  getBenPhMapID(benPhMapID: any) {
    if (benPhMapID === 'null') {
      return null;
    } else {
      return benPhMapID;
    }
  }
  getRelationTypeForUpdate(parentRelation: any, benRelationshipType: any) {
    if (parentRelation === 1) {
      return 'Self';
    } else if (parentRelation === 11) {
      return 'Other';
    } else {
      return null;
    }
  }

  dateFormatChange() {
    const dob = new Date(this.mainForm.controls['personalInfoForm'].value.dOB);
    let date =  moment(dob).format('YYYY-MM-DDThh:mm:ssZ');

    return date;
  }

  ngDoCheck() {
    this.fetchLanguageResponse();
  }

  fetchLanguageResponse() {
    this.languageComponent = new SetLanguageComponent(this.httpServiceService);
    this.languageComponent.setLanguage();
    this.currentLanguageSet = this.languageComponent.currentLanguageObject;
  }

  ngOnDestroy() {
    if (this.patientRevisit && this.revisitDataSubscription) {
      this.revisitDataSubscription.unsubscribe();
      this.registrarService.clearBeneficiaryEditDetails();
    }
  }

  NavigateToFamilyTagging() {
    let benFullName =
      this.revisitData.firstName !== undefined &&
      this.revisitData.firstName !== null
        ? this.revisitData.firstName
        : null;
    if (
      this.revisitData.lastName !== undefined &&
      this.revisitData.lastName !== null &&
      this.revisitData.lastName !== ''
    ) {
      benFullName = benFullName + ' ' + this.revisitData.lastName;
    }

    const reqObj = {
      beneficiaryRegID: this.revisitData.beneficiaryRegID,
      familyName:
        this.revisitData.familyName !== null &&
        this.revisitData.familyName !== undefined
          ? this.revisitData.familyName
          : this.revisitData.lastName,
      familyId:
        this.revisitData.familyId !== null &&
        this.revisitData.familyId !== undefined
          ? this.revisitData.familyId
          : null,
      beneficiaryName: benFullName,
      benStateId: this.revisitData.i_bendemographics.stateID !== null &&
      this.revisitData.i_bendemographics.stateID !== undefined
        ? this.revisitData.i_bendemographics.stateID
        : null,
      benDistrictId:
        this.revisitData.i_bendemographics.districtID !== null &&
        this.revisitData.i_bendemographics.districtID !== undefined
          ? this.revisitData.i_bendemographics.districtID
          : null,
      benBlockId:
        this.revisitData.i_bendemographics.blockID !== null &&
        this.revisitData.i_bendemographics.blockID !== undefined
          ? this.revisitData.i_bendemographics.blockID
          : null,
      benVillageId:
        this.revisitData.i_bendemographics.districtBranchID !== null &&
        this.revisitData.i_bendemographics.districtBranchID !== undefined
          ? this.revisitData.i_bendemographics.districtBranchID
          : null,
      beneficiaryId: this.revisitData.beneficiaryID,
    };
    this.router.navigate(['/registrar/familyTagging', reqObj]);
  }

  setHealthIdAfterGeneration(result: any) {
    (<FormGroup>(
      this.mainForm.controls['otherInfoForm']
    )).patchValue({ healthId: result.healthIdNumber });
    (<FormGroup>(
      this.mainForm.controls['otherInfoForm']
    )).patchValue({ healthIdNumber: result.healthIdNumber });
    (<FormGroup>(
      this.mainForm.controls['personalInfoForm']
    )).patchValue({ firstName: result.firstName });
    (<FormGroup>(
      this.mainForm.controls['personalInfoForm']
    )).patchValue({ lastName: result.lastName });
    (<FormGroup>(
      this.mainForm.controls['personalInfoForm']
    )).patchValue({ phoneNo: result.phoneNo });
    (<FormGroup>(
      this.mainForm.controls['personalInfoForm']
    )).patchValue({ gender: result.gender });
    (<FormGroup>(
      this.mainForm.controls['personalInfoForm']
    )).patchValue({ genderName: result.genderName });
    (<FormGroup>(
      this.mainForm.controls['locationInfoForm']
    )).patchValue({ stateID: result.stateID });
    (<FormGroup>(
      this.mainForm.controls['locationInfoForm']
    )).patchValue({ stateName: result.stateName });
    (<FormGroup>(
      this.mainForm.controls['locationInfoForm']
    )).patchValue({ districtID: result.districtID });
    (<FormGroup>(
      this.mainForm.controls['locationInfoForm']
    )).patchValue({ districtName: result.districtName });
    console.log("location data after patching abha details", this.mainForm.controls['locationInfoForm'].value);
    this.registrarService.setAbhaLocationDetailsonFetch(this.mainForm.controls['locationInfoForm'].value);

    const parts = result.dob.split('/');
    const parsedDate = new Date(
      parseInt(parts[2]),
      parseInt(parts[1]) - 1,
      parseInt(parts[0]),
    );
    (<FormGroup>(
      this.mainForm.controls['personalInfoForm']
    )).patchValue({ dob: parsedDate });

    if (
      result.dob &&
      (<FormGroup>(
        this.mainForm.controls['personalInfoForm']
      )).controls['dOB'].valid
    ) {
      const dateDiff = Date.now() - parsedDate.getTime();
      const age = new Date(dateDiff);
      const yob = Math.abs(age.getFullYear() - 1970);
      const mob = Math.abs(age.getMonth());
      const dob = Math.abs(age.getDate() - 1);
      this.today = new Date();
      if (yob > 0) {
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ age: yob });
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ ageUnit: 'Years' });
      } else if (mob > 0) {
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ age: mob });
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ ageUnit: 'Months' });
      } else if (dob > 0) {
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ age: dob });
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ ageUnit: 'Days' });
      }
      if (parsedDate.setHours(0, 0, 0, 0) === this.today.setHours(0, 0, 0, 0)) {
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ age: 1 });
        (<FormGroup>(
          this.mainForm.controls['personalInfoForm']
        )).patchValue({ ageUnit: 'Day' });
      }
    }
  }

}
function ageAtMarriageValidator(control: AbstractControl): ValidationErrors | null {
  const age = control.get('age')?.value;
  const ageAtMarriage = control.get('ageAtMarriage')?.value;

  if (ageAtMarriage && ageAtMarriage > age) {
    return { ageAtMarriageInvalid: true };
  }

  return null;
}
