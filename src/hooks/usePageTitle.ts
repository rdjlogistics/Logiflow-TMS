/**
 * usePageTitle — Sets document.title, meta description and canonical URL per page.
 * Resets to defaults on unmount.
 */
import { useEffect } from 'react';

const APP_NAME = 'LogiFlow TMS';
const DEFAULT_TITLE = APP_NAME;
const BASE_URL = 'https://rdjlogistics.nl';

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

interface PageSEOOptions {
  description?: string;
  resetOnUnmount?: boolean;
}

/**
 * @param title  Page-specific title. " | LogiFlow TMS" is appended if not already present.
 * @param options  Optional description and resetOnUnmount flag.
 */
export function usePageTitle(title: string, options: PageSEOOptions | boolean = true): void {
  const opts: PageSEOOptions = typeof options === 'boolean'
    ? { resetOnUnmount: options }
    : options;

  const { description, resetOnUnmount = true } = opts;

  useEffect(() => {
    const fullTitle = title.includes(APP_NAME)
      ? title
      : `${title} | ${APP_NAME}`;

    document.title = fullTitle;

    // Update OG title
    upsertMeta('og:title', fullTitle, 'property');

    // Update canonical to current path
    const canonical = `${BASE_URL}${window.location.pathname}`;
    upsertCanonical(canonical);
    upsertMeta('og:url', canonical, 'property');

    // Update description if provided
    if (description) {
      upsertMeta('description', description);
      upsertMeta('og:description', description, 'property');
    }

    return () => {
      if (resetOnUnmount) {
        document.title = DEFAULT_TITLE;
      }
    };
  }, [title, description, resetOnUnmount]);
}