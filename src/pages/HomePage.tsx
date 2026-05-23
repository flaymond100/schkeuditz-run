import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import '../App.css';
import { fetchRaceCalendars } from '../lib/raceCalendar';
import { SCHKEUDITZ_CATEGORIES } from '../lib/schkeuditzCategories';

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HomePage() {
  const { data: races = [] } = useQuery({
    queryKey: ['raceCalendars'],
    queryFn: fetchRaceCalendars,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingRace = races.find(r => new Date(r.raceDate) >= today) ?? races[0];

  const formattedDate = upcomingRace
    ? new Date(upcomingRace.raceDate).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const registerPath = upcomingRace
    ? `/calendar/${upcomingRace.id}/register`
    : '/register';

  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-green-300/50 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-green-100">
              Laufevent Schkeuditz
            </span>
            <h1 className="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Schkeuditz Run
            </h1>
            {formattedDate && (
              <p className="text-lg font-medium text-green-100">{formattedDate}</p>
            )}
            {upcomingRace?.location && (
              <p className="flex items-center gap-2 text-green-200">
                <LocationIcon />
                {upcomingRace.location}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link className="btn-primary" to={registerPath}>
                Jetzt anmelden
              </Link>
              <Link
                className="btn-outline"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.1)' }}
                to="/results"
              >
                Ergebnisse
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Info strip */}
      {upcomingRace && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="info-strip-card">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                <CalendarIcon /> Datum
              </span>
              <p className="mt-1 font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formattedDate}
              </p>
            </div>
            <div className="info-strip-card">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                <LocationIcon /> Ort
              </span>
              <p className="mt-1 font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {upcomingRace.location || 'Schkeuditz'}
              </p>
            </div>
            <div className="info-strip-card">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                <TimerIcon /> Kategorien
              </span>
              <p className="mt-1 font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {SCHKEUDITZ_CATEGORIES.length} Wertungsklassen
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Wertungsklassen
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Für jeden ist eine Kategorie dabei.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SCHKEUDITZ_CATEGORIES.map(cat => (
            <div key={cat.id} className="category-card">
              <p className="font-heading text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {cat.label}
              </p>
              {cat.detail && (
                <p className="mt-1 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  {cat.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section
        className="mx-4 mb-12 rounded-2xl p-8 text-center sm:mx-6 lg:mx-auto lg:max-w-7xl lg:px-8"
        style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
      >
        <h2 className="font-heading text-2xl font-bold sm:text-3xl">
          Bereit? Jetzt anmelden!
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-green-100">
          Sichere deinen Startplatz — die Plätze sind begrenzt.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-bold transition hover:bg-green-50"
          style={{ color: 'var(--primary-dark)' }}
          to={registerPath}
        >
          Anmelden →
        </Link>
      </section>
    </>
  );
}
