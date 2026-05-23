export type RaceRegistrationStatus =
  | 'Registration Open'
  | 'Waitlist'
  | 'Registration Coming Soon'
  | 'Registration Closed';

export type RaceItem = {
  id: string;
  round: string;
  title: string;
  date: string;
  city: string;
  venue: string;
  description?: string | null;
  categories: string[];
  format: string;
  registrationStatus: RaceRegistrationStatus;
  externalRegistrationUrl?: string;
  cover: string;
};
