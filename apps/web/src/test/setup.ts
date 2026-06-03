import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library unmounts everything after each test so the hand-rolled
// history/popstate listeners and polling intervals in App.tsx are torn down and
// do not leak between characterization tests.
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

// jsdom does not implement scrollTo; App.tsx calls window.scrollTo on every
// route change (openProjectDetail / closeProjectDetail). Stub it so navigation
// behavior can be exercised without unhandled errors.
if (!window.scrollTo) {
  (window as unknown as { scrollTo: () => void }).scrollTo = () => {};
} else {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
}

// jsdom lacks matchMedia; guard in case any dependency probes it.
if (!window.matchMedia) {
  (window as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
