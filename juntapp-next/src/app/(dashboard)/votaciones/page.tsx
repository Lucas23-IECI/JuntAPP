import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import VotacionesClient from '@/components/dashboard/votaciones/VotacionesClient';

export const metadata: Metadata = {
  title: 'Votaciones — JuntAPP',
};

export default async function VotacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .eq('junta_id', profile?.junta_id)
    .order('created_at', { ascending: false });

  const { data: votes } = await supabase
    .from('votes')
    .select('*');

  const { data: proposals } = await supabase
    .from('poll_proposals')
    .select('*')
    .eq('junta_id', profile?.junta_id)
    .order('created_at', { ascending: false });

  // Enrich polls with vote counts and user vote status
  const enrichedPolls = (polls || []).map((poll) => {
    const pollVotes = (votes || []).filter(v => v.poll_id === poll.id);
    const hasVoted = pollVotes.some(v => v.user_id === user!.id);

    const options = (poll.options as { id: string; text: string }[]).map((opt) => ({
      ...opt,
      votes: pollVotes.filter(v => v.option_id === opt.id).length,
    }));

    return { ...poll, options, hasVoted };
  });

  return (
    <VotacionesClient
      polls={enrichedPolls}
      currentProfile={profile!}
      proposals={proposals ?? []}
    />
  );
}
