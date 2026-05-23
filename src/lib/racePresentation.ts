import type { RaceItem, RaceRegistrationStatus } from '../data/races';
import { resolveRaceCategoryLabel } from './raceCategories';
import type { RaceCalendar, RaceSubRace, RaceType } from '../types';

const raceCovers = [
  'linear-gradient(140deg, rgba(124,58,237,0.58), rgba(11,15,20,0.72)), radial-gradient(circle at 82% 16%, rgba(0,212,255,0.48), transparent 38%)',
  'linear-gradient(140deg, rgba(11,15,20,0.82), rgba(18,25,35,0.9)), radial-gradient(circle at 14% 20%, rgba(255,90,54,0.46), transparent 34%)',
  'linear-gradient(135deg, rgba(18,25,35,0.84), rgba(11,15,20,0.96)), radial-gradient(circle at 78% 90%, rgba(0,212,255,0.36), transparent 42%)',
  'linear-gradient(155deg, rgba(124,58,237,0.5), rgba(18,25,35,0.92)), radial-gradient(circle at 22% 16%, rgba(255,90,54,0.3), transparent 34%)',
  'linear-gradient(125deg, rgba(11,15,20,0.88), rgba(18,25,35,0.98)), radial-gradient(circle at 84% 24%, rgba(0,212,255,0.28), transparent 40%)',
];

function formatRaceDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatRaceType(type: RaceType): string {
  if (!type) {
    return 'Race';
  }

  return type
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseCity(location: string): string {
  const city = location.split(',')[0]?.trim();
  return city || location;
}

export function registrationStatus(race: RaceCalendar): RaceRegistrationStatus {
  const raceDate = new Date(race.raceDate);
  if (!Number.isNaN(raceDate.getTime()) && raceDate.getTime() < Date.now()) {
    return 'Registration Closed';
  }

  if (!race.internalRegistration && !race.externalRegistrationUrl) {
    return 'Registration Closed';
  }

  return 'Registration Open';
}

export function toRaceItem(
  race: RaceCalendar,
  index: number,
  categoryLabels: Map<string, string> = new Map()
): RaceItem {
  const city = parseCity(race.location);
  const typeLabel = formatRaceType(race.type);
  const categoryNames =
    race.subRaces?.map(subRace =>
      resolveRaceCategoryLabel(subRace.name, categoryLabels)
    ) ?? [];
  const raceTitle = race.name?.trim() ? race.name : `${city} ${typeLabel}`;

  return {
    id: race.id,
    round: `Round ${(index + 1).toString().padStart(2, '0')}`,
    title: raceTitle,
    date: formatRaceDate(race.raceDate),
    city,
    venue: race.location,
    description: race.description,
    categories: categoryNames.length > 0 ? categoryNames : ['Open'],
    format:
      categoryNames.length > 0 ? `${categoryNames.length} categories` : 'TBA',
    externalRegistrationUrl: race.externalRegistrationUrl ?? undefined,
    registrationStatus: registrationStatus(race),
    cover: raceCovers[index % raceCovers.length],
  };
}

export function toRaceItems(
  races: RaceCalendar[],
  categoryLabels: Map<string, string> = new Map()
): RaceItem[] {
  return races.map((race, index) => toRaceItem(race, index, categoryLabels));
}

export function toFallbackRaceCalendars(items: RaceItem[]): RaceCalendar[] {
  return items.map(item => {
    const subRaces: RaceSubRace[] = item.categories.map(
      (category, subRaceIndex) => ({
        id: `${item.id}-${subRaceIndex + 1}`,
        raceCalendarId: item.id,
        name: category,
        sortOrder: subRaceIndex + 1,
        activePriceCents: null,
        prices: [],
        entries: [],
        createdAt: '',
        updatedAt: '',
      })
    );

    return {
      id: item.id,
      name: item.title,
      raceDate: item.date,
      type: 'criterium',
      location: `${item.city}, ${item.venue}`,
      externalResultsUrl: null,
      externalRegistrationUrl:
        item.registrationStatus === 'Registration Closed' ? null : '#',
      internalRegistration: false,
      subRaces,
      createdAt: '',
      updatedAt: '',
    };
  });
}
