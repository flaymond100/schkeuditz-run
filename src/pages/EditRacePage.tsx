import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchRaceCategories } from '../lib/raceCategories';
import { fetchRaceCalendarById } from '../lib/raceCalendar';
import { supabase } from '../lib/supabase';

type RaceCategoryInput = {
  clientId: string;
  id?: string;
  raceCategoryId: string;
  amountEur: string;
};

type EditRaceFormState = {
  name: string;
  raceDate: string;
  type: string;
  location: string;
  description: string;
  externalRegistrationUrl: string;
  externalResultsUrl: string;
  internalRegistration: boolean;
};

type EditRaceFormErrors = Partial<Record<keyof EditRaceFormState, string>> & {
  categories?: string;
};

const initialFormState: EditRaceFormState = {
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

function validateForm(formState: EditRaceFormState): EditRaceFormErrors {
  const errors: EditRaceFormErrors = {};

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

  return errors;
}

function mapSupabaseError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Could not update race. Check your Supabase RLS policies and permissions.';
}

export function EditRacePage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formState, setFormState] =
    useState<EditRaceFormState>(initialFormState);
  const [categories, setCategories] = useState<RaceCategoryInput[]>([]);
  const [originalCategoryIds, setOriginalCategoryIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<EditRaceFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: race,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['race-edit', raceId],
    queryFn: () => fetchRaceCalendarById(raceId ?? ''),
    enabled: Boolean(raceId),
  });

  const {
    data: raceCategoryOptions = [],
    isLoading: isRaceCategoriesLoading,
    isError: isRaceCategoriesError,
  } = useQuery({
    queryKey: ['race-categories'],
    queryFn: fetchRaceCategories,
  });

  useEffect(() => {
    if (!race) {
      return;
    }

    setFormState({
      name: race.name,
      raceDate: race.raceDate,
      type: race.type,
      location: race.location,
      description: race.description ?? '',
      externalRegistrationUrl: race.externalRegistrationUrl ?? '',
      externalResultsUrl: race.externalResultsUrl ?? '',
      internalRegistration: race.internalRegistration,
    });

    const sortedCategories = [...(race.subRaces ?? [])].sort((a, b) => {
      const left = a.sortOrder ?? 999;
      const right = b.sortOrder ?? 999;
      return left - right;
    });

    const initialCategories: RaceCategoryInput[] = sortedCategories.map(category => ({
      clientId: crypto.randomUUID(),
      id: category.id,
      raceCategoryId: category.name,
      amountEur: category.activePriceCents !== null
        ? (category.activePriceCents / 100).toFixed(2)
        : '',
    }));

    setCategories(
      initialCategories.length > 0
        ? initialCategories
        : [{ clientId: crypto.randomUUID(), raceCategoryId: '', amountEur: '' }]
    );
    setOriginalCategoryIds(sortedCategories.map(category => category.id));
  }, [race]);

  const raceCategoryIds = useMemo(
    () => new Set(raceCategoryOptions.map(option => option.id)),
    [raceCategoryOptions]
  );

  const categoriesForPersistence = useMemo(
    () =>
      categories.filter(category => {
        if (category.id) {
          return Boolean(category.raceCategoryId.trim());
        }

        return raceCategoryIds.has(category.raceCategoryId);
      }),
    [categories, raceCategoryIds]
  );

  const canSyncCategories = !isRaceCategoriesLoading && !isRaceCategoriesError;

  const raceCategoryOptionsWithCurrent = useMemo(() => {
    const missingCategoryIds = categories
      .map(category => category.raceCategoryId)
      .filter(categoryId => categoryId && !raceCategoryIds.has(categoryId));

    if (missingCategoryIds.length === 0) {
      return raceCategoryOptions;
    }

    const fallbackOptions = missingCategoryIds.map(categoryId => ({
      id: categoryId,
      label: `Current (${categoryId})`,
    }));

    return [...raceCategoryOptions, ...fallbackOptions];
  }, [categories, raceCategoryIds, raceCategoryOptions]);

  const updateRaceMutation = useMutation({
    mutationFn: async () => {
      if (!raceId) {
        throw new Error('Missing race ID.');
      }

      const { error: updateRaceError } = await supabase
        .from('race_calendar')
        .update({
          name: formState.name.trim(),
          race_date: formState.raceDate,
          type: formState.type.trim(),
          location: formState.location.trim(),
          description: formState.description.trim() || null,
          external_registration_url:
            formState.externalRegistrationUrl.trim() || null,
          external_results_url: formState.externalResultsUrl.trim() || null,
          internal_registration: formState.internalRegistration,
        })
        .eq('id', raceId);

      if (updateRaceError) {
        throw updateRaceError;
      }

      if (!canSyncCategories) {
        return;
      }

      const keptExistingIds = categoriesForPersistence
        .filter(category => category.id)
        .map(category => category.id as string);

      const removedIds = originalCategoryIds.filter(
        categoryId => !keptExistingIds.includes(categoryId)
      );

      if (removedIds.length > 0) {
        const { error: usageError } = await supabase
          .from('race_entries')
          .select('id')
          .in('sub_race_id', removedIds)
          .limit(1);

        if (usageError) {
          throw usageError;
        }

        // if ((usedEntries ?? []).length > 0) {
        //   throw new Error(
        //     'Cannot remove category that already has race entries. Remove entries first.'
        //   );
        // }

        const { error: deleteCategoryError } = await supabase
          .from('race_sub_races')
          .delete()
          .in('id', removedIds);

        if (deleteCategoryError) {
          throw deleteCategoryError;
        }
      }

      if (categoriesForPersistence.length === 0) {
        return;
      }

      const categoryRows = categoriesForPersistence.map((category, index) => ({
        id: category.id,
        race_calendar_id: raceId,
        name: category.raceCategoryId,
        sort_order: index + 1,
      }));

      const existingCategoryRows = categoryRows.filter(
        category => Boolean(category.id)
      ) as Array<{
        id: string;
        race_calendar_id: string;
        name: string;
        sort_order: number;
      }>;

      const newCategoryRows = categoryRows
        .filter(category => !category.id)
        .map(({ race_calendar_id, name, sort_order }) => ({
          race_calendar_id,
          name,
          sort_order,
        }));

      if (existingCategoryRows.length > 0) {
        const { error: upsertCategoriesError } = await supabase
          .from('race_sub_races')
          .upsert(existingCategoryRows, { onConflict: 'id' });

        if (upsertCategoriesError) {
          throw upsertCategoriesError;
        }
      }

      if (newCategoryRows.length > 0) {
        const { error: insertCategoriesError } = await supabase
          .from('race_sub_races')
          .insert(newCategoryRows);

        if (insertCategoriesError) {
          throw insertCategoriesError;
        }
      }

      // Re-fetch all sub-race IDs for this race to sync prices
      const { data: allSubRaces, error: subRaceFetchError } = await supabase
        .from('race_sub_races')
        .select('id, name')
        .eq('race_calendar_id', raceId);

      if (subRaceFetchError) throw subRaceFetchError;

      const subRaceIds = (allSubRaces ?? []).map(s => s.id as string);

      if (subRaceIds.length > 0) {
        await supabase.from('race_sub_race_prices').delete().in('sub_race_id', subRaceIds);

        const priceRows = (allSubRaces ?? []).flatMap(subRace => {
          const input = categoriesForPersistence.find(c => c.id === subRace.id || c.raceCategoryId === subRace.name);
          const cents = Math.round(parseFloat(input?.amountEur ?? '') * 100);
          if (!input?.amountEur?.trim() || !Number.isFinite(cents) || cents < 1) return [];
          return [{ sub_race_id: subRace.id, label: 'Standard', amount_cents: cents, valid_from: new Date().toISOString() }];
        });

        if (priceRows.length > 0) {
          const { error: pricesError } = await supabase.from('race_sub_race_prices').insert(priceRows);
          if (pricesError) throw pricesError;
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['race-calendar'] });
      await queryClient.invalidateQueries({ queryKey: ['race-registration'] });
      toast.success('Race updated');
      navigate('/');
    },
  });

  function setField<K extends keyof EditRaceFormState>(
    field: K,
    value: EditRaceFormState[K]
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

  function updateCategory(clientId: string, value: string) {
    setCategories(current =>
      current.map(category =>
        category.clientId === clientId
          ? { ...category, raceCategoryId: value }
          : category
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
      { clientId: crypto.randomUUID(), raceCategoryId: '', amountEur: '' },
    ]);
  }

  function removeCategory(clientId: string) {
    setCategories(current => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(category => category.clientId !== clientId);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validateForm(formState);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await updateRaceMutation.mutateAsync();
    } catch (error) {
      setSubmitError(mapSupabaseError(error));
    }
  }

  if (isLoading) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-6 text-(--text-secondary-dark) sm:p-8">
          Loading race...
        </div>
      </section>
    );
  }

  if (isError || !race) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-8 text-center sm:p-10">
          <span className="eyebrow">Race editor</span>
          <h1 className="mt-5 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
            Race not found
          </h1>
          <div className="mt-6 flex justify-center">
            <Link className="cta-button" to="/calendar">
              Back to calendar
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="surface-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="mt-4 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
              Modify Race
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-(--text-secondary-dark)">
              Update race details and categories.
            </p>
          </div>
          <Link className="ghost-button" to={`/calendar/${race.id}`}>
            Back to details
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
              <div key={category.clientId} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-sm text-(--text-secondary-dark)">
                  {index + 1}.
                </span>
                <select
                  className="w-full rounded-xl border border-(--border-dark) bg-(--surface-soft) px-4 py-2.5 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                  disabled={isRaceCategoriesLoading || isRaceCategoriesError}
                  onChange={event =>
                    updateCategory(category.clientId, event.target.value)
                  }
                  value={category.raceCategoryId}
                >
                  <option value="">
                    {isRaceCategoriesLoading
                      ? 'Loading categories...'
                      : 'Select category'}
                  </option>
                  {raceCategoryOptionsWithCurrent.map(option => (
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
                          c.clientId === category.clientId ? { ...c, amountEur: event.target.value } : c
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
                  onClick={() => removeCategory(category.clientId)}
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
            disabled={updateRaceMutation.isPending}
            type="submit"
          >
            {updateRaceMutation.isPending
              ? 'Saving changes...'
              : 'Save changes'}
          </button>
          <Link
            className="ghost-button justify-center"
            to={`/calendar/${race.id}`}
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
