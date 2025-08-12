import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RegistrarService } from '../../services/registrar.service';
import { Subscription } from 'rxjs';
import { SessionStorageService } from '../../services/session-storage.service';

@Component({
  selector: 'app-location-information',
  templateUrl: './location-information.component.html',
  styleUrls: ['./location-information.component.css'],
})
export class LocationInformationComponent {
  @Input()
  locationInfoFormGroup!: FormGroup;

  @Input()
  formData: any;

  @Input()
  patientRevisit = false;

  @Input()
  revisitData: any;

  locationDetails: any;
  demographicsMaster: any;
  villgeBranch: any;
  suggestedvillageList: any;
  subDistrictList: any = [];
  statesList: any;
  zonesList: any = [];
  parkingPlaceList: any = [];
  districtList: any = [];
  villageList: any;
  servicePointList: any = [];
  locationPatchDetails: any;
  patchAbhaLocationDetails = false;
  patchAbhaBenLocationDetails: any;
  registrationSubscription!: Subscription;
  filteredOptions: { [key: string]: string[] } = {};

  constructor(
    private fb: FormBuilder,
    private registrarService: RegistrarService,
    private sessionstorage: SessionStorageService,
  ) {
    this.registrationSubscription = this.registrarService.abhaLocationDetails$.subscribe((result: any) => {
      if (result) {
        this.patchAbhaLocationDetails = true;
        this.patchAbhaBenLocationDetails = result;
        this.loadLocalMasterForDemographic();
      }
    });
  }

  ngOnInit() {
    this.formData.forEach((item: any) => {
      if (item.fieldName && item.allowText) {
        this.locationInfoFormGroup.addControl(
          item.fieldName,
          new FormControl(null, [
            Validators.pattern(this.allowTextValidator(item.allowText)),
            Validators.minLength(parseInt(item?.allowMin)),
            Validators.maxLength(parseInt(item?.allowMax)),
          ]),
        );
      } else {
        this.locationInfoFormGroup.addControl(
          item.fieldName,
          new FormControl(null),
        );
        // Initialize filtered list with all options
        if (item.options) {
          this.filteredOptions[item.fieldName] = [...item.options];
        }
      }

    });
    this.locationInfoFormGroup.addControl('stateID', new FormControl());
    this.locationInfoFormGroup.addControl('districtID', new FormControl());
    this.locationInfoFormGroup.addControl('blockID', new FormControl());
    this.locationInfoFormGroup.addControl(
      'districtBranchID',
      new FormControl(),
    );
    this.locationInfoFormGroup.addControl('zoneID', new FormControl());
    this.locationInfoFormGroup.addControl('parkingPlaceID', new FormControl());
    this.locationInfoFormGroup.addControl('servicePointID', new FormControl());
    console.log('location Data', this.locationInfoFormGroup);

    const locationData: any = this.sessionstorage.getItem('locationData');
    this.locationDetails = JSON.parse(locationData);
    if (this.patientRevisit) {
      this.locationInfoFormGroup.patchValue(this.revisitData);
      this.locationPatchDetails = this.revisitData.i_bendemographics;
      this.locationInfoFormGroup.patchValue(this.locationPatchDetails);
    }
    this.loadLocationFromStorage();
    console.log('location Form Data', this.formData);
  }

  showAllOptions(item: any) {
    item.filteredOptions = [...item.options];
  }

  filterOptions(item: any) {
    const inputValue = this.locationInfoFormGroup.get(item.fieldName)?.value?.toLowerCase() || '';
    item.filteredOptions = item.options.filter((opt: string) =>
      opt.toLowerCase().includes(inputValue)
    );
  }
  loadLocationFromStorage() {
    const locationData: any = this.sessionstorage.getItem('location');
    const location = JSON.parse(locationData);
    this.demographicsMaster = Object.assign({}, location, {
      servicePointID: this.sessionstorage.getItem('servicePointID'),
      servicePointName: this.sessionstorage.getItem('servicePointName'),
    });

    if (
      this.demographicsMaster.otherLoc &&
      this.demographicsMaster.stateMaster &&
      this.demographicsMaster.stateMaster.length >= 1 &&
      this.demographicsMaster.servicePointID &&
      this.demographicsMaster.servicePointName
    ) {
      this.loadLocalMasterForDemographic();
    } else if (
      this.demographicsMaster.stateMaster &&
      this.demographicsMaster.stateMaster.length >= 1
    ) {
      this.statesList = this.demographicsMaster.stateMaster;
      this.loadServicePoint();
    }
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
      this.locationInfoFormGroup.controls[fieldName].patchValue(
        inputElement.value
      );
      const currentErrors =
        this.locationInfoFormGroup.controls[fieldName].errors;
      if (currentErrors && currentErrors['maxlength']) {
        delete currentErrors['maxlength'];
      }
    }
  }

  // Calling all data masters separately
  loadLocalMasterForDemographic() {
    this.loadState();
  }

  onChangeLocation(fieldNamevalue: any, selectedValue: any) {

    if (fieldNamevalue === 'stateName') {
      const stateDetails = this.statesList.find((value: any) => {
        return value.stateName === selectedValue;
      });
      this.locationInfoFormGroup.patchValue({
        stateID: stateDetails?.stateID,
        stateName: stateDetails?.stateName,
      });
      this.resetDistrict();
      this.resetBlock();
      this.resetVillage();
      this.loadDistrict(true);
    } else if (fieldNamevalue === 'districtName') {
      const districtDetails = this.districtList.find((value: any) => {
        return value.districtName === selectedValue;
      });
      this.locationInfoFormGroup.patchValue({
        districtID: districtDetails?.districtID,
        districtName: districtDetails?.districtName,
      });
      this.resetBlock();
      this.resetVillage();
      this.loadSubDistrict(true);
    } else if (fieldNamevalue === 'blockName') {
      const blockDetails = this.subDistrictList.find((value: any) => {
        return value.blockName === selectedValue;
      });
      this.locationInfoFormGroup.patchValue({
        blockID: blockDetails?.blockID,
        blockName: blockDetails?.blockName,
      });
      this.resetVillage();
      this.loadVillage(true);
    } else if (fieldNamevalue === 'districtBranchName') {
      const villageDetails = this.villageList.find((value: any) => {
        return value.villageName === selectedValue;
      });

      this.locationInfoFormGroup.patchValue({
        districtBranchID: villageDetails?.districtBranchID,
        districtBranchName: villageDetails?.villageName,
      });
    }
  }

  resetDistrict() {
    this.locationInfoFormGroup.patchValue({
      districtID: null,
      districtName: null,
    });

    this.formData.forEach((element: any) => {
      if (element.fieldName === 'districtName') element.options = [];
    });
  }

  resetBlock() {
    this.locationInfoFormGroup.patchValue({
      blockID: null,
      blockName: null,
    });

    this.formData.forEach((element: any) => {
      if (element.fieldName === 'blockName') element.options = [];
    });
  }

  resetVillage() {
    this.locationInfoFormGroup.patchValue({
      districtBranchID: null,
      districtBranchName: null,
    });

    this.formData.forEach((element: any) => {
      if (element.fieldName === 'districtBranchName') element.options = [];
    });
  }

  /**
   * Load States  for New Patient
   */
  loadState() {
    this.statesList = this.demographicsMaster.stateMaster;
    const stateList: any = [];
    this.statesList.forEach((item: any) => stateList.push(item.stateName));
    this.formData.forEach((element: any) => {
      if (element.fieldName === 'stateName') element.options = stateList;
    });
    if (this.patientRevisit) {
      this.locationInfoFormGroup.patchValue({
        stateID: this.locationPatchDetails.stateID,
        stateName: this.locationPatchDetails.stateName,
      });
    } else if (this.patchAbhaLocationDetails) {
      let localStateId;
      let localStateName;
      this.statesList.find((item: any) => {
        if (item.govtLGDStateID === parseInt(this.patchAbhaBenLocationDetails.stateID)) {
          localStateId = item.stateID;
          localStateName = item.stateName;
        }
      });
      this.locationInfoFormGroup.patchValue({
        stateID: localStateId,
        stateName: localStateName,
      });
    } else {
      this.locationInfoFormGroup.patchValue({
        stateID: this.locationDetails.stateID,
        stateName: this.locationDetails.stateName,
      });
    }
    this.loadDistrict(false);
  }

  loadDistrict(isLocationSelected: any) {
    const districtsList: any = [];
    this.registrarService
      .getDistrictList(this.locationInfoFormGroup.value.stateID)
      .subscribe((res: any) => {
        if (res && res.statusCode === 200) {
          this.districtList = res.data;
          this.districtList.forEach((item: any) =>
            districtsList.push(item.districtName),
          );

          this.formData.forEach((element: any) => {
            if (element.fieldName === 'districtName')
              element.options = districtsList;
          });

          if (!isLocationSelected) {
            if (this.patientRevisit) {
              this.locationInfoFormGroup.patchValue({
                districtID: this.locationPatchDetails.districtID,
                districtName: this.locationPatchDetails.districtName,
              });
            } else if (this.patchAbhaLocationDetails) {
              let localDistrictId;
              let localDistrictName;
              this.districtList.find((item: any) => {
                if (item.govtLGDDistrictID === parseInt(this.patchAbhaBenLocationDetails.districtID)) {
                  localDistrictId = item.districtID;
                  localDistrictName = item.districtName;
                }
              });
              this.locationInfoFormGroup.patchValue({
                districtID: localDistrictId,
                districtName: localDistrictName,
              });
            } else {
              this.locationInfoFormGroup.patchValue({
                districtID: this.locationDetails.districtID,
                districtName: this.locationDetails.districtName,
              });
            }
            this.loadSubDistrict(isLocationSelected);
          }
        }
      });
  }

  /**
   * Load Sub Districts  for New Patient
   */
  loadSubDistrict(isLocationSelected: any) {
    const subDistrictsList: any = [];
    this.registrarService
      .getSubDistrictList(this.locationInfoFormGroup.value.districtID)
      .subscribe((res: any) => {
        if (res && res.statusCode === 200) {
          this.subDistrictList = res.data;
          this.subDistrictList.forEach((item: any) =>
            subDistrictsList.push(item.blockName),
          );

          this.formData.forEach((element: any) => {
            if (element.fieldName === 'blockName')
              element.options = subDistrictsList;
          });

          if (!isLocationSelected) {
            if (this.patientRevisit) {
              this.locationInfoFormGroup.patchValue({
                blockID: this.locationPatchDetails.blockID,
                blockName: this.locationPatchDetails.blockName,
              });
            } else {
              this.locationInfoFormGroup.patchValue({
                blockID: this.locationDetails.blockID,
                blockName: this.locationDetails.blockName,
              });
            }
            this.loadVillage(isLocationSelected);
          }
        }
      });
  }

  loadVillage(isLocationSelected: any) {
    const villagesList: any = [];
    this.registrarService
      .getVillageList(this.locationInfoFormGroup.value.blockID)
      .subscribe((res: any) => {
        if (res && res.statusCode === 200) {
          this.villageList = res.data;
          this.villageList.forEach((item: any) =>
            villagesList.push(item.villageName),
          );
          this.formData.forEach((element: any) => {
            if (element.fieldName === 'districtBranchName')
              element.options = villagesList;
          });

          if (!isLocationSelected) {
            if (this.patientRevisit) {
              this.locationInfoFormGroup.patchValue({
                districtBranchID: this.locationPatchDetails.districtBranchID,
                districtBranchName:
                  this.locationPatchDetails.districtBranchName,
              });
            } else {
              this.locationInfoFormGroup.patchValue({
                districtBranchID: this.locationDetails.subDistrictID,
                districtBranchName: this.locationDetails.villageName,
              });
            }
            this.loadZone();
          }
        }
      });
    // this.villageList = this.demographicsMaster.villageMaster;
  }

  /**
   * Load Zones  for New Patient
   */
  loadZone() {
    this.zonesList = [
      {
        zoneID: this.demographicsMaster.otherLoc.zoneID,
        zoneName: this.demographicsMaster.otherLoc.zoneName,
      },
    ];
    const zoneList: any = [];
    zoneList.push(this.demographicsMaster.otherLoc.zoneName);
    this.formData.forEach((item: any) => {
      if (item.fieldName === 'zoneName') item.options = zoneList;
    });
    console.log(this.demographicsMaster.otherLoc, 'zoneLocs------mm-------');
    if (this.patientRevisit) {
      this.locationInfoFormGroup.patchValue({
        zoneID: this.locationPatchDetails.zoneID,
        zoneName: this.locationPatchDetails.zoneName,
      });
    } else {
      this.locationInfoFormGroup.patchValue({
        zoneID: this.demographicsMaster.otherLoc.zoneID,
        zoneName: this.demographicsMaster.otherLoc.zoneName,
      });
    }
    this.loadParkingPlace();
  }
  /**
   * Load Parking Place  for New Patient
   */
  loadParkingPlace() {
    this.parkingPlaceList = [
      {
        parkingPlaceID: this.demographicsMaster.otherLoc.parkingPlaceID,
        parkingPlaceName: this.demographicsMaster.otherLoc.parkingPlaceName,
      },
    ];
    const parkingPlaceList: any = [];
    parkingPlaceList.push(this.demographicsMaster.otherLoc.parkingPlaceName);
    this.formData.forEach((item: any) => {
      if (item.fieldName === 'parkingPlaceName')
        item.options = parkingPlaceList;
    });
    if (this.patientRevisit) {
      this.locationInfoFormGroup.patchValue({
        parkingPlace: this.locationPatchDetails.parkingPlaceID,
        parkingPlaceName: this.locationPatchDetails.parkingPlaceName,
      });
    } else {
      this.locationInfoFormGroup.patchValue({
        parkingPlace: this.demographicsMaster.otherLoc.parkingPlaceID,
        parkingPlaceName: this.demographicsMaster.otherLoc.parkingPlaceName,
      });
    }
    this.loadServicePoint();
  }
  /**
   * Load Service  for New Patient
   */
  loadServicePoint() {
    this.servicePointList = [
      {
        servicePointID: this.demographicsMaster.servicePointID,
        servicePointName: this.demographicsMaster.servicePointName,
      },
    ];
    const servicePointList: any = [];
    servicePointList.push(this.demographicsMaster.servicePointName);
    this.formData.forEach((item: any) => {
      if (item.fieldName === 'servicePointName')
        item.options = servicePointList;
    });
    if (this.patientRevisit) {
      this.locationInfoFormGroup.patchValue({
        servicePoint: this.locationPatchDetails.servicePointID,
        servicePointName: this.locationPatchDetails.servicePointName,
      });
    } else {
      this.locationInfoFormGroup.patchValue({
        servicePoint: this.demographicsMaster.servicePointID,
        servicePointName: this.demographicsMaster.servicePointName,
      });
    }
  }

  ngOnDestroy() {
    if (this.registrationSubscription) {
      this.registrationSubscription.unsubscribe();
    }
  }
}
