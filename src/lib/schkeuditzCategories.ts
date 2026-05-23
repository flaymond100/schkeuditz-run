export interface SchkeuditzCategory {
  id: string;
  label: string;
  detail: string;
  impliedGender?: 'male' | 'female';
}

export const SCHKEUDITZ_CATEGORIES: SchkeuditzCategory[] = [
  { id: 'lauf_5km',          label: '5km-Lauf',          detail: '5 Runden'    },
  { id: 'lauf_10km',         label: '10km Lauf',          detail: '10 Runden'   },
  { id: 'u13m_u15w',         label: 'U13m/U15w',          detail: '20 Runden'   },
  { id: 'u15m_u17w',         label: 'U15m/U17w',          detail: '25 Runden'   },
  { id: 'u17m_masters4',     label: 'U17m/Masters 4',     detail: '35 Runden'   },
  { id: 'masters_2_3',       label: 'Masters 2/3',         detail: '45 Runden'   },
  { id: 'jedermann_leicht',  label: 'Jedermann leicht',   detail: '45 Minuten',  impliedGender: 'male'   },
  { id: 'kids_races',        label: 'Kids Races',          detail: ''            },
  { id: 'jedermann_schwer',  label: 'Jedermann schwer',   detail: '60 Minuten',  impliedGender: 'male'   },
  { id: 'jedefrau',          label: 'Jedefrau',            detail: '45 Minuten',  impliedGender: 'female' },
];
