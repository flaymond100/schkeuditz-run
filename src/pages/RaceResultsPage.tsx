import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  createRaceCategoryLabelMap,
  fetchRaceCategories,
  resolveRaceCategoryLabel,
} from '../lib/raceCategories';
import { fetchRaceCalendarById } from '../lib/raceCalendar';
import { findOrCreateParticipant } from '../lib/participants';
import { supabase } from '../lib/supabase';

type XlsxRow = {
  position?: number | string;
  firstName?: string;
  lastName?: string;
  team?: string;
  time?: string;
};

type EntryEdit = {
  position: string;
  timeText: string;
  status: string;
};

type NewEntryDraft = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  teamName: string;
  nationality: string;
  position: string;
  timeText: string;
  status: string;
};

const emptyDraft: NewEntryDraft = {
  fullName: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  teamName: '',
  nationality: '',
  position: '',
  timeText: '',
  status: 'finished',
};

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: 'finished', label: 'Finished' },
  { value: 'dns', label: 'DNS' },
  { value: 'dnf', label: 'DNF' },
  { value: 'dsq', label: 'DSQ' },
];

export function RaceResultsPage() {
  const { raceId } = useParams();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, EntryEdit>>({});
  const [drafts, setDrafts] = useState<Record<string, NewEntryDraft | null>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: race, isLoading } = useQuery({
    queryKey: ['race-results', raceId],
    queryFn: () => fetchRaceCalendarById(raceId ?? ''),
    enabled: Boolean(raceId),
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
    return [...race.subRaces].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [race]);

  // Initialize edits from existing entries when race loads
  useEffect(() => {
    if (!race) return;
    const initial: Record<string, EntryEdit> = {};
    for (const subRace of race.subRaces ?? []) {
      for (const entry of subRace.entries ?? []) {
        initial[entry.id] = {
          position: entry.position?.toString() ?? '',
          timeText: entry.timeText ?? '',
          status: entry.status ?? '',
        };
      }
    }
    setEdits(initial);
  }, [race]);

  const updateEdit = (entryId: string, field: keyof EntryEdit, value: string) => {
    setEdits(curr => ({
      ...curr,
      [entryId]: { ...curr[entryId], [field]: value },
    }));
  };

  const updateDraft = (subRaceId: string, field: keyof NewEntryDraft, value: string) => {
    setDrafts(curr => ({
      ...curr,
      [subRaceId]: { ...(curr[subRaceId] ?? emptyDraft), [field]: value },
    }));
  };

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      if (!race) throw new Error('Race not loaded');

      // Update existing entries
      for (const [entryId, edit] of Object.entries(edits)) {
        const positionNum = edit.position.trim() ? Number(edit.position) : null;
        const { error } = await supabase
          .from('race_entries')
          .update({
            position: Number.isFinite(positionNum) ? positionNum : null,
            time_text: edit.timeText.trim() || null,
            status: edit.status || null,
          })
          .eq('id', entryId);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['race-results', raceId] });
      await queryClient.invalidateQueries({ queryKey: ['race-calendar'] });
      toast.success('Results saved');
    },
  });

  const uploadResultsMutation = useMutation({
    mutationFn: async ({ subRaceId, rows }: { subRaceId: string; rows: XlsxRow[] }) => {
      // Wipe any previous upload for this sub-race
      const { error: deleteError } = await supabase
        .from('race_entries')
        .delete()
        .eq('sub_race_id', subRaceId)
        .eq('from_results_upload', true);
      if (deleteError) throw deleteError;

      // Process each row: find/create participant, then insert entry
      for (const row of rows) {
        const firstName = String(row.firstName ?? '').trim();
        const lastName = String(row.lastName ?? '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) continue;

        const participant = await findOrCreateParticipant({
          fullName,
          teamName: row.team ? String(row.team).trim() : undefined,
        });

        const rawPosition = row.position;
        const positionNum =
          typeof rawPosition === 'number'
            ? rawPosition
            : rawPosition && String(rawPosition).trim()
              ? Number(String(rawPosition).trim())
              : null;

        const { error: insertError } = await supabase.from('race_entries').insert({
          sub_race_id: subRaceId,
          participant_id: participant.id,
          is_paid: false,
          from_results_upload: true,
          position: Number.isFinite(positionNum) ? positionNum : null,
          time_text: row.time ? String(row.time).trim() || null : null,
          status: 'finished',
        });
        if (insertError) throw insertError;
      }
      return { subRaceId, count: rows.length };
    },
    onSuccess: async ({ count }) => {
      await queryClient.invalidateQueries({ queryKey: ['race-results', raceId] });
      await queryClient.invalidateQueries({ queryKey: ['race-calendar'] });
      toast.success(`${count} ${count === 1 ? 'rider' : 'riders'} imported`);
    },
  });

  const handleFileUpload = async (subRaceId: string, file: File) => {
    setSubmitError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('Empty xlsx file');
      const rows = XLSX.utils.sheet_to_json<XlsxRow>(sheet);
      if (rows.length === 0) throw new Error('No rows found in the file');
      const required = ['firstName', 'lastName'];
      const missingHeaders = required.filter(k => !(k in rows[0]));
      if (missingHeaders.length > 0) {
        throw new Error(
          `Missing required columns: ${missingHeaders.join(', ')}. Expected: position, firstName, lastName, team, time.`
        );
      }
      await uploadResultsMutation.mutateAsync({ subRaceId, rows });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not upload file.');
    }
  };

  const addEntryMutation = useMutation({
    mutationFn: async (subRaceId: string) => {
      const draft = drafts[subRaceId];
      if (!draft || !draft.fullName.trim()) {
        throw new Error('Full name is required');
      }

      const participant = await findOrCreateParticipant({
        fullName: draft.fullName,
        email: draft.email,
        dateOfBirth: draft.dateOfBirth,
        gender: draft.gender,
        teamName: draft.teamName,
        nationality: draft.nationality,
      });

      const positionNum = draft.position.trim() ? Number(draft.position) : null;

      const { error } = await supabase.from('race_entries').insert({
        sub_race_id: subRaceId,
        participant_id: participant.id,
        is_paid: false,
        position: Number.isFinite(positionNum) ? positionNum : null,
        time_text: draft.timeText.trim() || null,
        status: draft.status || null,
      });

      if (error) throw error;
      return subRaceId;
    },
    onSuccess: async subRaceId => {
      setDrafts(curr => ({ ...curr, [subRaceId]: null }));
      await queryClient.invalidateQueries({ queryKey: ['race-results', raceId] });
      await queryClient.invalidateQueries({ queryKey: ['race-calendar'] });
      toast.success('Participant added');
    },
  });

  const handleSaveAll = async () => {
    setSubmitError(null);
    try {
      await saveAllMutation.mutateAsync();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save changes.');
    }
  };

  const handleAddEntry = async (subRaceId: string) => {
    setSubmitError(null);
    try {
      await addEntryMutation.mutateAsync(subRaceId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not add participant.');
    }
  };

  if (isLoading) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-6 sm:p-8 text-(--text-secondary-dark)">Loading race…</div>
      </section>
    );
  }

  if (!race) {
    return (
      <section className="page-shell">
        <div className="surface-panel p-8 text-center sm:p-10">
          <h1 className="font-heading text-3xl font-semibold text-(--text-primary-dark)">Race not found</h1>
          <Link className="cta-button mt-6 inline-flex" to="/calendar">
            Back to calendar
          </Link>
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
            <h1 className="mt-3 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
              Results — {race.name}
            </h1>
            <p className="mt-2 text-sm text-(--text-secondary-dark)">
              Edit positions and add participants who registered outside the platform.
            </p>
          </div>
          <Link className="ghost-button" to={`/calendar/${race.id}`}>
            Back to race
          </Link>
        </div>
      </div>

      {sortedSubRaces.length === 0 ? (
        <div className="surface-panel p-6 sm:p-8 text-(--text-secondary-dark)">
          No starting classes configured for this race.
        </div>
      ) : null}

      {sortedSubRaces.map(subRace => {
        const draft = drafts[subRace.id];
        const isAddingHere = addEntryMutation.isPending && addEntryMutation.variables === subRace.id;

        return (
          <div key={subRace.id} className="surface-panel p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-dark) pb-4">
              <h2 className="font-heading text-2xl font-semibold text-(--text-primary-dark)">
                {resolveRaceCategoryLabel(subRace.name, raceCategoryLabels)}
              </h2>
              <span className="text-sm text-(--text-secondary-dark)">
                {(subRace.entries ?? []).length} entries
              </span>
            </div>

            {(subRace.entries ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-(--text-secondary-dark)">No entries yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-(--border-dark) text-(--text-secondary-dark)">
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Pos</th>
                      <th className="px-2 py-2 font-medium">Time</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subRace.entries ?? []).map(entry => {
                      const edit = edits[entry.id] ?? { position: '', timeText: '', status: '' };
                      return (
                        <tr key={entry.id} className="border-b border-(--border-dark)/50 last:border-0">
                          <td className="px-2 py-2 text-(--text-primary-dark)">
                            {entry.participant?.fullName ?? '—'}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className="w-16 rounded-lg border border-(--border-dark) bg-(--surface-soft) px-2 py-1.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                              onChange={e => updateEdit(entry.id, 'position', e.target.value)}
                              type="number"
                              value={edit.position}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className="w-28 rounded-lg border border-(--border-dark) bg-(--surface-soft) px-2 py-1.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                              onChange={e => updateEdit(entry.id, 'timeText', e.target.value)}
                              placeholder="00:42:13"
                              value={edit.timeText}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              className="rounded-lg border border-(--border-dark) bg-(--surface-soft) px-2 py-1.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                              onChange={e => updateEdit(entry.id, 'status', e.target.value)}
                              value={edit.status}
                            >
                              {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {!draft ? (
                <>
                  <button
                    className="ghost-button"
                    onClick={() => setDrafts(curr => ({ ...curr, [subRace.id]: emptyDraft }))}
                    type="button"
                  >
                    + Add participant manually
                  </button>
                  <label className="ghost-button cursor-pointer">
                    {uploadResultsMutation.isPending && uploadResultsMutation.variables?.subRaceId === subRace.id
                      ? 'Uploading…'
                      : 'Upload XLSX results'}
                    <input
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(subRace.id, file);
                        e.target.value = '';
                      }}
                      type="file"
                    />
                  </label>
                  <span className="self-center text-xs text-(--text-secondary-dark)">
                    {(subRace.entries ?? []).filter(e => e.fromResultsUpload).length} uploaded
                  </span>
                </>
              ) : (
                <div className="rounded-2xl border border-(--border-dark) bg-(--surface-soft) p-4 sm:p-5">
                  <h3 className="font-heading text-lg font-semibold text-(--text-primary-dark)">
                    New participant
                  </h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'fullName', e.target.value)}
                      placeholder="Full name *"
                      value={draft.fullName}
                    />
                    <input
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'email', e.target.value)}
                      placeholder="Email"
                      type="email"
                      value={draft.email}
                    />
                    <input
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'dateOfBirth', e.target.value)}
                      placeholder="Date of birth"
                      type="date"
                      value={draft.dateOfBirth}
                    />
                    <select
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'gender', e.target.value)}
                      value={draft.gender}
                    >
                      <option value="">Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'teamName', e.target.value)}
                      placeholder="Team / Club"
                      value={draft.teamName}
                    />
                    <input
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'nationality', e.target.value)}
                      placeholder="Nation"
                      value={draft.nationality}
                    />
                  </div>

                  <h4 className="mt-5 text-sm font-semibold uppercase tracking-wider text-(--text-secondary-dark)">
                    Result
                  </h4>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <input
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'position', e.target.value)}
                      placeholder="Position"
                      type="number"
                      value={draft.position}
                    />
                    <input
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'timeText', e.target.value)}
                      placeholder="Time (00:42:13)"
                      value={draft.timeText}
                    />
                    <select
                      className="rounded-xl border border-(--border-dark) bg-(--surface-soft) px-3 py-2.5 text-(--text-primary-dark) outline-none focus:border-(--accent-secondary)"
                      onChange={e => updateDraft(subRace.id, 'status', e.target.value)}
                      value={draft.status}
                    >
                      {statusOptions.filter(o => o.value).map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      className="cta-button px-5 py-2 disabled:opacity-50"
                      disabled={isAddingHere || !draft.fullName.trim()}
                      onClick={() => handleAddEntry(subRace.id)}
                      type="button"
                    >
                      {isAddingHere ? 'Adding…' : 'Add participant'}
                    </button>
                    <button
                      className="ghost-button px-5 py-2"
                      onClick={() => setDrafts(curr => ({ ...curr, [subRace.id]: null }))}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {submitError ? (
        <div className="surface-panel border-rose-400/35 bg-rose-500/10 p-4 text-sm text-rose-200">
          {submitError}
        </div>
      ) : null}

      {sortedSubRaces.length > 0 ? (
        <div className="surface-panel flex flex-wrap gap-3 p-6 sm:p-8">
          <button
            className="cta-button px-6 py-2 disabled:opacity-50"
            disabled={saveAllMutation.isPending}
            onClick={handleSaveAll}
            type="button"
          >
            {saveAllMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <Link className="ghost-button px-6 py-2" to={`/calendar/${race.id}`}>
            Done
          </Link>
        </div>
      ) : null}
    </section>
  );
}

