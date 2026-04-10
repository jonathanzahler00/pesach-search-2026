import type { Metadata } from 'next';
import HomeSearch from '@/components/HomeSearch';
import SeasonEndedLanding from '@/components/SeasonEndedLanding';
import { isSeasonEnded } from '@/lib/season-ended';

export async function generateMetadata(): Promise<Metadata> {
  if (isSeasonEnded()) {
    return {
      title: 'Pesach Search — See you for 5787',
      description:
        'Our 2026 guide search is paused for the season. Join the list to get notified when the 2027 / 5787 Pesach guide search is available.',
    };
  }
  return {};
}

export default function HomePage() {
  if (isSeasonEnded()) {
    return <SeasonEndedLanding />;
  }
  return <HomeSearch />;
}
