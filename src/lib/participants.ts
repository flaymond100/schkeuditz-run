import { supabase } from './supabase';

export type ParticipantInput = {
  fullName: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  teamName?: string;
  nationality?: string;
  phone?: string;
  uciNumber?: string;
};

/**
 * Look up a participant by (email, full_name, date_of_birth) — all three required to match.
 * Otherwise create a new one. Email is normalized to lowercase.
 */
export async function findOrCreateParticipant(
  input: ParticipantInput
): Promise<{ id: string }> {
  const email = input.email?.trim().toLowerCase() || null;
  const fullName = input.fullName.trim();
  const dateOfBirth = input.dateOfBirth || null;

  if (email && fullName && dateOfBirth) {
    const { data: existing, error } = await supabase
      .from('participants')
      .select('id')
      .eq('email', email)
      .eq('full_name', fullName)
      .eq('date_of_birth', dateOfBirth)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (existing) return existing as { id: string };
  }

  const { data: created, error: insertError } = await supabase
    .from('participants')
    .insert({
      full_name: fullName,
      date_of_birth: dateOfBirth,
      gender: input.gender || null,
      team_name: input.teamName || null,
      nationality: input.nationality || null,
      email,
      phone: input.phone || null,
      uci_number: input.uciNumber?.trim() || null,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return created as { id: string };
}
