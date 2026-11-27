import Link from "next/link";
import { BasketLink } from "./basket-link";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
      <p className="bg-amber-100 dark:bg-amber-950 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:text-amber-100">
        Test mode: no real payments are processed.
      </p>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50"
        >
          Fika Supply Co.
        </Link>
        <BasketLink />
      </div>
    </header>
  );
}
