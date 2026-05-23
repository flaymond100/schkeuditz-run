import type {
  Participant,
  ParticipantRow,
  RaceCalendar,
  RaceCalendarWithRelations,
  RaceEntry,
  RaceSubRace,
  SubRacePriceTierRow,
} from '../types';
import { supabase } from './supabase';

function resolveActivePriceCents(prices: SubRacePriceTierRow[]): number | null {
  const now = new Date();
  const active = prices
    .filter(p => {
      const from = new Date(p.valid_from);
      const until = p.valid_until ? new Date(p.valid_until) : null;
      return from <= now && (until === null || until > now);
    })
    .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0];
  return active?.amount_cents ?? null;
}

export function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    teamName: row.team_name,
    nationality: row.nationality,
    email: row.email,
    phone: row.phone,
    uciNumber: row.uci_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRaceEntry(
  row: RaceCalendarWithRelations['race_sub_races'][number]['race_entries'][number]
): RaceEntry {
  return {
    id: row.id,
    subRaceId: row.sub_race_id,
    participantId: row.participant_id,
    isPaid: row.is_paid,
    paymentAmount: row.payment_amount,
    paymentCurrency: row.payment_currency,
    paymentDate: row.payment_date,
    bibNumber: row.bib_number,
    position: row.position,
    timeText: row.time_text,
    status: row.status,
    notes: row.notes,
    fromResultsUpload: row.from_results_upload,
    participant: row.participants
      ? mapParticipant(row.participants)
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRaceSubRace(
  row: RaceCalendarWithRelations['race_sub_races'][number]
): RaceSubRace {
  const prices = row.race_sub_race_prices ?? [];
  return {
    id: row.id,
    raceCalendarId: row.race_calendar_id,
    name: row.name,
    sortOrder: row.sort_order,
    activePriceCents: resolveActivePriceCents(prices),
    prices,
    entries: row.race_entries?.map(mapRaceEntry) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRaceCalendar(row: RaceCalendarWithRelations): RaceCalendar {
  return {
    id: row.id,
    name: row.name,
    raceDate: row.race_date,
    type: row.type,
    location: row.location,
    description: row.description,
    externalResultsUrl: row.external_results_url,
    externalRegistrationUrl: row.external_registration_url,
    internalRegistration: row.internal_registration,
    subRaces: row.race_sub_races?.map(mapRaceSubRace) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const raceCalendarSelect = `
  id,
  name,
  race_date,
  type,
  location,
  description,
  external_results_url,
  external_registration_url,
  internal_registration,
  created_at,
  updated_at,
  race_sub_races (
    id,
    race_calendar_id,
    name,
    sort_order,
    created_at,
    updated_at,
    race_sub_race_prices (
      id,
      sub_race_id,
      label,
      amount_cents,
      valid_from,
      valid_until,
      created_at
    ),
    race_entries (
      id,
      sub_race_id,
      participant_id,
      is_paid,
      payment_amount,
      payment_currency,
      payment_date,
      bib_number,
      position,
      time_text,
      status,
      notes,
      from_results_upload,
      created_at,
      updated_at,
      participants (
        id,
        full_name,
        date_of_birth,
        gender,
        team_name,
        nationality,
        email,
        phone,
        uci_number,
        created_at,
        updated_at
      )
    )
  )
`;

const SITE_KEY = import.meta.env.VITE_SITE_KEY as string;

export async function fetchRaceCalendars(): Promise<RaceCalendar[]> {
  const { data, error } = await supabase
    .from('race_calendar')
    .select(raceCalendarSelect)
    .eq('site', SITE_KEY)
    .order('race_date', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RaceCalendarWithRelations[];
  return rows.map(mapRaceCalendar);
}

export async function fetchRaceCalendarById(
  id: string
): Promise<RaceCalendar | null> {
  const { data, error } = await supabase
    .from('race_calendar')
    .select(raceCalendarSelect)
    .eq('id', id)
    .eq('site', SITE_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRaceCalendar(data as unknown as RaceCalendarWithRelations);
}
