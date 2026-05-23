export type RegistrationFormState = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  clubTeam: string;
  nation: string;
  startingClass: string;
  uciLicenseNumber: string;
  email: string;
  privacyAccepted: boolean;
};

export type RegistrationFormErrors = Partial<
  Record<keyof RegistrationFormState, string>
>;

export const initialFormState: RegistrationFormState = {
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '',
  clubTeam: '',
  nation: 'GER',
  startingClass: '',
  uciLicenseNumber: '',
  email: '',
  privacyAccepted: false,
};

export const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function validateForm(
  state: RegistrationFormState
): RegistrationFormErrors {
  const errors: RegistrationFormErrors = {};

  if (!state.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!state.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  if (!state.birthDate) {
    errors.birthDate = 'Birth date is required.';
  }

  if (!state.gender) {
    errors.gender = 'Gender is required.';
  }

  if (!state.nation.trim()) {
    errors.nation = 'Nation is required.';
  }

  if (!state.startingClass) {
    errors.startingClass = 'Starting class is required.';
  }

  if (!state.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!state.privacyAccepted) {
    errors.privacyAccepted = 'You must accept the privacy policy.';
  }

  return errors;
}
