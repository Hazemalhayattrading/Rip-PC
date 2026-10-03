import { useThemeToggle } from '../../components/theme/use-theme-toggle';

/**
 * The lab header's theme switch (lab mock; components.md §2 and §3): a round icon button drawn at
 * 36 px (`size-control-sm`). On touch screens a centred box takes its hit area to 44 × 44 px
 * (lab-spec §9). Its name stays "Light theme", in visually hidden text, and `aria-pressed` says
 * whether light is on. The icon is a sun, what the button turns on; its colour comes from the
 * button, so it follows forced colours. The behaviour is the product toggle's own hook.
 */
export function LabThemeToggle() {
  const { light, toggle } = useThemeToggle();
  return (
    <button
      type="button"
      aria-pressed={light}
      onClick={toggle}
      className="relative ml-auto grid size-control-sm place-items-center rounded-pill border border-line bg-surface text-ink-2 aria-pressed:border-ink-3 aria-pressed:text-ink forced-colors:aria-pressed:bg-[Highlight] forced-colors:aria-pressed:text-[HighlightText] pointer-coarse:after:absolute pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:size-[max(100%,2.75rem)] pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2"
    >
      <svg
        className="size-4.5"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="3" />
        <path d="M9 1.25V3M9 15v1.75M1.25 9H3M15 9h1.75M3.52 3.52l1.24 1.24M13.24 13.24l1.24 1.24M3.52 14.48l1.24-1.24M13.24 4.76l1.24-1.24" />
      </svg>
      <span className="sr-only">Light theme</span>
    </button>
  );
}
