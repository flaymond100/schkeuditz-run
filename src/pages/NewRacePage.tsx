import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchRaceCategories } from '../lib/raceCategories';
import { supabase } from '../lib/supabase';

type RaceCategoryInput = {
  id: string;
  raceCategoryId: string;
  amountEur: string;
};

type NewRaceFormState = {
  name: string;
  raceDate: string;
  type: string;
  location: string;
  description: string;
  externalRegistrationUrl: string;
  externalResultsUrl: string;
  internalRegistration: boolean;
};

type NewRaceFormErrors = Partial<Record<keyof NewRaceFormState, string>> & {
  categories?: string;
};

const initialFormState: NewRaceFormState = {
  name: '',
  raceDate: '',
  type: 'criterium',
  location: '',
  description: '',
  externalRegistrationUrl: '',
  externalResultsUrl: '',
  internalRegistration: false,
};

function validateUrl(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateForm(
  formState: NewRaceFormState,
  categories: RaceCategoryInput[],
  raceCategoryIds: Set<string>
): NewRaceFormErrors {
  const errors: NewRaceFormErrors = {};

  if (!formState.name.trim()) {
    errors.name = 'Race name is required.';
  }

  if (!formState.raceDate) {
    errors.raceDate = 'Race date is required.';
  }

  if (!formState.type.trim()) {
    errors.type = 'Race type is required.';
  }

  if (!formState.location.trim()) {
    errors.location = 'Race location is required.';
  }

  if (!validateUrl(formState.externalRegistrationUrl)) {
    errors.externalRegistrationUrl =
      'Registration URL must be a valid http(s) URL.';
  }

  if (!validateUrl(formState.externalResultsUrl)) {
    errors.externalResultsUrl = 'Results URL must be a valid http(s) URL.';
  }

  const validCategoryCount = categories.filter(category =>
    raceCategoryIds.has(category.raceCategoryId)
  ).length;

  if (validCategoryCount === 0) {
    errors.categories = 'Add at least one category.';
  }

  return errors;
}

function mapSupabaseError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Could not create race. Check your Supabase RLS policies and permissions.';
}

export function NewRacePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formState, setFormState] =
    useState<NewRaceFormState>(initialFormState);
  const [categories, setCategories] = useState<RaceCategoryInput[]>([
    { id: crypto.randomUUID(), raceCategoryId: '', amountEur: '' },
  ]);
  const [errors, setErrors] = useState<NewRaceFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: raceCategoryOptions = [],
    isLoading: isRaceCategoriesLoading,
    isError: isRaceCategoriesError,
  } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  const raceCategoryIds = useMemo(
    () => new Set(raceCategoryOptions.map(option => option.id)),
    [raceCategoryOptions]
  );

  const cleanedCategories = useMemo(
    () =>
      categories
        .map(category => category.raceCategoryId)
        .filter(categoryId => raceCategoryIds.has(categoryId))
        .map((categoryId, index) => ({
          name: categoryId,
          sort_order: index + 1,
        })),
    [categories, raceCategoryIds]
  );

  const createRaceMutation = useMutation({
    mutationFn: async () => {
      const { data: insertedRace, error: raceError } = await supabase
        .from('race_calendar')
        .insert({
          name: formState.name.trim(),
          race_date: formState.raceDate,
          type: formState.type.trim(),
          location: formState.location.trim(),
          description: formState.description.trim() || null,
          external_registration_url:
            formState.externalRegistrationUrl.trim() || null,
          external_results_url: formState.externalResultsUrl.trim() || null,
          internal_registration: formState.internalRegistration,
          site: import.meta.env.VITE_SITE_KEY as string,
        })
        .select('id')
        .single();

      if (raceError) {
        throw raceError;
      }

      const raceId = insertedRace.id as string;

      if (cleanedCategories.length > 0) {
        const { data: insertedSubRaces, error: categoriesError } = await supabase
          .from('race_sub_races')
          .insert(
            cleanedCategories.map(category => ({
              race_calendar_id: raceId,
              name: category.name,
              sort_order: category.sort_order,
            }))
          )
          .select('id, name');

        if (categoriesError) {
          throw categoriesError;
        }

        const priceRows = (insertedSubRaces ?? []).flatMap(subRace => {
          const input = categories.find(c => c.raceCategoryId === subRace.name);
          const cents = Math.round(parseFloat(input?.amountEur ?? '') * 100);
          if (!input?.amountEur.trim() || !Number.isFinite(cents) || cents < 1) {
            return [];
          }
          return [{ sub_race_id: subRace.id, label: 'Standard', amount_cents: cents, valid_from: new Date().toISOString() }];
        });

        if (priceRows.length > 0) {
          const { error: pricesError } = await supabase
            .from('race_sub_race_prices')
            .insert(priceRows);
          if (pricesError) throw pricesError;
        }
      }

      return raceId;
    },
    onSuccess: async raceId => {
      await queryClient.invalidateQueries({ queryKey: ['race-calendar'] });
      toast.success('Race created');
      navigate(`/calendar/${raceId}`);
    },
  });

  function setField<K extends keyof NewRaceFormState>(
    field: K,
    value: NewRaceFormState[K]
  ) {
    setFormState(current => ({
      ...current,
      [field]: value,
    }));

    setErrors(current => ({
      ...current,
      [field]: undefined,
    }));
  }

  function updateCategory(id: string, value: string) {
    setCategories(current =>
      current.map(category =>
        category.id === id ? { ...category, raceCategoryId: value } : category
      )
    );

    setErrors(current => ({
      ...current,
      categories: undefined,
    }));
  }

  function addCategory() {
    setCategories(current => [
      ...current,
      { id: crypto.randomUUID(), raceCategoryId: '', amountEur: '' },
    ]);
  }

  function removeCategory(id: string) {
    setCategories(current => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(category => category.id !== id);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validateForm(formState, categories, raceCategoryIds);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await createRaceMutation.mutateAsync();
    } catch (error) {
      setSubmitError(mapSupabaseError(error));
    }
  }

  return (
    <section className="page-shell">
      <div className="surface-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="mt-4 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
              Create New Race
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-(--text-secondary-dark)">
              This form writes to public.race_calendar and public.race_sub_races
              (categories).
            </p>
          </div>
          <Link className="ghost-button" to="/calendar">
            Back to calendar
          </Link>
        </div>
      </div>

      <form
        className="surface-panel space-y-6 p-6 sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-(--text-secondary-dark)">
            Race name *
            <input
              className="mt-2 w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={event => setField('name', event.target.value)}
              required
              type="text"
              value={formState.name}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-rose-300">{errors.name}</p>
            ) : null}
          </label>

          <label className="block text-sm text-(--text-secondary-dark)">
            Race date *
            <input
              className="mt-2 w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={event => setField('raceDate', event.target.value)}
              required
              type="date"
              value={formState.raceDate}
            />
            {errors.raceDate ? (
              <p className="mt-1 text-xs text-rose-300">{errors.raceDate}</p>
            ) : null}
          </label>

          <label className="block text-sm text-(--text-secondary-dark)">
            Type *
            <input
              className="mt-2 w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={event => setField('type', event.target.value)}
              required
              type="text"
              value={formState.type}
            />
            {errors.type ? (
              <p className="mt-1 text-xs text-rose-300">{errors.type}</p>
            ) : null}
          </label>

          <label className="block text-sm text-(--text-secondary-dark)">
            Location *
            <input
              className="mt-2 w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={event => setField('location', event.target.value)}
              required
              type="text"
              value={formState.location}
            />
            {errors.location ? (
              <p className="mt-1 text-xs text-rose-300">{errors.location}</p>
            ) : null}
          </label>

          <label className="block text-sm text-(--text-secondary-dark) md:col-span-2">
            Description
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={event => setField('description', event.target.value)}
              value={formState.description}
            />
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-sm text-(--text-secondary-dark) md:col-span-2">
            <input
              checked={formState.internalRegistration}
              className="h-4 w-4 rounded"
              onChange={event => setField('internalRegistration', event.target.checked)}
              type="checkbox"
            />
            Use internal registration (Stripe) — uncheck to use external URL
          </label>

          <label className="block text-sm text-(--text-secondary-dark)">
            External registration URL
            <input
              className="mt-2 w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={event =>
                setField('externalRegistrationUrl', event.target.value)
              }
              placeholder="https://..."
              type="url"
              value={formState.externalRegistrationUrl}
            />
            {errors.externalRegistrationUrl ? (
              <p className="mt-1 text-xs text-rose-300">
                {errors.externalRegistrationUrl}
              </p>
            ) : null}
          </label>

          <label className="block text-sm text-(--text-secondary-dark)">
            External results URL
            <input
              className="mt-2 w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
              onChange={event =>
                setField('externalResultsUrl', event.target.value)
              }
              placeholder="https://..."
              type="url"
              value={formState.externalResultsUrl}
            />
            {errors.externalResultsUrl ? (
              <p className="mt-1 text-xs text-rose-300">
                {errors.externalResultsUrl}
              </p>
            ) : null}
          </label>
        </div>

        <section className="space-y-3 rounded-2xl border border-(--border-dark) bg-(--surface-soft) p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-semibold text-(--text-primary-dark)">
              Categories (race_sub_races)
            </h2>
            <button
              className="ghost-button px-4 py-2"
              onClick={addCategory}
              type="button"
            >
              Add category
            </button>
          </div>

          <div className="space-y-3">
            {categories.map((category, index) => (
              <div key={category.id} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-sm text-(--text-secondary-dark)">
                  {index + 1}.
                </span>
                <select
                  className="w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-2.5 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                  disabled={isRaceCategoriesLoading || isRaceCategoriesError}
                  onChange={event =>
                    updateCategory(category.id, event.target.value)
                  }
                  value={category.raceCategoryId}
                >
                  <option value="">
                    {isRaceCategoriesLoading
                      ? 'Loading categories...'
                      : 'Select category'}
                  </option>
                  {raceCategoryOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="relative w-32 shrink-0">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--text-secondary-dark)">€</span>
                  <input
                    className="w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) py-2.5 pl-7 pr-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                    min="0"
                    onChange={event =>
                      setCategories(current =>
                        current.map(c =>
                          c.id === category.id ? { ...c, amountEur: event.target.value } : c
                        )
                      )
                    }
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={category.amountEur}
                  />
                </div>
                <button
                  className="ghost-button px-3 py-2"
                  disabled={categories.length === 1}
                  onClick={() => removeCategory(category.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {errors.categories ? (
            <p className="text-xs text-rose-300">{errors.categories}</p>
          ) : null}
          {isRaceCategoriesError ? (
            <p className="text-xs text-rose-300">Could not load categories.</p>
          ) : null}
        </section>

        {submitError ? (
          <p className="rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="cta-button justify-center"
            disabled={createRaceMutation.isPending}
            type="submit"
          >
            {createRaceMutation.isPending ? 'Creating race...' : 'Create race'}
          </button>
          <Link className="ghost-button justify-center" to="/calendar">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
