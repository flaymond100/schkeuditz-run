export type RegistrationFormState = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  clubTeam: string;
  nation: string;
  startingClass: string;
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
  email: '',
  privacyAccepted: false,
};

export const genderOptions = [
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
  { value: 'other', label: 'Divers' },
];

export function validateForm(
  state: RegistrationFormState
): RegistrationFormErrors {
  const errors: RegistrationFormErrors = {};

  if (!state.firstName.trim()) {
    errors.firstName = 'Vorname ist erforderlich.';
  }

  if (!state.lastName.trim()) {
    errors.lastName = 'Nachname ist erforderlich.';
  }

  if (!state.birthDate) {
    errors.birthDate = 'Geburtsdatum ist erforderlich.';
  }

  if (!state.gender) {
    errors.gender = 'Geschlecht ist erforderlich.';
  }

  if (!state.nation.trim()) {
    errors.nation = 'Nationalität ist erforderlich.';
  }

  if (!state.startingClass) {
    errors.startingClass = 'Wertungsklasse ist erforderlich.';
  }

  if (!state.email.trim()) {
    errors.email = 'E-Mail ist erforderlich.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    errors.email = 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  if (!state.privacyAccepted) {
    errors.privacyAccepted = 'Du musst der Datenschutzerklärung zustimmen.';
  }

  return errors;
}
