/**
 * Batch T13: usePageTitle
 * Sets document.title and resets to 'LogiFlow TMS' on unmount.
 *
 * Example:
 *   usePageTitle('Dashboard | LogiFlow');
 *   usePageTitle('Ritten'); // will display "Ritten | LogiFlow"
 */
import { useEffect } from 'react';

const APP_NAME = 'LogiFlow';
const DEFAULT_TITLE = APP_NAME;

/**
 * @param title  Page-specific title. If it already contains "LogiFlow" it is
 *               used as-is; otherwise " | LogiFlow" is appended automatically.
 * @param resetOnUnmount  Whether to reset to the default title on unmount (default: true)
 */
export function usePageTitle(title: string, resetOnUnmount = true): void {
  useEffect(() => {
    const fullTitle = title.includes(APP_NAME)
      ? title
      : `${title} | ${APP_NAME}`;

    document.title = fullTitle;

    return () => {
      if (resetOnUnmount) {
        document.title = DEFAULT_TITLE;
      }
    };
  }, [title, resetOnUnmount]);
}
