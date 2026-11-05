// Website blocking works by adding domains to a NextDNS "denylist".
// Your phone is set (via NextDNS's Apple profile) to ask NextDNS for every
// website address; NextDNS then refuses to answer for denylisted domains.
// This file just talks to NextDNS's web API to add/remove those domains.
const BASE = 'https://api.nextdns.io/profiles';

export type Settings = { profileId: string; apiKey: string };

async function call(s: Settings, method: string, path: string, body?: object) {
  const res = await fetch(`${BASE}/${s.profileId}${path}`, {
    method,
    headers: { 'X-Api-Key': s.apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`NextDNS ${res.status}`);
}

export const blockDomain = (s: Settings, domain: string) =>
  call(s, 'POST', '/denylist', { id: domain, active: true });

export const unblockDomain = (s: Settings, domain: string) =>
  call(s, 'DELETE', `/denylist/hex:${hex(domain)}`);

// The API identifies entries by the hex encoding of the domain name.
function hex(str: string) {
  return Array.from(str).map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}
