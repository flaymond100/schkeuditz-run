import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createRaceCategoryLabelMap,
  fetchRaceCategories,
  resolveRaceCategoryLabel,
} from '../lib/raceCategories';
import { fetchRaceCalendarById } from '../lib/raceCalendar';
import { NATIONS } from '../lib/nations';
import { SCHKEUDITZ_CATEGORIES } from '../lib/schkeuditzCategories';
import { createPaymentCheckout } from '../lib/paymentApi';
import {
  genderOptions,
  initialFormState,
  validateForm,
  type RegistrationFormErrors,
  type RegistrationFormState,
} from './utils';

const inputClass =
  'w-full rounded-xl border-2 border-[var(--border)] bg-white px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]';
const labelClass = 'grid gap-1.5 text-sm font-medium text-[var(--text-secondary)]';
const errorClass = 'text-sm text-red-600';

export function RaceRegistrationPage() {
  const { slug } = useParams();
  const [formState, setFormState] = useState<RegistrationFormState>(initialFormState);
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const { data: race, isLoading, isError } = useQuery({
    queryKey: ['race-registration', slug],
    queryFn: () => fetchRaceCalendarById(slug ?? ''),
    enabled: Boolean(slug),
  });

  const { data: raceCategories = [] } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  const sortedSubRaces = useMemo(() => {
    if (!race?.subRaces) return [];
    return [...race.subRaces]
      .filter(s => s.name !== 'frauen')
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [race]);

  useEffect(() => {
    if (sortedSubRaces.length === 0) {
      setFormState(current => ({ ...current, startingClass: '' }));
      return;
    }
    setFormState(current => {
      if (current.startingClass && sortedSubRaces.some(s => s.id === current.startingClass)) {
        return current;
      }
      return { ...current, startingClass: sortedSubRaces[0].id };
    });
  }, [sortedSubRaces]);

  const raceCategoryLabels = useMemo(
    () => createRaceCategoryLabelMap(raceCategories),
    [raceCategories]
  );

  const selectedSubRace = useMemo(
    () => sortedSubRaces.find(s => s.id === formState.startingClass) ?? null,
    [sortedSubRaces, formState.startingClass]
  );

  const impliedGender = useMemo(
    () => SCHKEUDITZ_CATEGORIES.find(c => c.id === selectedSubRace?.name)?.impliedGender ?? null,
    [selectedSubRace]
  );

  useEffect(() => {
    if (impliedGender) {
      setFormState(current => ({ ...current, gender: impliedGender }));
    }
  }, [impliedGender]);

  const paymentMutation = useMutation({ mutationFn: createPaymentCheckout });

  const activePriceCents = selectedSubRace?.activePriceCents ?? null;
  const formDisabled = sortedSubRaces.length === 0 || activePriceCents === null || paymentMutation.isPending;

  const handleFieldChange = (field: keyof RegistrationFormState, value: string | boolean) => {
    setFormState(current => ({ ...current, [field]: value }));
    setErrors(current => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
  };

  const handleSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(formState);
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length > 0 || !race) return;
    if (activePriceCents === null) {
      setSubmitError('Keine Preiskonfiguration für diese Wertungsklasse.');
      return;
    }

    const baseUrl = window.location.origin;
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

    try {
      const { checkoutUrl } = await paymentMutation.mutateAsync({
        subRaceId: formState.startingClass,
        participant: {
          fullName: `${formState.firstName} ${formState.lastName}`.trim(),
          email: formState.email,
          dateOfBirth: formState.birthDate,
          gender: formState.gender,
          teamName: formState.clubTeam,
          nationality: formState.nation,
        },
        successUrl: `${baseUrl}${basePath}/registration-success?raceId=${race.id}`,
        cancelUrl: `${baseUrl}${basePath}/calendar/${race.id}/register?payment=cancelled`,
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Checkout konnte nicht gestartet werden.');
    }
  };

  if (isLoading) return <Loader />;
  if (isError || !race) return <ErrorSection />;

  const formattedDate = new Date(race.raceDate).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <section className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.7fr]">
        {/* Form */}
        <form className="surface-panel p-6 sm:p-8" noValidate onSubmit={handleSubmit}>
          <div className="border-b-2 border-[var(--border)] pb-5">
            <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
              Online-Anmeldung{race.name ? ` – ${race.name}` : ''}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Mit * markierte Felder sind Pflichtfelder.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {/* Vorname */}
            <label className={labelClass}>
              <span>Vorname *</span>
              <input
                className={inputClass}
                name="firstName"
                onChange={e => handleFieldChange('firstName', e.target.value)}
                placeholder="Vorname"
                type="text"
                value={formState.firstName}
              />
              {errors.firstName && <span className={errorClass}>{errors.firstName}</span>}
            </label>

            {/* Nachname */}
            <label className={labelClass}>
              <span>Nachname *</span>
              <input
                className={inputClass}
                name="lastName"
                onChange={e => handleFieldChange('lastName', e.target.value)}
                placeholder="Nachname"
                type="text"
                value={formState.lastName}
              />
              {errors.lastName && <span className={errorClass}>{errors.lastName}</span>}
            </label>

            {/* Geburtsdatum */}
            <label className={labelClass}>
              <span>Geburtsdatum *</span>
              <input
                className={inputClass}
                name="birthDate"
                onChange={e => handleFieldChange('birthDate', e.target.value)}
                type="date"
                value={formState.birthDate}
              />
              {errors.birthDate && <span className={errorClass}>{errors.birthDate}</span>}
            </label>

            {/* Geschlecht – hidden when implied by category */}
            {!impliedGender && (
              <label className={labelClass}>
                <span>Geschlecht *</span>
                <select
                  className={inputClass}
                  name="gender"
                  onChange={e => handleFieldChange('gender', e.target.value)}
                  value={formState.gender}
                >
                  <option value="">Bitte wählen…</option>
                  {genderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.gender && <span className={errorClass}>{errors.gender}</span>}
              </label>
            )}

            {/* Wertungsklasse */}
            <label className={labelClass}>
              <span>Wertungsklasse *</span>
              <select
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={sortedSubRaces.length === 0}
                name="startingClass"
                onChange={e => handleFieldChange('startingClass', e.target.value)}
                value={formState.startingClass}
              >
                {sortedSubRaces.length === 0 && (
                  <option value="">Keine Klassen verfügbar</option>
                )}
                {sortedSubRaces.map(subRace => (
                  <option key={subRace.id} value={subRace.id}>
                    {resolveRaceCategoryLabel(subRace.name, raceCategoryLabels)}
                  </option>
                ))}
              </select>
              {errors.startingClass && <span className={errorClass}>{errors.startingClass}</span>}
            </label>

            {/* Verein / Team */}
            <label className={`${labelClass} md:col-span-2`}>
              <span>Verein / Team</span>
              <input
                className={inputClass}
                name="clubTeam"
                onChange={e => handleFieldChange('clubTeam', e.target.value)}
                placeholder="Vereins- oder Teamname (optional)"
                type="text"
                value={formState.clubTeam}
              />
            </label>

            {/* Nationalität */}
            <label className={labelClass}>
              <span>Nationalität *</span>
              <select
                className={inputClass}
                name="nation"
                onChange={e => handleFieldChange('nation', e.target.value)}
                value={formState.nation}
              >
                {NATIONS.map(opt => (
                  <option key={opt.code} value={opt.code}>{opt.label}</option>
                ))}
              </select>
              {errors.nation && <span className={errorClass}>{errors.nation}</span>}
            </label>

            {/* E-Mail */}
            <label className={labelClass}>
              <span>E-Mail *</span>
              <input
                autoComplete="email"
                className={inputClass}
                name="email"
                onChange={e => handleFieldChange('email', e.target.value)}
                placeholder="name@beispiel.de"
                type="email"
                value={formState.email}
              />
              {errors.email && <span className={errorClass}>{errors.email}</span>}
            </label>
          </div>

          {/* Datenschutz */}
          <div className="mt-8 rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <h3 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              Datenschutz & Haftungsausschluss
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Du musst der Datenschutzerklärung zustimmen, bevor du zur Zahlung weitergeleitet wirst.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm text-[var(--text-secondary)]">
              <input
                checked={formState.privacyAccepted}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                name="privacyAccepted"
                onChange={e => handleFieldChange('privacyAccepted', e.target.checked)}
                type="checkbox"
              />
              <span>
                Ich stimme der{' '}
                <Link className="font-semibold underline text-[var(--primary)]" to="/privacy">
                  Datenschutzerklärung
                </Link>{' '}
                zu. *
              </span>
            </label>
            {errors.privacyAccepted && (
              <p className="mt-2 text-sm text-red-600">{errors.privacyAccepted}</p>
            )}
          </div>

          {/* Preis */}
          {activePriceCents !== null ? (
            <div className="mt-5 rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
              Anmeldegebühr:{' '}
              <span className="font-bold text-[var(--primary)]">
                €{(activePriceCents / 100).toFixed(2)}
              </span>
            </div>
          ) : sortedSubRaces.length > 0 ? (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Keine Preiskonfiguration für diese Wertungsklasse. Bitte Veranstalter kontaktieren.
            </div>
          ) : null}

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              disabled={formDisabled}
              type="submit"
            >
              {paymentMutation.isPending ? 'Weiterleitung zur Zahlung…' : 'Weiter zur Zahlung →'}
            </button>
            <Link className="btn-outline w-full justify-center" to="/">
              Abbrechen
            </Link>
          </div>

          {submitError && (
            <p className="mt-4 text-sm text-red-600">{submitError}</p>
          )}

          {sortedSubRaces.length === 0 && (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Anmeldung ist für dieses Rennen aktuell nicht möglich. Bitte später erneut versuchen.
            </p>
          )}
        </form>

        {/* Aside */}
        <aside className="grid gap-4 self-start">
          {/* Race summary */}
          <div className="surface-panel p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
              Veranstaltung
            </p>
            <p className="mt-3 font-heading text-lg font-bold text-[var(--text-primary)]">
              {race.name}
            </p>
            <div className="mt-3 grid gap-1.5 text-sm text-[var(--text-secondary)]">
              <p>{formattedDate}</p>
              {race.location && <p>{race.location}</p>}
            </div>
          </div>

          {/* Available classes */}
          {sortedSubRaces.length > 0 && (
            <div className="surface-panel p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
                Wertungsklassen
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sortedSubRaces.map(subRace => (
                  <span
                    key={subRace.id}
                    className="inline-flex items-center rounded-full border-2 border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-sm font-medium text-[var(--text-secondary)]"
                  >
                    {resolveRaceCategoryLabel(subRace.name, raceCategoryLabels)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Help */}
          <div className="surface-panel p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
              Fragen?
            </p>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Bei Problemen mit der Anmeldung oder fehlenden Wertungsklassen wende dich an die Veranstalter.
            </p>
            <Link
              className="btn-outline mt-4 w-full justify-center text-sm"
              to="/imprint"
            >
              Kontakt / Impressum
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

const Loader = () => (
  <section className="page-shell">
    <div className="surface-panel p-6 sm:p-8">
      <div className="h-6 w-64 animate-pulse rounded-lg bg-green-100" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-green-50" />
        ))}
      </div>
    </div>
  </section>
);

const ErrorSection = () => (
  <section className="page-shell">
    <div className="surface-panel p-8 text-center">
      <h1 className="font-heading text-3xl font-bold text-[var(--text-primary)]">
        Veranstaltung nicht gefunden.
      </h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Die Anmeldung konnte nicht geladen werden. Möglicherweise ist der Link ungültig.
      </p>
      <Link className="btn-primary mt-6 inline-flex" to="/">
        Zurück zur Startseite
      </Link>
    </div>
  </section>
);
