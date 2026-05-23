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

export function RaceRegistrationPage() {
  const { slug } = useParams();
  const [formState, setFormState] =
    useState<RegistrationFormState>(initialFormState);
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const {
    data: race,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['race-registration', slug],
    queryFn: () => fetchRaceCalendarById(slug ?? ''),
    enabled: Boolean(slug),
  });

  const { data: raceCategories = [] } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  const sortedSubRaces = useMemo(() => {
    if (!race?.subRaces) {
      return [];
    }

    return [...race.subRaces]
      .filter(s => s.name !== 'frauen')
      .sort((a, b) => {
        const left = a.sortOrder ?? 999;
        const right = b.sortOrder ?? 999;
        return left - right;
      });
  }, [race]);

  useEffect(() => {
    if (sortedSubRaces.length === 0) {
      setFormState(current => ({ ...current, startingClass: '' }));
      return;
    }

    setFormState(current => {
      if (
        current.startingClass &&
        sortedSubRaces.some(subRace => subRace.id === current.startingClass)
      ) {
        return current;
      }

      return {
        ...current,
        startingClass: sortedSubRaces[0].id,
      };
    });
  }, [sortedSubRaces]);

  const paymentMutation = useMutation({
    mutationFn: createPaymentCheckout,
  });

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

  const activePriceCents = selectedSubRace?.activePriceCents ?? null;

  const formDisabled =
    sortedSubRaces.length === 0 ||
    activePriceCents === null ||
    paymentMutation.isPending;

  const handleFieldChange = (
    field: keyof RegistrationFormState,
    value: string | boolean
  ) => {
    setFormState(current => ({
      ...current,
      [field]: value,
    }));

    setErrors(current => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: undefined,
      };
    });
  };

  const handleSubmit = async (event: React.ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(formState);
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length > 0 || !race) {
      return;
    }

    if (activePriceCents === null) {
      setSubmitError('No price configured for this starting class.');
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
          uciNumber: formState.uciLicenseNumber || undefined,
        },
        successUrl: `${baseUrl}${basePath}/registration-success?raceId=${race.id}`,
        cancelUrl: `${baseUrl}${basePath}/calendar/${race.id}/register?payment=cancelled`,
      });

      window.location.assign(checkoutUrl);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not start checkout.'
      );
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !race) {
    return <ErrorSection />;
  }

  return (
    <section className="page-shell">
      {/* <div className="surface-panel overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,90,54,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,212,255,0.16),transparent_34%),linear-gradient(145deg,rgba(18,25,35,0.96),rgba(11,15,20,0.98))] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <span className="eyebrow">Race registration</span>
        <h1 className="mt-5 max-w-4xl font-heading text-4xl font-semibold leading-[1.06] text-(--text-primary-dark) sm:text-5xl lg:text-6xl">
          {race.name}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-(--text-secondary-dark)">
          {formatRaceType(race.type)} in {race.location} on {formatRaceDate(race.raceDate)}. Complete the rider details below and continue to secure payment.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="filter-chip">{formatRaceDate(race.raceDate)}</span>
          <span className="filter-chip">{race.location}</span>
          <span className="filter-chip">{sortedSubRaces.length} starting classes</span>
        </div>
      </div> */}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.7fr]">
        <form
          className="surface-panel p-6 sm:p-8"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="flex items-center justify-between gap-4 border-b border-(--border-dark) pb-5">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
                Online registration for {race.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-(--text-secondary-dark)">
                Fields marked with * are required.
              </p>
            </div>
            <Link
              className="ghost-button hidden sm:inline-flex"
              to={`/calendar/${race.id}`}
            >
              Back to race
            </Link>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-(--text-secondary-dark)">
              <span>First name *</span>
              <input
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition placeholder:text-(--text-secondary-dark) focus:border-(--accent-secondary)"
                name="firstName"
                onChange={event =>
                  handleFieldChange('firstName', event.target.value)
                }
                placeholder="First name"
                type="text"
                value={formState.firstName}
              />
              {errors.firstName ? (
                <span className="text-sm text-(--accent-cta)">
                  {errors.firstName}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm text-(--text-secondary-dark)">
              <span>Last name *</span>
              <input
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition placeholder:text-(--text-secondary-dark) focus:border-(--accent-secondary)"
                name="lastName"
                onChange={event =>
                  handleFieldChange('lastName', event.target.value)
                }
                placeholder="Last name"
                type="text"
                value={formState.lastName}
              />
              {errors.lastName ? (
                <span className="text-sm text-(--accent-cta)">
                  {errors.lastName}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm text-(--text-secondary-dark)">
              <span>Birth date *</span>
              <input
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                name="birthDate"
                onChange={event =>
                  handleFieldChange('birthDate', event.target.value)
                }
                type="date"
                value={formState.birthDate}
              />
              {errors.birthDate ? (
                <span className="text-sm text-(--accent-cta)">
                  {errors.birthDate}
                </span>
              ) : null}
            </label>

            {!impliedGender && (
              <label className="grid gap-2 text-sm text-(--text-secondary-dark)">
                <span>Gender *</span>
                <select
                  className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                  name="gender"
                  onChange={event =>
                    handleFieldChange('gender', event.target.value)
                  }
                  value={formState.gender}
                >
                  <option value="">Please select...</option>
                  {genderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.gender ? (
                  <span className="text-sm text-(--accent-cta)">
                    {errors.gender}
                  </span>
                ) : null}
              </label>
            )}

            <label className="grid gap-2 text-sm text-(--text-secondary-dark) md:col-span-2">
              <span>Club / Team</span>
              <input
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition placeholder:text-(--text-secondary-dark) focus:border-(--accent-secondary)"
                name="clubTeam"
                onChange={event =>
                  handleFieldChange('clubTeam', event.target.value)
                }
                placeholder="Club or team name"
                type="text"
                value={formState.clubTeam}
              />
            </label>

            <label className="grid gap-2 text-sm text-(--text-secondary-dark)">
              <span>Nation *</span>
              <select
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                name="nation"
                onChange={event =>
                  handleFieldChange('nation', event.target.value)
                }
                value={formState.nation}
              >
                {NATIONS.map(option => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.nation ? (
                <span className="text-sm text-(--accent-cta)">
                  {errors.nation}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm text-(--text-secondary-dark)">
              <span>Starting class *</span>
              <select
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary) disabled:cursor-not-allowed disabled:opacity-50"
                disabled={sortedSubRaces.length === 0}
                name="startingClass"
                onChange={event =>
                  handleFieldChange('startingClass', event.target.value)
                }
                value={formState.startingClass}
              >
                {sortedSubRaces.length === 0 ? (
                  <option value="">No starting classes available</option>
                ) : null}
                {sortedSubRaces.map(subRace => (
                  <option key={subRace.id} value={subRace.id}>
                    {resolveRaceCategoryLabel(subRace.name, raceCategoryLabels)}
                  </option>
                ))}
              </select>
              {errors.startingClass ? (
                <span className="text-sm text-(--accent-cta)">
                  {errors.startingClass}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm text-(--text-secondary-dark) md:col-span-2">
              <span>UCI Number</span>
              <input
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition placeholder:text-(--text-secondary-dark) focus:border-(--accent-secondary)"
                name="uciLicenseNumber"
                onChange={event =>
                  handleFieldChange('uciLicenseNumber', event.target.value)
                }
                placeholder="Optional"
                type="text"
                value={formState.uciLicenseNumber}
              />
            </label>

            <label className="grid gap-2 text-sm text-(--text-secondary-dark) md:col-span-2">
              <span>Email *</span>
              <input
                autoComplete="email"
                className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition placeholder:text-(--text-secondary-dark) focus:border-(--accent-secondary)"
                name="email"
                onChange={event =>
                  handleFieldChange('email', event.target.value)
                }
                placeholder="name@example.com"
                type="email"
                value={formState.email}
              />
              {errors.email ? (
                <span className="text-sm text-(--accent-cta)">
                  {errors.email}
                </span>
              ) : null}
            </label>
          </div>

          <div className="mt-8 rounded-3xl border border-(--border-dark) bg-(--surface-soft) p-5">
            <h3 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Privacy Policy & Disclaimer
            </h3>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary-dark)">
              You must accept the privacy policy before continuing to the Stripe
              payment page.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-(--text-secondary-dark)">
              <input
                checked={formState.privacyAccepted}
                className="mt-1 h-4 w-4 rounded border border-(--border-dark) bg-(--surface-soft)"
                name="privacyAccepted"
                onChange={event =>
                  handleFieldChange('privacyAccepted', event.target.checked)
                }
                type="checkbox"
              />
              <span>
                I agree to the{' '}
                <Link
                  className="text-(--accent-secondary) underline decoration-transparent transition hover:decoration-current"
                  rel="noreferrer"
                  target="_blank"
                  to="/privacy"
                >
                  privacy policy
                </Link>
                . *
              </span>
            </label>
            {errors.privacyAccepted ? (
              <p className="mt-2 text-sm text-(--accent-cta)">
                {errors.privacyAccepted}
              </p>
            ) : null}
          </div>

          {activePriceCents !== null ? (
            <div className="mt-6 rounded-2xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-sm text-(--text-secondary-dark)">
              Registration fee:{' '}
              <span className="font-semibold text-(--text-primary-dark)">
                €{(activePriceCents / 100).toFixed(2)}
              </span>
            </div>
          ) : sortedSubRaces.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              No price configured for this starting class. Contact the
              organizers.
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="cta-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              disabled={formDisabled}
              type="submit"
            >
              {paymentMutation.isPending
                ? 'Redirecting to checkout...'
                : 'Continue to payment'}
            </button>
            <Link
              className="ghost-button w-full justify-center"
              to={`/calendar/${race.id}`}
            >
              Cancel
            </Link>
          </div>

          {submitError ? (
            <p className="mt-4 text-sm leading-6 text-(--accent-cta)">
              {submitError}
            </p>
          ) : null}

          {sortedSubRaces.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-(--text-secondary-dark)">
              Registration is currently unavailable for this race. Check back
              later or contact the organizers directly.
            </p>
          ) : null}
        </form>

        <aside className="grid gap-4 self-start">
          <div className="surface-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--accent-secondary)">
              Available classes
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {sortedSubRaces.length > 0 ? (
                sortedSubRaces.map(subRace => (
                  <span key={subRace.id} className="filter-chip">
                    {resolveRaceCategoryLabel(subRace.name, raceCategoryLabels)}
                  </span>
                ))
              ) : (
                <p className="text-sm text-(--text-secondary-dark)">
                  No starting classes are configured yet.
                </p>
              )}
            </div>
          </div>

          <div className="surface-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--accent-secondary)">
              Need help?
            </p>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary-dark)">
              If your class is missing or the payment link is not available, use
              the organizer contact page instead.
            </p>
            <Link
              className="ghost-button mt-5 w-full justify-center"
              to="/contact"
            >
              Contact organizers
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
      <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-11 w-full max-w-3xl animate-pulse rounded bg-white/10" />
      <div className="mt-5 h-5 w-full max-w-2xl animate-pulse rounded bg-white/8" />
    </div>
    <div className="surface-panel p-6 sm:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-3xl bg-white/6"
          />
        ))}
      </div>
    </div>
  </section>
);

const ErrorSection = () => (
  <section className="page-shell">
    <div className="surface-panel p-8 text-center sm:p-10">
      <span className="eyebrow">Registration</span>
      <h1 className="mt-5 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
        Race not found.
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-(--text-secondary-dark)">
        We could not load this registration form. The race may be unpublished or
        the link is incorrect.
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
