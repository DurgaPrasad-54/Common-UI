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
import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

@Component({
  selector: "app-aadhaar-correction-dialog",
  templateUrl: "aadhaar-correction-dialog.component.html",
})
export class AadhaarCorrectionDialogComponent {
  form: FormGroup;
  title: string;
  message: string;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AadhaarCorrectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.title = data?.title ?? "Aadhaar correction";
    this.message = data?.message ?? "Please correct Aadhaar provided details";
    const formData = data?.formData || {};
    this.form = this.fb.group({
      name: [
        formData.name || "",
        [Validators.required, Validators.minLength(1)],
      ],
      gender: [formData.gender || "", Validators.required],
      yearOfBirth: [
        formData.yearOfBirth || new Date().getFullYear(),
        [
          Validators.required,
          Validators.min(1900),
          Validators.max(new Date().getFullYear()),
        ],
      ],
    });
  }

  submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
