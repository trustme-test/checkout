/** Shared Tailwind class lists for common controls. */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${buttonBase} bg-amber-800 text-white hover:bg-amber-900 focus-visible:outline-amber-800`;

export const secondaryButton = `${buttonBase} border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700 focus-visible:outline-stone-500`;

export const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-stone-500 disabled:cursor-not-allowed disabled:opacity-40";

export const card =
  "rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-sm";
