import { useEffect, useState } from 'react';

const CURRENT_VERSION = '0.1.0';
const RELEASES_URL = 'https://github.com/MalumaDev/OICAT/releases';
const API_URL = 'https://api.github.com/repos/MalumaDev/OICAT/releases/latest';

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

export function useUpdateCheck() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => r.json())
      .then((data) => {
        const tag: string = data?.tag_name ?? '';
        if (tag && isNewer(tag, CURRENT_VERSION)) {
          setNewVersion(tag);
        }
      })
      .catch(() => {/* silently ignore network errors */});
  }, []);

  return { newVersion, dismissed, dismiss: () => setDismissed(true), releasesUrl: RELEASES_URL };
}
