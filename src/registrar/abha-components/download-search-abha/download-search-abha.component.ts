import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SetLanguageComponent } from 'src/app/app-modules/core/components/set-language.component';
import { HttpServiceService } from 'src/app/app-modules/core/services/http-service.service';
import { RegistrarService } from '../../services/registrar.service';
import { ConfirmationService } from 'src/app/app-modules/core/services/confirmation.service';
import { AbhaEnterOtpComponentComponent } from '../abha-enter-otp-component/abha-enter-otp-component.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-download-search-abha',
  templateUrl: './download-search-abha.component.html',
  styleUrls: ['./download-search-abha.component.css']
})
export class DownloadSearchAbhaComponent {
  currentLanguageSet: any;
  abhaAuthMethodForm!: FormGroup;
  adhaarNumberForm!: FormGroup;
  idErrorText:any;
  enterAuthIdLabel: any;
  abhaSuffix = environment.abhaExtension;
  enableAuthIdField = false;
  healthId: any;
  enableOnlyAuthMode = false;
  enableAuthMethodForAbha = false;
  hide = true;
  allowAuthIdCharacters: number = 0;
  inputType: string = 'password';

  constructor(
    public dialogRef: MatDialogRef<DownloadSearchAbhaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private fb: FormBuilder,
    public httpServiceService: HttpServiceService,
    private registrarService: RegistrarService,
    private confirmationValService: ConfirmationService,
  ) {
    console.log('popupdata');
  }

  ngOnInit(): void {
    this.assignSelectedLanguage();
    this.abhaAuthMethodForm = this.createAbhaAuthMethod();
    this.adhaarNumberForm = this.createAdhaarForm();
    this.enableOnlyAuthMode = false;
    if(this.data.printCard !== undefined && this.data?.printCard && this.data?.healthId){
      this.enterAuthIdLabel = this.currentLanguageSet.enterABHANumber;
      this.enableAuthIdField = true;
      this.enableAuthMethodForAbha = true;
      this.abhaAuthMethodForm.controls['modeofAuthMethod'].setValue('ABHANUMBER');
      this.abhaAuthMethodForm.controls['abhaAuthId'].patchValue(this.data.healthId);
    } else if(this.data?.healthId){
      this.healthId = this.data.healthId;
      this.enableOnlyAuthMode = true;
    } else {
      this.enableOnlyAuthMode = false;
    }
  }
  
  createAbhaAuthMethod() {
    return this.fb.group({
      modeofAuthMethod: null,
      authMethodForAbha: null,
      abhaAuthId: [null, [
        Validators.required,
        Validators.pattern('^[0-9]*$')
      ]]
    });
  }

  createAdhaarForm(){
    return this.fb.group({
      part1: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      part2: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      part3: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]]
    });
  }
  
  closeDialogAuth() {
    this.dialogRef.close();
    this.abhaAuthMethodForm.reset();
  }

  ngDoCheck() {
    this.assignSelectedLanguage();
  }
  assignSelectedLanguage() {
    const getLanguageJson = new SetLanguageComponent(this.httpServiceService);
    getLanguageJson.setLanguage();
    this.currentLanguageSet = getLanguageJson.currentLanguageObject;
  }

  getAbhaAuthMethod(){
    const authMode = this.abhaAuthMethodForm.controls['modeofAuthMethod'].value;
    if(authMode === "AADHAAR" && !this.enableOnlyAuthMode){
      this.enterAuthIdLabel = this.currentLanguageSet.enterAadhaarNumber;
      this.enableAuthIdField = true;
      this.allowAuthIdCharacters = 12;
      this.enableAuthMethodForAbha = false;
    } else if(authMode === "MOBILE" && !this.enableOnlyAuthMode) {
      this.enterAuthIdLabel = this.currentLanguageSet.enterMobileNumber;
      this.enableAuthIdField = true;
      this.enableAuthMethodForAbha = false;
      this.allowAuthIdCharacters = 10;
    } else if(authMode === "ABHAADDRESS" && !this.enableOnlyAuthMode) {
      this.enterAuthIdLabel = this.currentLanguageSet.enterABHAAddress;
      this.enableAuthIdField = true;
      this.enableAuthMethodForAbha = true;
      this.allowAuthIdCharacters = 32;
    } else if(authMode === "ABHANUMBER" && !this.enableOnlyAuthMode) {
      this.enterAuthIdLabel = this.currentLanguageSet.enterABHANumber;
      this.enableAuthIdField = true;
      this.enableAuthMethodForAbha = true;
      this.allowAuthIdCharacters = 17;
    } else if (authMode === "MOBILE" && this.enableOnlyAuthMode){
      const loginMethod = "mobile";
      const loginHint = "abha"
      const loginId = this.healthId;
      this.requestOtpForAbhaLogin(loginHint, loginMethod ,loginId)
    } else if (authMode === "AADHAAR" && this.enableOnlyAuthMode){
      const loginMethod = "aadhaar";
      const loginHint = "abha"
      const loginId = this.healthId;
      this.requestOtpForAbhaLogin(loginHint, loginMethod ,loginId)
    }
  }

  checkAbhaIdType(){
    const authMode = this.abhaAuthMethodForm.controls['modeofAuthMethod'].value;
    let abhaAuthId: any;
    if(authMode === "AADHAAR"){
      abhaAuthId = this.adhaarNumberForm.controls['part1'].value + this.adhaarNumberForm.controls['part2'].value + this.adhaarNumberForm.controls['part3'].value;
    } else {
      abhaAuthId = this.abhaAuthMethodForm.controls['abhaAuthId'].value;
    }
    const abhaAuthMethod = this.abhaAuthMethodForm.controls['authMethodForAbha'].value;
    let loginHint = null;
    let loginMethod: any = null;
    let loginId = null;
    if (authMode === "ABHAADDRESS" && abhaAuthMethod === "AUTH_MOBILE" && (abhaAuthId.endsWith('@sbx') || abhaAuthId.endsWith('@abdm'))){
      loginHint = "abha-address";
      loginMethod = "mobile";
      loginId = this.abhaAuthMethodForm.controls['abhaAuthId'].value;
      this.requestOtpForAbhaLogin(loginHint, loginMethod, loginId);
    } else if (authMode === "ABHAADDRESS" && abhaAuthMethod === "AUTH_AADHAAR" && (abhaAuthId.endsWith('@sbx') || abhaAuthId.endsWith('@abdm'))){
      loginHint = "abha-address";
      loginMethod = "aadhaar";
      loginId = this.abhaAuthMethodForm.controls['abhaAuthId'].value;
      this.requestOtpForAbhaLogin(loginHint, loginMethod, loginId);
    } else if(authMode === "ABHANUMBER" && abhaAuthMethod === "AUTH_AADHAAR" && abhaAuthId.length === 17){
      loginHint = "abha-number";
      loginMethod = "aadhaar";
      loginId = this.abhaAuthMethodForm.controls['abhaAuthId'].value;
      this.requestOtpForAbhaLogin(loginHint, loginMethod, loginId);
    } else if(authMode === "ABHANUMBER" && abhaAuthMethod === "AUTH_MOBILE" && abhaAuthId.length === 17){
      loginHint = "abha-number";
      loginMethod = "mobile";
      loginId = this.abhaAuthMethodForm.controls['abhaAuthId'].value;
      this.requestOtpForAbhaLogin(loginHint, loginMethod, loginId);
    } else if(authMode === "AADHAAR" && abhaAuthId.length === 12){
      loginHint = "aadhaar";
      loginMethod = "aadhaar";
      loginId = this.adhaarNumberForm.controls['part1'].value + this.adhaarNumberForm.controls['part2'].value + this.adhaarNumberForm.controls['part3'].value;
      this.requestOtpForAbhaLogin(loginHint, loginMethod, loginId);
    } else if(authMode === "MOBILE" && abhaAuthId.length === 10) {
      loginHint = "mobile";
      loginMethod = "mobile";
      loginId = this.abhaAuthMethodForm.controls['abhaAuthId'].value;
      this.requestOtpForAbhaLogin(loginHint, loginMethod, loginId);
    } else {
      this.confirmationValService.alert(this.currentLanguageSet.enterCorrectAuthIdForAuthMode, 'error');
    }
  }

  goBackToOptions(){
    this.enableAuthIdField = false;
    this.enableAuthMethodForAbha = false;
    this.abhaAuthMethodForm.controls['abhaAuthId'].reset();
    this.abhaAuthMethodForm.controls['modeofAuthMethod'].reset();
    this.adhaarNumberForm.reset();
  }

  requestOtpForAbhaLogin(loginHint: any, loginMethod: any, loginId: any){
    let reqObj = {
      loginHint: loginHint,
      loginMethod: loginMethod,
      loginId: loginId
    }
    this.registrarService.requestOtpForAbhaLogin(reqObj).subscribe((res:any) => {
      if(res.statusCode === 200 && res.data){
        let txnId = res.data.txnId;
        let message = res.data.message;
        this.dialogRef.close();
        this.confirmationValService.alert(message, 'success').afterClosed().subscribe(result => {
          if(result !== false){
            this.routeToEnterOtpPage(txnId, loginMethod, loginHint);
          }
        })
      } else {
        this.confirmationValService.alert(res.errorMessage, 'error');
      }
    }, (err: any) => {
      this.confirmationValService.alert(err.errorMessage, 'error');
    });
  }

  routeToEnterOtpPage(txnId: any, loginMethod:any, loginHint: any){
    if(loginHint === "abha-address" && loginMethod === "aadhaar"){
      loginMethod = "abha-aadhaar"
    } else if (loginHint === "abha-address" && loginMethod === "mobile") {
      loginMethod = "abha-mobile"
    }
    const dialogRef = this.dialog.open(AbhaEnterOtpComponentComponent, {
      height: '250px',
      width: '420px',
      data: {
        txnId: txnId,
        loginMethod: loginMethod,
        loginHint: loginHint,
        aadharNumber: (this.abhaAuthMethodForm.controls['abhaAuthId'].value) ? this.abhaAuthMethodForm.controls['abhaAuthId'].value : (this.adhaarNumberForm.controls['part1'].value + this.adhaarNumberForm.controls['part2'].value + this.adhaarNumberForm.controls['part3'].value)
      },
    });
    this.dialogRef.afterClosed();
  }

  checkValidHealthID() {
    let healthidval: any;
    if(this.abhaAuthMethodForm.controls['modeofAuthMethod'].value === 'AADHAAR'){
      healthidval = this.adhaarNumberForm.controls['part1'].value + this.adhaarNumberForm.controls['part2'].value + this.adhaarNumberForm.controls['part3'].value;
    } else {
      healthidval = this.abhaAuthMethodForm.controls['abhaAuthId'].value;
    }
    const authMode = this.abhaAuthMethodForm.controls['modeofAuthMethod'].value;
  
    if (authMode === "AADHAAR" && healthidval?.length === 12 && /^\d{12}$/.test(healthidval)) {
      return true; 
    }  else if (authMode === "MOBILE" && healthidval?.length === 10 && /^\d{10}$/.test(healthidval)) {
      return true; 
    } else if (authMode === "ABHANUMBER" && healthidval?.length === 17 && /^(\d{2})-(\d{4})-(\d{4})-(\d{4})$/.test(healthidval)) {
      return true; // Valid Health ID with hyphens
    }
    let healthIDPattern;
    if(environment.abhaExtension === '@abdm'){
    healthIDPattern =  /^([a-zA-Z0-9])+(\.[a-zA-Z0-9]+)?@([a-zA-Z]{4})$/  // ABHA pattern with 4 letter domain
    } else {
    healthIDPattern =  /^([a-zA-Z0-9])+(\.[a-zA-Z0-9]+)?@([a-zA-Z]{3})$/;  // ABHA pattern with 3 letter domain - i.e., sbx
    }
  
    if (healthIDPattern.test(healthidval)) {
      return true; 
    }
  
    // If none of the conditions match, show error
    this.idErrorText = 'Please enter a valid Health ID / Aadhaar Number / Mobile Number';
    return false; // Invalid
  }

  moveToNext(event: any, nextElement: any) {
    if (event.target.value.length === 4) {
      nextElement.focus();
    }
  }

  moveToPrev(event: any, prevElement: any) {
    if (event.target.value.length === 0) {
      prevElement.focus();
    }
  }

  toggleVisibility() {
    this.inputType = this.inputType === 'password' ? 'text' : 'password';
  }

  get isInvalid() {
    return this.adhaarNumberForm.get('part1')?.invalid || this.adhaarNumberForm.get('part2')?.invalid || this.adhaarNumberForm.get('part3')?.invalid;
  }

  abhaNumberInputValidation(event: any) {
    const authMode = this.abhaAuthMethodForm.controls['modeofAuthMethod'].value;
  
    if (authMode === "ABHANUMBER") {
      // Get the value entered by the user and remove all non-numeric characters (including hyphens)
      let value = event.target.value.replace(/\D/g, '');
  
      if (value.length > 14) {
        value = value.slice(0, 14); // Truncate to 14 digits
      }
  
      let formattedValue = '';
      for (let i = 0; i < value.length; i++) {
        if (i === 2 || i === 6 || i === 10) {
          formattedValue += '-';
        }
        formattedValue += value[i];
      }
  
      this.abhaAuthMethodForm.controls['abhaAuthId'].setValue(formattedValue, { emitEvent: false });
    }
  }
  
  

}
