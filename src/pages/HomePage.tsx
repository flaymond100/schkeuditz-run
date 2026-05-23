import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RaceCard } from '../components/RaceCard';
import { SectionIntro } from '../components/SectionIntro';
import {
  createRaceCategoryLabelMap,
  fetchRaceCategories,
} from '../lib/raceCategories';
import { fetchRaceCalendars } from '../lib/raceCalendar';
import { toRaceItems } from '../lib/racePresentation';
import { RaceTable } from '../components/RaceTable';

export function HomePage() {
  const {
    data: raceCalendar,
    isLoading: isRaceCalendarLoading,
    isError: isRaceCalendarError,
  } = useQuery({
    queryKey: ['race-calendar'],
    queryFn: fetchRaceCalendars,
  });

  const { data: raceCategories = [] } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  const races = toRaceItems(
    raceCalendar ?? [],
    createRaceCategoryLabelMap(raceCategories)
  );

  const upcomingRace = (raceCalendar ?? [])
    .filter(r => {
      const d = new Date(r.raceDate);
      if (Number.isNaN(d.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .sort((a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime())[0];

  const upcomingRaceCity = upcomingRace
    ? upcomingRace.location.split(',')[0]?.trim() || upcomingRace.location
    : null;

  const promotedRaceDate = upcomingRace
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(upcomingRace.raceDate))
    : 'Date TBA';

  return (
    <>
      <div className="h-[45vh] w-full overflow-hidden">
        <img
          src="/assets/header-image.jpeg"
          alt="Revolution Crit cyclists racing"
          className="h-full w-full object-cover object-[center_50%]"
        />
      </div>

    <div className="page-shell">
      <section className="hero-grid home-hero-section overflow-hidden rounded-4xl border border-(--border-dark) px-6 py-8 sm:px-10 sm:py-12 lg:px-7 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
          <div className="relative">
            <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold leading-[1.02] text-(--text-primary-dark) sm:text-5xl lg:text-7xl">
              We want to
            </h1>
            <span className="mt-5 max-w-3xl font-heading text-4xl font-semibold leading-none text-(--accent-secondary) sm:text-5xl lg:text-7xl">
              revolutionise
            </span>
            <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold leading-[1.02] text-(--text-primary-dark) sm:text-5xl lg:text-7xl">
              road cycling in Germany!
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-(--text-secondary-dark) sm:text-lg">
              Short, spectacular bike races through the urban canyons of German
              city centres. Food trucks, commentary, music, racing action... the
              spectators are in for a treat. The riders will get to show off
              their cornering skills and sprinting abilities in front of a live
              audience.
            </p>

            {/* <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="cta-button w-full justify-center sm:w-auto"
                to="/calendar"
              >
                Explore Upcoming Races
              </Link>
              <Link
                className="ghost-button w-full justify-center sm:w-auto"
                to="/contact"
              >
                Ask About Registration
              </Link>
            </div> */}

            {/* <dl className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="stat-card">
                <dt>Next race</dt>
                <dd>18 May</dd>
              </div>
              <div className="stat-card">
                <dt>Series format</dt>
                <dd>crit</dd>
              </div>
              <div className="stat-card">
                <dt>Fast path</dt>
                <dd>Races to results</dd>
              </div>

            </dl> */}
          </div>

          <div className="grid gap-4 self-end">
            <div className="hero-highlight-card rounded-[1.75rem] border border-(--border-dark) p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--accent-secondary)">
                Upcoming Highlight
              </p>
              <h2 className="mt-3 font-heading text-2xl font-semibold text-(--text-primary-dark)">
                {upcomingRace?.name ?? 'No upcoming races'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-(--text-secondary-dark)">
                {upcomingRace
                  ? `Highlighted event in ${upcomingRaceCity}. Explore category blocks and participant data from the race detail page.`
                  : 'New races will be announced here when scheduled.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="filter-chip">{promotedRaceDate}</span>
                <span className="filter-chip">
                  {upcomingRaceCity ?? 'Location TBA'}
                </span>
              </div>

              {upcomingRace && (upcomingRace.internalRegistration || upcomingRace.externalRegistrationUrl) ? (
                <div className="mt-5">
                  {upcomingRace.internalRegistration ? (
                    <Link
                      className="cta-button w-full justify-center"
                      to={`/calendar/${upcomingRace.id}/register`}
                    >
                      Register Now
                    </Link>
                  ) : (
                    <Link
                      className="cta-button w-full justify-center"
                      target="_blank"
                      to={upcomingRace.externalRegistrationUrl ?? '/calendar'}
                    >
                      Register Now
                    </Link>
                  )}
                </div>
              ) : null}
            </div>

            {/* <div className="grid gap-4 sm:grid-cols-2">
              <article className="surface-panel p-5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--accent-secondary)">Latest result</p>
                <h3 className="mt-3 font-heading text-xl font-semibold text-(--text-primary-dark)">2025 winners live here</h3>
                <p className="mt-2 text-sm leading-6 text-(--text-secondary-dark)">Jump from homepage to recent podiums without hunting through archive pages.</p>
              </article>
              <article className="surface-panel p-5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--accent-secondary)">Gallery archive</p>
                <h3 className="mt-3 font-heading text-xl font-semibold text-(--text-primary-dark)">Season and race-based</h3>
                <p className="mt-2 text-sm leading-6 text-(--text-secondary-dark)">Visual storytelling stays structured and easy to browse on small screens.</p>
              </article>
            </div> */}
          </div>
        </div>
      </section>

      <section className="space-y-6" aria-label="Race table">
        <h2 className="mt-4 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
          Race Calendar
        </h2>

        {isRaceCalendarLoading ? (
          <div className="surface-panel p-6 text-sm text-(--text-secondary-dark) sm:p-8">
            Loading race calendar...
          </div>
        ) : isRaceCalendarError ? (
          <div className="surface-panel p-6 text-sm text-(--text-secondary-dark) sm:p-8">
            Race calendar is temporarily unavailable. Please try again in a
            moment.
          </div>
        ) : (
          <RaceTable races={raceCalendar ?? []} />
        )}
      </section>

      <section className="space-y-6">
        <SectionIntro
          actionLabel="Full race calendar"
          actionTo="/calendar"
          description="Have a deep dive into the races."
          eyebrow="Races"
          title="Pick a race that suits you the most."
        />

        <div className="grid gap-5 xl:grid-cols-3">
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

      {/* <section className="secondary-cta-panel overflow-hidden rounded-[2rem] border border-white/10 px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <span className="eyebrow">Next step</span>
            <h2 className="mt-4 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
              Want race prep, a camp slot, or a direct answer before you sign
              up?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-(--text-secondary-dark)">
              Use the training camp route for structured off-race preparation or
              contact the team directly when registration, categories, or
              partner questions need a human answer.
            </p>
          </div>

          <div className="grid gap-3">
            <Link
              className="cta-button w-full justify-center"
              to="/training-camp"
            >
              Explore Training Camp
            </Link>
            <Link className="ghost-button w-full justify-center" to="/contact">
              Contact The Team
            </Link>
          </div>
        </div>
      </section> */}
    </div>
    </>
  );
}
