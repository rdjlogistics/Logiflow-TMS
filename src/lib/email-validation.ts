/**
 * Business email validation — blocks free/personal email providers.
 * Used in Auth.tsx (client-side) to enforce business-only signups.
 */

const FREE_EMAIL_DOMAINS = new Set([
  // Global providers
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.nl', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
  'outlook.com', 'outlook.nl', 'outlook.de', 'outlook.fr',
  'live.com', 'live.nl',
  'yahoo.com', 'yahoo.nl', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'mail.com', 'email.com',
  'gmx.com', 'gmx.net', 'gmx.de', 'gmx.nl',
  'aol.com',
  'zoho.com', 'zohomail.com',
  'yandex.com', 'yandex.ru',
  'tutanota.com', 'tuta.io',
  'fastmail.com', 'fastmail.fm',
  'hey.com',
  'msn.com',
  'mail.ru',
  // Dutch ISPs / telecom
  'ziggo.nl', 'kpnmail.nl', 'kpnplanet.nl',
  'xs4all.nl', 'planet.nl', 'hetnet.nl',
  'casema.nl', 'upcmail.nl', 'telfort.nl',
  'online.nl', 'home.nl', 'chello.nl', 'quicknet.nl',
  'tele2.nl', 't-mobile.nl', 'vodafone.nl',
  'wanadoo.nl', 'solcon.nl',
  // Disposable/temporary
  'mailinator.com', 'guerrillamail.com', 'tempmail.com',
  'throwaway.email', 'yopmail.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grr.la', 'dispostable.com',
  'trashmail.com', 'trashmail.net', 'maildrop.cc',
  'temp-mail.org', '10minutemail.com',
]);

/**
 * Check if an email address uses a business domain.
 * Returns true for business emails, false for free/personal providers.
 */
export function isBusinessEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.has(domain);
}

/**
 * Get user-friendly error message for non-business email.
 */
export function getBusinessEmailError(): string {
  return 'Gebruik een zakelijk e-mailadres (bijv. naam@jouwbedrijf.nl). Gratis e-maildiensten zoals Gmail of Hotmail zijn niet toegestaan voor bedrijfsregistraties.';
}
