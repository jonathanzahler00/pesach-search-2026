/**
 * When NEXT_PUBLIC_SEASON_ENDED=true, the public site shows a waitlist landing page
 * and app routes redirect to home. API routes stay deployed for next season.
 */
export function isSeasonEnded(): boolean {
  return process.env.NEXT_PUBLIC_SEASON_ENDED === 'true';
}
