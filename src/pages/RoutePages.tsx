import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RaceCard } from '../components/RaceCard';
import { RaceTable } from '../components/RaceTable';
import {
  createRaceCategoryLabelMap,
  fetchRaceCategories,
  resolveRaceCategoryLabel,
} from '../lib/raceCategories';
import { fetchRaceCalendarById, fetchRaceCalendars } from '../lib/raceCalendar';
import { toRaceItems } from '../lib/racePresentation';
import { supabase } from '../lib/supabase';
import type { RaceCalendar } from '../types';

const EXCLUDED_RACE_ID = 'd1c51dd8-7981-4c32-a6b6-af7f36fe769e';
const KARLIE_LAUF_RACE_ID = 'd1c51dd8-7981-4c32-a6b6-af7f36fe769e';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  finished: {
    label: 'Finished',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  dns: {
    label: 'DNS',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  dnf: {
    label: 'DNF',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  dsq: {
    label: 'DSQ',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

function StatusBadge({ status }: { status: string | null }) {
  const config = status ? STATUS_CONFIG[status] : null;

  if (!config) {
    return <span className="text-sm text-(--text-secondary-dark)">—</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function sortRacesByDate(races: RaceCalendar[]): RaceCalendar[] {
  return [...races].sort((a, b) => {
    const dateA = new Date(a.raceDate).getTime();
    const dateB = new Date(b.raceDate).getTime();
    return dateA - dateB;
  });
}

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  highlights: string[];
  ctaLabel?: string;
  ctaTo?: string;
};

function PlaceholderPage({
  eyebrow,
  title,
  description,
  highlights,
  ctaLabel,
  ctaTo,
}: PlaceholderPageProps) {
  return (
    <section className="page-shell">
      <div className="surface-panel overflow-hidden">
        <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-12">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="mt-4 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-(--text-secondary-dark) sm:text-lg">
              {description}
            </p>
            {ctaLabel && ctaTo ? (
              <Link className="cta-button mt-8 inline-flex" to={ctaTo}>
                {ctaLabel}
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3 self-start">
            {highlights.map(highlight => (
              <div
                key={highlight}
                className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-(--text-secondary-dark)"
              >
                {highlight}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function RacesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['race-calendar'],
    queryFn: fetchRaceCalendars,
  });

  const { data: raceCategories = [] } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  const visibleRaces = useMemo(
    () => (data ?? []).filter(race => race.id !== EXCLUDED_RACE_ID),
    [data]
  );

  const tableRaces = sortRacesByDate(visibleRaces);
  const races = toRaceItems(
    visibleRaces,
    createRaceCategoryLabelMap(raceCategories)
  );

  if (isLoading) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-6 sm:p-8">
          <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-10 w-full max-w-2xl animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-5 w-full max-w-3xl animate-pulse rounded bg-white/8" />
        </div>

        <div className="surface-panel overflow-hidden p-6 sm:p-8">
          <div className="h-9 w-full animate-pulse rounded bg-white/8" />
          <div className="mt-3 h-9 w-full animate-pulse rounded bg-white/8" />
          <div className="mt-3 h-9 w-full animate-pulse rounded bg-white/8" />
          <div className="mt-3 h-9 w-full animate-pulse rounded bg-white/8" />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="surface-panel h-92 animate-pulse rounded-[1.75rem] bg-white/5"
            />
          ))}
        </div>
      </section>
    );
  }

  if (races.length === 0) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-8 text-center sm:p-10">
          <span className="eyebrow">Race calendar</span>
          <h1 className="mt-5 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
            No races published yet.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-(--text-secondary-dark)">
            The calendar is currently empty. Check back soon or reach out
            directly for pre-release race and registration information.
          </p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <Link className="cta-button w-full justify-center" to="/contact">
              Contact Organizers
            </Link>
            <Link
              className="ghost-button w-full justify-center"
              to="/training-camp"
            >
              See Training Camp
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <section className="space-y-6" aria-label="Race table">
        <h2 className="mt-4 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
          Race Calendar
        </h2>
        <RaceTable races={tableRaces} />
      </section>

      <section className="space-y-6" aria-label="Race cards">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {races.map((race, index) => (
            <RaceCard
              key={race.id}
              categories={race.categories}
              city={race.city}
              date={race.date}
              description={race.description}
              featured={index === 0}
              format={race.format}
              id={race.id}
              registrationStatus={race.registrationStatus}
              round={race.round}
              title={race.title}
              venue={race.venue}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

type RaceDetailPageProps = {
  fixedRaceId?: string;
  countLabelSingular?: string;
  countLabelPlural?: string;
  registeredLabel?: string;
};

export function RaceDetailPage({
  fixedRaceId,
  countLabelSingular = 'rider',
  countLabelPlural = 'riders',
  registeredLabel = 'Registered riders',
}: RaceDetailPageProps = {}) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const raceId = fixedRaceId ?? slug;
  const [session, setSession] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: raceCalendarData = [], isLoading: isRaceCalendarLoading } =
    useQuery({
      queryKey: ['race-calendar'],
      queryFn: fetchRaceCalendars,
      enabled: !fixedRaceId,
    });

  const { data: fixedRace, isLoading: isFixedRaceLoading } = useQuery({
    queryKey: ['race-calendar-by-id', raceId],
    queryFn: () => fetchRaceCalendarById(raceId ?? ''),
    enabled: Boolean(fixedRaceId && raceId),
  });

  const race = useMemo(() => {
    if (fixedRaceId) {
      return fixedRace ?? undefined;
    }

    return raceCalendarData.find(item => item.id === raceId);
  }, [fixedRace, fixedRaceId, raceCalendarData, raceId]);

  const isLoading = fixedRaceId ? isFixedRaceLoading : isRaceCalendarLoading;

  const sortedSubRaces = useMemo(() => {
    if (!race?.subRaces) {
      return [];
    }

    return [...race.subRaces].sort((a, b) => {
      const left = a.sortOrder ?? 999;
      const right = b.sortOrder ?? 999;
      return left - right;
    });
  }, [race]);

  const { data: raceCategories = [] } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  const raceCategoryLabels = useMemo(
    () => createRaceCategoryLabelMap(raceCategories),
    [raceCategories]
  );

  const isPast = useMemo(() => {
    if (!race?.raceDate) return false;
    const raceDate = new Date(race.raceDate);
    if (Number.isNaN(raceDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return raceDate < today;
  }, [race?.raceDate]);

  const formattedDate = useMemo(() => {
    if (!race?.raceDate) {
      return 'TBA';
    }

    const parsed = new Date(race.raceDate);
    if (Number.isNaN(parsed.getTime())) {
      return race.raceDate;
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  }, [race?.raceDate]);

  const raceTypeLabel = useMemo(() => {
    if (!race?.type) {
      return 'Race';
    }

    return race.type
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(part => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, [race?.type]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(data.session ?? null);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleDeleteRace() {
    if (!race || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      'Delete this race? This will also remove related categories and entries.'
    );

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const subRaceIds = (race.subRaces ?? []).map(subRace => subRace.id);

      if (subRaceIds.length > 0) {
        const { error: entryDeleteError } = await supabase
          .from('race_entries')
          .delete()
          .in('sub_race_id', subRaceIds);

        if (entryDeleteError) {
          throw entryDeleteError;
        }

        const { error: subRaceDeleteError } = await supabase
          .from('race_sub_races')
          .delete()
          .eq('race_calendar_id', race.id);

        if (subRaceDeleteError) {
          throw subRaceDeleteError;
        }
      }

      const { error: raceDeleteError } = await supabase
        .from('race_calendar')
        .delete()
        .eq('id', race.id);

      if (raceDeleteError) {
        throw raceDeleteError;
      }

      navigate('/calendar');
    } catch (error) {
      if (error instanceof Error) {
        setDeleteError(error.message);
      } else {
        setDeleteError('Could not delete race.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-6 sm:p-8">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-10 w-full max-w-2xl animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-5 w-full max-w-3xl animate-pulse rounded bg-white/8" />
        </div>
        <div className="surface-panel p-6 sm:p-8">
          <div className="h-10 w-full animate-pulse rounded bg-white/8" />
          <div className="mt-4 h-56 w-full animate-pulse rounded bg-white/8" />
        </div>
      </section>
    );
  }

  if (!race) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-8 text-center sm:p-10">
          <span className="eyebrow">Race detail</span>
          <h1 className="mt-5 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
            Race not found.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-(--text-secondary-dark)">
            We could not find a race for identifier {raceId ?? 'unknown-race'}.
          </p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <Link className="cta-button w-full justify-center" to="/calendar">
              Back to races
            </Link>
            <Link className="ghost-button w-full justify-center" to="/contact">
              Contact organizers
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="surface-panel overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.16),transparent_38%),radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_34%),linear-gradient(145deg,rgba(18,25,35,0.96),rgba(11,15,20,0.98))] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <span className="eyebrow">Race detail</span>
        <h1 className="mt-5 max-w-4xl font-heading text-4xl font-semibold leading-[1.06] text-(--text-primary-dark) sm:text-5xl lg:text-6xl">
          {race.name}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-(--text-secondary-dark)">
          {raceTypeLabel} at {race.location}. Date: {formattedDate}.
        </p>

        {race.description ? (
          <div className="mt-6 max-w-3xl rounded-2xl border border-white/10 bg-white/5 px-4 py-4 sm:px-5 sm:py-5">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2 className="mt-2 font-heading text-2xl font-semibold text-(--text-primary-dark)">
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h3 className="mt-2 font-heading text-xl font-semibold text-(--text-primary-dark)">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="mt-2 font-heading text-lg font-semibold text-(--text-primary-dark)">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mt-3 text-sm leading-7 text-(--text-secondary-dark) sm:text-base">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mt-3 list-disc space-y-1 pl-6 text-sm leading-7 text-(--text-secondary-dark) sm:text-base">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm leading-7 text-(--text-secondary-dark) sm:text-base">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                a: ({ children, href }) => (
                  <a
                    className="text-(--accent-secondary) underline underline-offset-4 transition hover:opacity-85"
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="mt-4 border-l-2 border-white/20 pl-4 text-sm italic text-(--text-secondary-dark) sm:text-base">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-(--text-primary-dark)">
                    {children}
                  </code>
                ),
              }}
            >
              {race.description}
            </ReactMarkdown>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {isPast ? (
            <Link
              className="cta-button w-full justify-center sm:w-auto"
              to={`/results/${new Date(race.raceDate).getFullYear()}/${race.id}`}
            >
              Results
            </Link>
          ) : race.internalRegistration ? (
            <Link
              className="cta-button w-full justify-center sm:w-auto"
              to={`/calendar/${race.id}/register`}
            >
              Register now
            </Link>
          ) : race.externalRegistrationUrl ? (
            <Link
              className="cta-button w-full justify-center sm:w-auto"
              target="_blank"
              to={race.externalRegistrationUrl}
            >
              Register now
            </Link>
          ) : null}
          {race.externalResultsUrl ? (
            <a
              className="ghost-button w-full justify-center sm:w-auto"
              href={race.externalResultsUrl}
              rel="noreferrer"
              target="_blank"
            >
              External results
            </a>
          ) : null}
          {session ? (
            <Link
              className="ghost-button w-full justify-center sm:w-auto"
              to={`/races/${race.id}/edit`}
            >
              Modify race
            </Link>
          ) : null}
          {session ? (
            <Link
              className="ghost-button w-full justify-center sm:w-auto"
              to={`/races/${race.id}/results`}
            >
              Edit results
            </Link>
          ) : null}
          {session ? (
            <button
              className="ghost-button w-full justify-center border-rose-400/40 text-rose-200 hover:bg-rose-500/12 sm:w-auto"
              disabled={isDeleting}
              onClick={handleDeleteRace}
              type="button"
            >
              {isDeleting ? 'Deleting...' : 'Delete race'}
            </button>
          ) : null}
        </div>
        {deleteError ? (
          <p className="mt-4 rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {deleteError}
          </p>
        ) : null}
      </div>

      {race.internalRegistration && sortedSubRaces.length > 0 ? (
        <div id="results" className="surface-panel p-6 sm:p-8 scroll-mt-24">
          <span className="eyebrow">Participants</span>
          <h2 className="mt-3 font-heading text-2xl font-semibold text-(--text-primary-dark) sm:text-3xl">
            {registeredLabel}
          </h2>

          <div className="mt-6 space-y-6">
            {sortedSubRaces.map(subRace => {
              const entries = subRace.entries ?? [];
              return (
                <div
                  key={subRace.id}
                  className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-heading text-lg font-semibold text-(--text-primary-dark)">
                      {resolveRaceCategoryLabel(
                        subRace.name,
                        raceCategoryLabels
                      )}
                    </h3>
                    <span className="text-xs text-(--text-secondary-dark)">
                      {entries.length}{' '}
                      {entries.length === 1
                        ? countLabelSingular
                        : countLabelPlural}
                    </span>
                  </div>

                  {entries.length === 0 ? (
                    <p className="mt-4 text-sm text-(--text-secondary-dark)">
                      No registered participants yet.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-(--border-dark) text-(--text-secondary-dark)">
                            <th className="px-3 py-2 font-medium">#</th>
                            <th className="px-3 py-2 font-medium">Name</th>
                            <th className="px-3 py-2 font-medium">Team</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry, index) => (
                            <tr
                              key={entry.id}
                              className="border-b border-(--border-dark)/50 last:border-0"
                            >
                              <td className="px-3 py-2 text-(--text-secondary-dark)">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 text-(--text-primary-dark)">
                                {entry.participant?.fullName ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-(--text-secondary-dark)">
                                {entry.participant?.teamName ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function KarlieLaufPage() {
  return (
    <RaceDetailPage
      fixedRaceId={KARLIE_LAUF_RACE_ID}
      countLabelSingular="participant"
      countLabelPlural="participants"
      registeredLabel="Registered participants"
    />
  );
}

const AVAILABLE_SEASONS = [2026];

export function ResultsPage() {
  const navigate = useNavigate();
  const [selectedSeason, setSelectedSeason] = useState<string>(
    String(AVAILABLE_SEASONS[0])
  );

  const handleGo = () => {
    if (selectedSeason) navigate(`/results/${selectedSeason}`);
  };

  return (
    <section className="page-shell">
      <div className="surface-panel p-6 sm:p-8">
        <span className="eyebrow">Results</span>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
          Past races
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary-dark)">
          Pick a season to see all past races and their results.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-(--text-secondary-dark)">Season</label>
          <select
            className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-2.5 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
            onChange={e => setSelectedSeason(e.target.value)}
            value={selectedSeason}
          >
            {AVAILABLE_SEASONS.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            className="cta-button px-5 py-2"
            onClick={handleGo}
            type="button"
          >
            View season
          </button>
        </div>
      </div>
    </section>
  );
}

function formatPastRaceDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function ResultsSeasonPage() {
  const { season } = useParams();
  const seasonYear = Number(season);

  const { data: raceCalendar = [], isLoading } = useQuery({
    queryKey: ['race-calendar'],
    queryFn: fetchRaceCalendars,
  });

  const pastRaces = useMemo(() => {
    if (!Number.isFinite(seasonYear)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return raceCalendar
      .filter(r => {
        if (r.id === EXCLUDED_RACE_ID) return false;
        const d = new Date(r.raceDate);
        if (Number.isNaN(d.getTime())) return false;
        return d < today && d.getFullYear() === seasonYear;
      })
      .sort(
        (a, b) =>
          new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime()
      );
  }, [raceCalendar, seasonYear]);

  return (
    <section className="page-shell">
      <div className="surface-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow">Season results</span>
            <h1 className="mt-3 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
              {seasonYear || 'Unknown season'}
            </h1>
            <p className="mt-2 text-sm text-(--text-secondary-dark)">
              {pastRaces.length}{' '}
              {pastRaces.length === 1 ? 'past race' : 'past races'} in this
              season.
            </p>
          </div>
          <Link className="ghost-button" to="/results">
            All seasons
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="surface-panel p-6 sm:p-8 text-(--text-secondary-dark)">
          Loading races…
        </div>
      ) : pastRaces.length === 0 ? (
        <div className="surface-panel p-6 sm:p-8 text-(--text-secondary-dark)">
          No past races for {seasonYear}.
        </div>
      ) : (
        <div className="surface-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse">
              <thead>
                <tr className="border-b border-(--border-dark) text-left text-[0.68rem] uppercase tracking-[0.24em] text-(--text-secondary-dark)">
                  <th className="px-6 py-4 font-semibold">Race</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {pastRaces.map(race => (
                  <tr
                    key={race.id}
                    className="border-b border-(--border-dark) text-sm text-(--text-secondary-dark)"
                  >
                    <td className="px-6 py-4 font-heading text-base font-semibold text-(--text-primary-dark)">
                      {race.name || 'Untitled race'}
                    </td>
                    <td className="px-6 py-4 text-(--text-primary-dark)">
                      {formatPastRaceDate(race.raceDate)}
                    </td>
                    <td className="px-6 py-4">{race.location}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        className="cta-button px-4 py-2"
                        to={`/results/${seasonYear}/${race.id}`}
                      >
                        View results
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function ResultsRacePage() {
  const { raceSlug, season } = useParams();
  const [selectedSubRaceId, setSelectedSubRaceId] = useState<string>('');

  const { data: race, isLoading } = useQuery({
    queryKey: ['race-results-page', raceSlug],
    queryFn: () => fetchRaceCalendarById(raceSlug ?? ''),
    enabled: Boolean(raceSlug),
  });

  const { data: raceCategories = [] } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  const raceCategoryLabels = useMemo(
    () => createRaceCategoryLabelMap(raceCategories),
    [raceCategories]
  );

  const sortedSubRaces = useMemo(() => {
    if (!race?.subRaces) return [];
    return [...race.subRaces].sort(
      (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
    );
  }, [race]);

  useEffect(() => {
    if (sortedSubRaces.length === 0) {
      setSelectedSubRaceId('');
      return;
    }
    if (
      !selectedSubRaceId ||
      !sortedSubRaces.some(s => s.id === selectedSubRaceId)
    ) {
      setSelectedSubRaceId(sortedSubRaces[0].id);
    }
  }, [selectedSubRaceId, sortedSubRaces]);

  const selectedSubRace = useMemo(
    () => sortedSubRaces.find(s => s.id === selectedSubRaceId) ?? null,
    [sortedSubRaces, selectedSubRaceId]
  );

  const sortedEntries = useMemo(() => {
    const entries = (selectedSubRace?.entries ?? []).filter(
      e => e.fromResultsUpload
    );
    return [...entries].sort((a, b) => {
      if (a.position !== null && b.position !== null)
        return a.position - b.position;
      if (a.position !== null) return -1;
      if (b.position !== null) return 1;
      return 0;
    });
  }, [selectedSubRace]);

  const formattedDate = useMemo(() => {
    if (!race?.raceDate) return 'TBA';
    const parsed = new Date(race.raceDate);
    if (Number.isNaN(parsed.getTime())) return race.raceDate;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  }, [race?.raceDate]);

  if (isLoading) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-6 sm:p-8 text-(--text-secondary-dark)">
          Loading results…
        </div>
      </section>
    );
  }

  if (!race) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-8 text-center sm:p-10">
          <span className="eyebrow">Results</span>
          <h1 className="mt-5 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
            Race not found
          </h1>
          <Link
            className="cta-button mt-6 inline-flex"
            to={`/results/${season ?? ''}`}
          >
            Back to season
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="surface-panel p-6 sm:p-8">
        <span className="eyebrow">Results</span>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
          {race.name}
        </h1>
        <p className="mt-2 text-sm text-(--text-secondary-dark)">
          {formattedDate} · {race.location}
        </p>
      </div>

      {sortedSubRaces.length === 0 ? (
        <div className="surface-panel p-6 sm:p-8 text-(--text-secondary-dark)">
          No categories configured for this race.
        </div>
      ) : (
        <div className="surface-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--border-dark) pb-5">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              {selectedSubRace
                ? resolveRaceCategoryLabel(
                    selectedSubRace.name,
                    raceCategoryLabels
                  )
                : '—'}
            </h2>
            <select
              className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-2.5 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={e => setSelectedSubRaceId(e.target.value)}
              value={selectedSubRaceId}
            >
              {sortedSubRaces.map(subRace => (
                <option key={subRace.id} value={subRace.id}>
                  {resolveRaceCategoryLabel(subRace.name, raceCategoryLabels)}
                </option>
              ))}
            </select>
          </div>

          {sortedEntries.length === 0 ? (
            <p className="mt-6 text-sm text-(--text-secondary-dark)">
              No results posted for this category yet.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--border-dark) text-(--text-secondary-dark)">
                    <th className="px-3 py-3 font-medium">Pos</th>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Team</th>
                    <th className="px-3 py-3 font-medium">Time</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map(entry => (
                    <tr
                      key={entry.id}
                      className="border-b border-(--border-dark)/50 last:border-0"
                    >
                      <td className="px-3 py-3 text-(--text-primary-dark)">
                        {entry.position ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-(--text-primary-dark)">
                        {entry.participant?.fullName ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-(--text-secondary-dark)">
                        {entry.participant?.teamName ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-(--text-secondary-dark)">
                        {entry.timeText ?? '—'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function CategoriesPage() {
  return (
    <PlaceholderPage
      description="Category information will explain eligibility, race formats, and start structures with conversion-friendly sign-up prompts."
      eyebrow="Categories"
      highlights={[
        'Good fit for chips, comparison cards, and FAQ modules.',
        'Supports category-specific registration and schedule logic.',
        'Built to reduce confusion before race-day sign-up.',
      ]}
      title="Clearer entry points for every rider level."
    />
  );
}

export function GalleryPage() {
  return (
    <PlaceholderPage
      ctaLabel="Open 2026 gallery"
      ctaTo="/gallery/2026"
      description="Gallery archives are split by season and race so event photography stays easy to browse and sponsor-safe to surface."
      eyebrow="Gallery overview"
      highlights={[
        'Supports season archives and race-specific sub-galleries.',
        'Ready for media grids, filters, and partner placements.',
        'Keeps visual storytelling separate from transactional race flows.',
      ]}
      title="A cleaner media archive for the series."
    />
  );
}

export function GallerySeasonPage() {
  const { season } = useParams();

  return (
    <PlaceholderPage
      ctaLabel="Open race gallery"
      ctaTo={`/gallery/${season ?? '2026'}/berlin-night-circuit`}
      description={`Season ${season ?? '2026'} can now group galleries by round, campaign, or race weekend.`}
      eyebrow="Season gallery"
      highlights={[
        `Season parameter: ${season ?? '2026'}`,
        'Prepared for masonry or grid-based media layouts.',
        'Keeps archive structure consistent with the results hierarchy.',
      ]}
      title={`Gallery archive ${season ?? '2026'}`}
    />
  );
}

export function GalleryRacePage() {
  const { raceSlug, season } = useParams();

  return (
    <PlaceholderPage
      ctaLabel="Back to season gallery"
      ctaTo={`/gallery/${season ?? '2026'}`}
      description="This placeholder covers the race-level media archive with room for image grids, captions, and sponsor-friendly placements."
      eyebrow="Race gallery"
      highlights={[
        `Season: ${season ?? '2026'}`,
        `Race: ${raceSlug ?? 'berlin-night-circuit'}`,
        'Future-ready for photo credits, filtering, and gallery downloads.',
      ]}
      title="Race gallery detail"
    />
  );
}

export function AboutPage() {
  return (
    <PlaceholderPage
      description="Short, spectacular bike races through the urban canyons of German city centres. Food trucks, commentary, music, racing action... the spectators are in for a treat. The riders will get to show off their cornering skills and sprinting abilities in front of a live audience."
      eyebrow="About"
      highlights={[]}
      title="About the series"
    />
  );
}

export function TrainingCampPage() {
  return (
    <PlaceholderPage
      description="A secondary route for clinics, off-season prep, and training content that complements the race calendar without competing with it."
      eyebrow="Training camp"
      highlights={[
        'Good fit for camp dates, schedules, and registration plans.',
        'Lives in secondary navigation to keep the primary race flow focused.',
        'Can later branch into packages, coaches, and accommodation content.',
      ]}
      title="Training camp"
    />
  );
}

export function PartnersPage() {
  return (
    <PlaceholderPage
      description=""
      eyebrow="Partners"
      highlights={[]}
      title="Partners"
    />
  );
}

export function ContactPage() {
  return (
    <PlaceholderPage
      description={
        <>
          Feel free to reach out by email at{' '}
          <a
            className="text-(--accent-secondary) underline underline-offset-4 transition hover:opacity-85"
            href="mailto:kontakt@rsc-nordsachen.de"
          >
            kontakt@rsc-nordsachen.de
          </a>
        </>
      }
      eyebrow="Contact"
      highlights={[]}
      title="Contact"
    />
  );
}

export function FaqPage() {
  return (
    <PlaceholderPage
      description="FAQ content will reduce support load by answering registration, categories, timing, and event-day logistics in one place."
      eyebrow="FAQ"
      highlights={[
        'Best paired with accordion sections and deep links from race pages.',
        'Supports rider onboarding and pre-race clarification.',
        'Secondary navigation placement keeps the primary menu tight.',
      ]}
      title="Frequently asked questions"
    />
  );
}

export function ImprintPage() {
  return (
    <section className="page-shell">
      <div className="surface-panel px-6 py-8 sm:px-8 sm:py-10">
        <span className="eyebrow">Legal</span>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
          Impressum &amp; Haftungsausschluss
        </h1>

        <section className="mt-8 space-y-4 text-base leading-7 text-(--text-secondary-dark)">
          <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
            Impressum
          </h2>
          <p>Rechtliche Angaben gemäß §5 TMG</p>

          <p>
            Diensteanbieter:
            <br />
            RSC (Radsportclub) Nordsachsen e.V.
            <br />
            Breite Straße 27
            <br />
            04509 Delitzsch
          </p>

          <p>
            Kontaktmöglichkeiten:
            <br />
            E-Mail-Adresse: kontakt@rsc-nordsachsen.de
            <br />
            Telefon: 015115535786
          </p>

          <p>
            Vertretungsberechtigte Person:
            <br />
            Erik Heidrich, 1. Vorsitzender
          </p>
        </section>

        <section className="mt-10 space-y-4 text-base leading-7 text-(--text-secondary-dark)">
          <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
            Haftungsausschluss
          </h2>

          <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
            Haftung für Inhalte
          </h3>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
            §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
            überwachen oder nach Umständen zu forschen, die auf eine
            rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung
            oder Sperrung der Nutzung von Informationen nach den allgemeinen
            Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist
            jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
            Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
            Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </p>

          <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
            Haftung für Links
          </h3>
          <p>
            Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren
            Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
            fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
            der Seiten verantwortlich. Die verlinkten Seiten wurden zum
            Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
            Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
            erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten
            Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung
            nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir
            derartige Links umgehend entfernen.
          </p>

          <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
            Urheberrecht
          </h3>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
            diesen Seiten unterliegen dem deutschen Urheberrecht. Die
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
            schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            Downloads und Kopien dieser Seite sind nur für den privaten, nicht
            kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser
            Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte
            Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
            gekennzeichnet. Sollten Sie trotzdem auf eine
            Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
            entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
            werden wir derartige Inhalte umgehend entfernen.
          </p>
        </section>
      </div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <section className="page-shell">
      <div className="surface-panel p-6 sm:p-8 lg:p-10">
        <article className="mx-auto max-w-4xl space-y-8 text-sm leading-7 text-(--text-secondary-dark) sm:text-base">
          <header className="space-y-3">
            <span className="eyebrow">Legal</span>
            <h1 className="font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
              Datenschutzerklaerung
            </h1>
          </header>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              1. Datenschutz auf einen Blick
            </h2>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Allgemeine Hinweise
            </h3>
            <p>
              Die folgenden Hinweise geben einen einfachen Ueberblick darueber,
              was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
              Website besuchen. Personenbezogene Daten sind alle Daten, mit
              denen Sie persoenlich identifiziert werden koennen. Ausfuehrliche
              Informationen zum Thema Datenschutz entnehmen Sie unserer unter
              diesem Text aufgefuehrten Datenschutzerklaerung.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Datenerfassung auf dieser Website
            </h3>
            <p>
              <strong>
                Wer ist verantwortlich fuer die Datenerfassung auf dieser
                Website?
              </strong>{' '}
              Die Datenverarbeitung auf dieser Website erfolgt durch den
              Websitebetreiber. Dessen Kontaktdaten koennen Sie dem Abschnitt
              Hinweis zur Verantwortlichen Stelle in dieser
              Datenschutzerklaerung entnehmen.
            </p>
            <p>
              <strong>Wie erfassen wir Ihre Daten?</strong> Ihre Daten werden
              zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei
              kann es sich z. B. um Daten handeln, die Sie in ein
              Kontaktformular eingeben. Andere Daten werden automatisch oder
              nach Ihrer Einwilligung beim Besuch der Website durch unsere
              IT-Systeme erfasst. Das sind vor allem technische Daten (z. B.
              Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
              Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese
              Website betreten.
            </p>
            <p>
              <strong>Wofuer nutzen wir Ihre Daten?</strong> Ein Teil der Daten
              wird erhoben, um eine fehlerfreie Bereitstellung der Website zu
              gewaehrleisten. Andere Daten koennen zur Analyse Ihres
              Nutzerverhaltens verwendet werden. Sofern ueber die Website
              Vertraege geschlossen oder angebahnt werden koennen, werden die
              uebermittelten Daten auch fuer Vertragsangebote, Bestellungen oder
              sonstige Auftragsanfragen verarbeitet.
            </p>
            <p>
              <strong>Welche Rechte haben Sie bezueglich Ihrer Daten?</strong>{' '}
              Sie haben jederzeit das Recht, unentgeltlich Auskunft ueber
              Herkunft, Empfaenger und Zweck Ihrer gespeicherten
              personenbezogenen Daten zu erhalten. Sie haben ausserdem ein
              Recht, die Berichtigung oder Loeschung dieser Daten zu verlangen.
              Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben,
              koennen Sie diese Einwilligung jederzeit fuer die Zukunft
              widerrufen. Ausserdem haben Sie das Recht, unter bestimmten
              Umstaenden die Einschraenkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein
              Beschwerderecht bei der zustaendigen Aufsichtsbehoerde zu. Hierzu
              sowie zu weiteren Fragen zum Thema Datenschutz koennen Sie sich
              jederzeit an uns wenden.
            </p>
            <p>
              <strong>Analyse-Tools und Tools von Drittanbietern</strong>
              <br />
              Beim Besuch dieser Website kann Ihr Surf-Verhalten statistisch
              ausgewertet werden. Das geschieht vor allem mit sogenannten
              Analyseprogrammen. Detaillierte Informationen zu diesen
              Analyseprogrammen finden Sie in der folgenden
              Datenschutzerklaerung.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              2. Hosting
            </h2>
            <p>
              Wir hosten die Inhalte unserer Website bei folgendem Anbieter:
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Externes Hosting
            </h3>
            <p>
              Diese Website wird extern gehostet. Die personenbezogenen Daten,
              die auf dieser Website erfasst werden, werden auf den Servern des
              Hosters / der Hoster gespeichert. Hierbei kann es sich v. a. um
              IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten,
              Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige
              Daten, die ueber eine Website generiert werden, handeln.
            </p>
            <p>
              Das externe Hosting erfolgt zum Zwecke der Vertragserfuellung
              gegenueber unseren potenziellen und bestehenden Kunden (Art. 6
              Abs. 1 lit. b DSGVO) und im Interesse einer sicheren, schnellen
              und effizienten Bereitstellung unseres Online-Angebots durch einen
              professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO). Sofern eine
              entsprechende Einwilligung abgefragt wurde, erfolgt die
              Verarbeitung ausschliesslich auf Grundlage von Art. 6 Abs. 1 lit.
              a DSGVO und Paragraph 25 Abs. 1 TDDDG, soweit die Einwilligung die
              Speicherung von Cookies oder den Zugriff auf Informationen im
              Endgeraet des Nutzers (z. B. Device-Fingerprinting) im Sinne des
              TDDDG umfasst. Die Einwilligung ist jederzeit widerrufbar.
            </p>
            <p>
              Unser(e) Hoster wird bzw. werden Ihre Daten nur insoweit
              verarbeiten, wie dies zur Erfuellung seiner Leistungspflichten
              erforderlich ist und unsere Weisungen in Bezug auf diese Daten
              befolgen.
            </p>
            <p>
              <strong>Wir setzen folgende(n) Hoster ein:</strong>
              <br />
              GitHub Inc
              <br />
              88 Colin P Kelly Jr St
              <br />
              San Francisco, CA 94107
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              3. Allgemeine Hinweise und Pflichtinformationen
            </h2>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Datenschutz
            </h3>
            <p>
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persoenlichen
              Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten
              vertraulich und entsprechend den gesetzlichen
              Datenschutzvorschriften sowie dieser Datenschutzerklaerung.
            </p>
            <p>
              Wenn Sie diese Website benutzen, werden verschiedene
              personenbezogene Daten erhoben. Personenbezogene Daten sind Daten,
              mit denen Sie persoenlich identifiziert werden koennen. Die
              vorliegende Datenschutzerklaerung erlaeutert, welche Daten wir
              erheben und wofuer wir sie nutzen. Sie erlaeutert auch, wie und zu
              welchem Zweck das geschieht.
            </p>
            <p>
              Wir weisen darauf hin, dass die Datenuebertragung im Internet (z.
              B. bei der Kommunikation per E-Mail) Sicherheitsluecken aufweisen
              kann. Ein lueckenloser Schutz der Daten vor dem Zugriff durch
              Dritte ist nicht moeglich.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Hinweis zur verantwortlichen Stelle
            </h3>
            <p>
              Die verantwortliche Stelle fuer die Datenverarbeitung auf dieser
              Website ist:
              <br />
              Erik Heidrich
              <br />
              Breslauer Strasse 32
              <br />
              97072 Wuerzburg
              <br />
              Telefon: +49 (0) 1511 5535786
              <br />
              E-Mail: kontakt@rsc-nordsachsen.de
            </p>
            <p>
              Verantwortliche Stelle ist die natuerliche oder juristische
              Person, die allein oder gemeinsam mit anderen ueber die Zwecke und
              Mittel der Verarbeitung von personenbezogenen Daten (z. B. Namen,
              E-Mail-Adressen o. Ae.) entscheidet.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Speicherdauer
            </h3>
            <p>
              Soweit innerhalb dieser Datenschutzerklaerung keine speziellere
              Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen
              Daten bei uns, bis der Zweck fuer die Datenverarbeitung entfaellt.
              Wenn Sie ein berechtigtes Loeschersuchen geltend machen oder eine
              Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten
              geloescht, sofern wir keine anderen rechtlich zulaessigen Gruende
              fuer die Speicherung Ihrer personenbezogenen Daten haben (z. B.
              steuer- oder handelsrechtliche Aufbewahrungsfristen); im
              letztgenannten Fall erfolgt die Loeschung nach Fortfall dieser
              Gruende.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung
              auf dieser Website
            </h3>
            <p>
              Sofern Sie in die Datenverarbeitung eingewilligt haben,
              verarbeiten wir Ihre personenbezogenen Daten auf Grundlage von
              Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 lit. a DSGVO, sofern
              besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO verarbeitet
              werden. Im Falle einer ausdruecklichen Einwilligung in die
              Uebertragung personenbezogener Daten in Drittstaaten erfolgt die
              Datenverarbeitung ausserdem auf Grundlage von Art. 49 Abs. 1 lit.
              a DSGVO. Sofern Sie in die Speicherung von Cookies oder in den
              Zugriff auf Informationen in Ihr Endgeraet (z. B. via
              Device-Fingerprinting) eingewilligt haben, erfolgt die
              Datenverarbeitung zusaetzlich auf Grundlage von Paragraph 25 Abs.
              1 TDDDG. Die Einwilligung ist jederzeit widerrufbar. Sind Ihre
              Daten zur Vertragserfuellung oder zur Durchfuehrung
              vorvertraglicher Massnahmen erforderlich, verarbeiten wir Ihre
              Daten auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Des Weiteren
              verarbeiten wir Ihre Daten, sofern diese zur Erfuellung einer
              rechtlichen Verpflichtung erforderlich sind auf Grundlage von Art.
              6 Abs. 1 lit. c DSGVO. Die Datenverarbeitung kann ferner auf
              Grundlage unseres berechtigten Interesses nach Art. 6 Abs. 1 lit.
              f DSGVO erfolgen. Ueber die jeweils im Einzelfall einschlaegigen
              Rechtsgrundlagen wird in den folgenden Absaetzen dieser
              Datenschutzerklaerung informiert.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Empfaenger von personenbezogenen Daten
            </h3>
            <p>
              Im Rahmen unserer Geschaeftstaetigkeit arbeiten wir mit
              verschiedenen externen Stellen zusammen. Dabei ist teilweise auch
              eine Uebermittlung von personenbezogenen Daten an diese externen
              Stellen erforderlich. Wir geben personenbezogene Daten nur dann an
              externe Stellen weiter, wenn dies im Rahmen einer
              Vertragserfuellung erforderlich ist, wenn wir gesetzlich hierzu
              verpflichtet sind (z. B. Weitergabe von Daten an Steuerbehoerden),
              wenn wir ein berechtigtes Interesse nach Art. 6 Abs. 1 lit. f
              DSGVO an der Weitergabe haben oder wenn eine sonstige
              Rechtsgrundlage die Datenweitergabe erlaubt. Beim Einsatz von
              Auftragsverarbeitern geben wir personenbezogene Daten unserer
              Kunden nur auf Grundlage eines gueltigen Vertrags ueber
              Auftragsverarbeitung weiter. Im Falle einer gemeinsamen
              Verarbeitung wird ein Vertrag ueber gemeinsame Verarbeitung
              geschlossen.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Widerruf Ihrer Einwilligung zur Datenverarbeitung
            </h3>
            <p>
              Viele Datenverarbeitungsvorgaenge sind nur mit Ihrer
              ausdruecklichen Einwilligung moeglich. Sie koennen eine bereits
              erteilte Einwilligung jederzeit widerrufen. Die Rechtmaessigkeit
              der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom
              Widerruf unberuehrt.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Widerspruchsrecht gegen die Datenerhebung in besonderen Faellen
              sowie gegen Direktwerbung (Art. 21 DSGVO)
            </h3>
            <p className="uppercase tracking-wide">
              Wenn die Datenverarbeitung auf Grundlage von Art. 6 Abs. 1 lit. e
              oder f DSGVO erfolgt, haben Sie jederzeit das Recht, aus Gruenden,
              die sich aus Ihrer besonderen Situation ergeben, gegen die
              Verarbeitung Ihrer personenbezogenen Daten Widerspruch einzulegen;
              dies gilt auch fuer ein auf diese Bestimmungen gestuetztes
              Profiling. Die jeweilige Rechtsgrundlage, auf denen eine
              Verarbeitung beruht, entnehmen Sie dieser Datenschutzerklaerung.
              Wenn Sie Widerspruch einlegen, werden wir Ihre betroffenen
              personenbezogenen Daten nicht mehr verarbeiten, es sei denn, wir
              koennen zwingende schutzwuerdige Gruende fuer die Verarbeitung
              nachweisen, die Ihre Interessen, Rechte und Freiheiten ueberwiegen
              oder die Verarbeitung dient der Geltendmachung, Ausuebung oder
              Verteidigung von Rechtsanspruechen (Widerspruch nach Art. 21 Abs.
              1 DSGVO). Werden Ihre personenbezogenen Daten verarbeitet, um
              Direktwerbung zu betreiben, so haben Sie das Recht, jederzeit
              Widerspruch gegen die Verarbeitung Sie betreffender
              personenbezogener Daten zum Zwecke derartiger Werbung einzulegen;
              dies gilt auch fuer das Profiling, soweit es mit solcher
              Direktwerbung in Verbindung steht. Wenn Sie widersprechen, werden
              Ihre personenbezogenen Daten anschliessend nicht mehr zum Zwecke
              der Direktwerbung verwendet (Widerspruch nach Art. 21 Abs. 2
              DSGVO).
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Beschwerderecht bei der zustaendigen Aufsichtsbehoerde
            </h3>
            <p>
              Im Falle von Verstoessen gegen die DSGVO steht den Betroffenen ein
              Beschwerderecht bei einer Aufsichtsbehoerde, insbesondere in dem
              Mitgliedstaat ihres gewoehnlichen Aufenthalts, ihres
              Arbeitsplatzes oder des Orts des mutmasslichen Verstosses zu. Das
              Beschwerderecht besteht unbeschadet anderweitiger
              verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Recht auf Datenuebertragbarkeit
            </h3>
            <p>
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer
              Einwilligung oder in Erfuellung eines Vertrags automatisiert
              verarbeiten, an sich oder an einen Dritten in einem gaengigen,
              maschinenlesbaren Format aushaendigen zu lassen. Sofern Sie die
              direkte Uebertragung der Daten an einen anderen Verantwortlichen
              verlangen, erfolgt dies nur, soweit es technisch machbar ist.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Auskunft, Berichtigung und Loeschung
            </h3>
            <p>
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen
              jederzeit das Recht auf unentgeltliche Auskunft ueber Ihre
              gespeicherten personenbezogenen Daten, deren Herkunft und
              Empfaenger und den Zweck der Datenverarbeitung und ggf. ein Recht
              auf Berichtigung oder Loeschung dieser Daten. Hierzu sowie zu
              weiteren Fragen zum Thema personenbezogene Daten koennen Sie sich
              jederzeit an uns wenden.
            </p>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Recht auf Einschraenkung der Verarbeitung
            </h3>
            <p>
              Sie haben das Recht, die Einschraenkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen. Hierzu koennen Sie sich
              jederzeit an uns wenden. Das Recht auf Einschraenkung der
              Verarbeitung besteht in folgenden Faellen:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten
                personenbezogenen Daten bestreiten, benoetigen wir in der Regel
                Zeit, um dies zu ueberpruefen. Fuer die Dauer der Pruefung haben
                Sie das Recht, die Einschraenkung der Verarbeitung Ihrer
                personenbezogenen Daten zu verlangen.
              </li>
              <li>
                Wenn die Verarbeitung Ihrer personenbezogenen Daten
                unrechtmaessig geschah/geschieht, koennen Sie statt der
                Loeschung die Einschraenkung der Datenverarbeitung verlangen.
              </li>
              <li>
                Wenn wir Ihre personenbezogenen Daten nicht mehr benoetigen, Sie
                sie jedoch zur Ausuebung, Verteidigung oder Geltendmachung von
                Rechtsanspruechen benoetigen, haben Sie das Recht, statt der
                Loeschung die Einschraenkung der Verarbeitung Ihrer
                personenbezogenen Daten zu verlangen.
              </li>
              <li>
                Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt
                haben, muss eine Abwaegung zwischen Ihren und unseren Interessen
                vorgenommen werden. Solange noch nicht feststeht, wessen
                Interessen ueberwiegen, haben Sie das Recht, die Einschraenkung
                der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.
              </li>
            </ul>
            <p>
              Wenn Sie die Verarbeitung Ihrer personenbezogenen Daten
              eingeschraenkt haben, duerfen diese Daten - von ihrer Speicherung
              abgesehen - nur mit Ihrer Einwilligung oder zur Geltendmachung,
              Ausuebung oder Verteidigung von Rechtsanspruechen oder zum Schutz
              der Rechte einer anderen natuerlichen oder juristischen Person
              oder aus Gruenden eines wichtigen oeffentlichen Interesses der
              Europaeischen Union oder eines Mitgliedstaats verarbeitet werden.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              4. Datenerfassung auf dieser Website
            </h2>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Cookies
            </h3>
            <p>
              Unsere Internetseiten verwenden so genannte Cookies. Cookies sind
              kleine Datenpakete und richten auf Ihrem Endgeraet keinen Schaden
              an. Sie werden entweder voruebergehend fuer die Dauer einer
              Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf
              Ihrem Endgeraet gespeichert. Session-Cookies werden nach Ende
              Ihres Besuchs automatisch geloescht. Permanente Cookies bleiben
              auf Ihrem Endgeraet gespeichert, bis Sie diese selbst loeschen
              oder eine automatische Loeschung durch Ihren Webbrowser erfolgt.
            </p>
            <p>
              Cookies koennen von uns (First-Party-Cookies) oder von
              Drittunternehmen stammen (sog. Third-Party-Cookies).
              Third-Party-Cookies ermoeglichen die Einbindung bestimmter
              Dienstleistungen von Drittunternehmen innerhalb von Webseiten (z.
              B. Cookies zur Abwicklung von Zahlungsdienstleistungen). Cookies
              haben verschiedene Funktionen. Zahlreiche Cookies sind technisch
              notwendig, da bestimmte Webseitenfunktionen ohne diese nicht
              funktionieren wuerden (z. B. die Warenkorbfunktion oder die
              Anzeige von Videos). Andere Cookies koennen zur Auswertung des
              Nutzerverhaltens oder zu Werbezwecken verwendet werden.
            </p>
            <p>
              Cookies, die zur Durchfuehrung des elektronischen
              Kommunikationsvorgangs, zur Bereitstellung bestimmter, von Ihnen
              erwuenschter Funktionen (z. B. fuer die Warenkorbfunktion) oder
              zur Optimierung der Website (z. B. Cookies zur Messung des
              Webpublikums) erforderlich sind (notwendige Cookies), werden auf
              Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert, sofern keine
              andere Rechtsgrundlage angegeben wird. Der Websitebetreiber hat
              ein berechtigtes Interesse an der Speicherung von notwendigen
              Cookies zur technisch fehlerfreien und optimierten Bereitstellung
              seiner Dienste.
            </p>
            <p>
              Sofern eine Einwilligung zur Speicherung von Cookies und
              vergleichbaren Wiedererkennungstechnologien abgefragt wurde,
              erfolgt die Verarbeitung ausschliesslich auf Grundlage dieser
              Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und Paragraph 25 Abs. 1
              TDDDG); die Einwilligung ist jederzeit widerrufbar. Sie koennen
              Ihren Browser so einstellen, dass Sie ueber das Setzen von Cookies
              informiert werden und Cookies nur im Einzelfall erlauben, die
              Annahme von Cookies fuer bestimmte Faelle oder generell
              ausschliessen sowie das automatische Loeschen der Cookies beim
              Schliessen des Browsers aktivieren. Bei der Deaktivierung von
              Cookies kann die Funktionalitaet dieser Website eingeschraenkt
              sein. Sofern weitere Cookies und Dienste auf dieser Website
              eingesetzt werden, koennen Sie dies dieser Datenschutzerklaerung
              entnehmen.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              5. Soziale Medien
            </h2>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Instagram
            </h3>
            <p>
              Auf dieser Website sind Funktionen des Dienstes Instagram
              eingebunden. Diese Funktionen werden angeboten durch die Meta
              Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5,
              Irland. Wenn das Social-Media-Element aktiv ist, wird eine direkte
              Verbindung zwischen Ihrem Endgeraet und dem Instagram-Server
              hergestellt. Instagram erhaelt dadurch Informationen ueber den
              Besuch dieser Website durch Sie.
            </p>
            <p>
              Wenn Sie in Ihrem Instagram-Account eingeloggt sind, koennen Sie
              durch Anklicken des Instagram-Buttons die Inhalte dieser Website
              mit Ihrem Instagram-Profil verlinken. Dadurch kann Instagram den
              Besuch dieser Website Ihrem Benutzerkonto zuordnen. Wir weisen
              darauf hin, dass wir als Anbieter der Seiten keine Kenntnis vom
              Inhalt der uebermittelten Daten sowie deren Nutzung durch
              Instagram erhalten. Die Nutzung dieses Dienstes erfolgt auf
              Grundlage Ihrer Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und
              Paragraph 25 Abs. 1 TDDDG. Die Einwilligung ist jederzeit
              widerrufbar.
            </p>
            <p>
              Soweit mit Hilfe des hier beschriebenen Tools personenbezogene
              Daten auf unserer Website erfasst und an Facebook bzw. Instagram
              weitergeleitet werden, sind wir und die Meta Platforms Ireland
              Limited gemeinsam fuer diese Datenverarbeitung verantwortlich
              (Art. 26 DSGVO). Die gemeinsame Verantwortlichkeit beschraenkt
              sich dabei ausschliesslich auf die Erfassung der Daten und deren
              Weitergabe an Facebook bzw. Instagram. Die nach der Weiterleitung
              erfolgende Verarbeitung durch Facebook bzw. Instagram ist nicht
              Teil der gemeinsamen Verantwortung.
            </p>
            <p>
              Den Wortlaut der Vereinbarung finden Sie unter{' '}
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://www.facebook.com/legal/controller_addendum"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://www.facebook.com/legal/controller_addendum
              </a>
              . Die Datenuebertragung in die USA wird auf die
              Standardvertragsklauseln der EU-Kommission gestuetzt.
            </p>
            <p>
              Details finden Sie hier:
              <br />
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://www.facebook.com/legal/EU_data_transfer_addendum"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://www.facebook.com/legal/EU_data_transfer_addendum
              </a>
              <br />
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://privacycenter.instagram.com/policy"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://privacycenter.instagram.com/policy
              </a>
              <br />
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://de-de.facebook.com/help/566994660333381"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://de-de.facebook.com/help/566994660333381
              </a>
            </p>
            <p>
              Weitere Informationen hierzu finden Sie in der
              Datenschutzerklaerung von Instagram:{' '}
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://privacycenter.instagram.com/policy/"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://privacycenter.instagram.com/policy/
              </a>
              .
            </p>
            <p>
              Das Unternehmen verfuegt ueber eine Zertifizierung nach dem EU-US
              Data Privacy Framework (DPF). Weitere Informationen hierzu
              erhalten Sie vom Anbieter unter folgendem Link:{' '}
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://www.dataprivacyframework.gov/participant/4452"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://www.dataprivacyframework.gov/participant/4452
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              6. Newsletter
            </h2>
            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Newsletterversand an Bestandskunden
            </h3>
            <p>
              Wenn Sie Waren oder Dienstleistungen bei uns bestellen und hierbei
              Ihre E-Mail-Adresse hinterlegen, kann diese E-Mail-Adresse in der
              Folge durch uns fuer den Versand von Newslettern verwendet werden,
              sofern wir Sie vorab hierueber informieren. In einem solchen Fall
              wird ueber den Newsletter nur Direktwerbung fuer eigene aehnliche
              Waren oder Dienstleistungen versendet. Die Zusendung dieses
              Newsletters kann von Ihnen jederzeit gekuendigt werden. Zu diesem
              Zweck findet sich in jedem Newsletter ein entsprechender Link.
            </p>
            <p>
              Rechtsgrundlage fuer den Versand des Newsletters ist in diesem
              Fall Art. 6 Abs. 1 lit. f DSGVO in Verbindung mit Paragraph 7 Abs.
              3 UWG. Nach Ihrer Austragung aus der Newsletterverteilerliste wird
              Ihre E-Mail-Adresse bei uns ggf. in einer Blacklist gespeichert,
              um kuenftige Mailings an Sie zu verhindern. Die Daten aus der
              Blacklist werden nur fuer diesen Zweck verwendet und nicht mit
              anderen Daten zusammengefuehrt. Dies dient sowohl Ihrem Interesse
              als auch unserem Interesse an der Einhaltung der gesetzlichen
              Vorgaben beim Versand von Newslettern (berechtigtes Interesse im
              Sinne des Art. 6 Abs. 1 lit. f DSGVO). Die Speicherung in der
              Blacklist ist zeitlich nicht befristet. Sie koennen der
              Speicherung widersprechen, sofern Ihre Interessen unser
              berechtigtes Interesse ueberwiegen.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
              7. Plugins und Tools
            </h2>

            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Google Maps
            </h3>
            <p>
              Diese Seite nutzt den Kartendienst Google Maps. Anbieter ist die
              Google Ireland Limited (Google), Gordon House, Barrow Street,
              Dublin 4, Irland. Mit Hilfe dieses Dienstes koennen wir
              Kartenmaterial auf unserer Website einbinden. Zur Nutzung der
              Funktionen von Google Maps ist es notwendig, Ihre IP-Adresse zu
              speichern. Diese Informationen werden in der Regel an einen Server
              von Google in den USA uebertragen und dort gespeichert.
            </p>
            <p>
              Der Anbieter dieser Seite hat keinen Einfluss auf diese
              Datenuebertragung. Wenn Google Maps aktiviert ist, kann Google zum
              Zwecke der einheitlichen Darstellung der Schriftarten Google Fonts
              verwenden. Beim Aufruf von Google Maps laedt Ihr Browser die
              benoetigten Web Fonts in ihren Browsercache, um Texte und
              Schriftarten korrekt anzuzeigen.
            </p>
            <p>
              Die Nutzung von Google Maps erfolgt im Interesse einer
              ansprechenden Darstellung unserer Online-Angebote und an einer
              leichten Auffindbarkeit der von uns auf der Website angegebenen
              Orte. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6
              Abs. 1 lit. f DSGVO dar. Sofern eine entsprechende Einwilligung
              abgefragt wurde, erfolgt die Verarbeitung ausschliesslich auf
              Grundlage von Art. 6 Abs. 1 lit. a DSGVO und Paragraph 25 Abs. 1
              TDDDG, soweit die Einwilligung die Speicherung von Cookies oder
              den Zugriff auf Informationen im Endgeraet des Nutzers (z. B.
              Device-Fingerprinting) im Sinne des TDDDG umfasst. Die
              Einwilligung ist jederzeit widerrufbar. Die Datenuebertragung in
              die USA wird auf die Standardvertragsklauseln der EU-Kommission
              gestuetzt.
            </p>
            <p>
              Details finden Sie hier:
              <br />
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://privacy.google.com/businesses/gdprcontrollerterms"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://privacy.google.com/businesses/gdprcontrollerterms
              </a>
              <br />
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://privacy.google.com/businesses/gdprcontrollerterms/sccs"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://privacy.google.com/businesses/gdprcontrollerterms/sccs
              </a>
            </p>
            <p>
              Mehr Informationen zum Umgang mit Nutzerdaten finden Sie in der
              Datenschutzerklaerung von Google:{' '}
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://policies.google.com/privacy?hl=de"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://policies.google.com/privacy?hl=de
              </a>
              .
            </p>
            <p>
              Das Unternehmen verfuegt ueber eine Zertifizierung nach dem EU-US
              Data Privacy Framework (DPF). Weitere Informationen hierzu
              erhalten Sie vom Anbieter unter folgendem Link:{' '}
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://www.dataprivacyframework.gov/participant/5780"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://www.dataprivacyframework.gov/participant/5780
              </a>
              .
            </p>
            <p>
              Quelle:{' '}
              <a
                className="underline decoration-white/40 underline-offset-4 transition hover:decoration-white/80"
                href="https://www.e-recht24.de"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://www.e-recht24.de
              </a>
            </p>
          </section>
        </article>
      </div>
    </section>
  );
}
