// Canonical Markly mark — geometry from brand-export/mark/markly-mark.svg
// (M monogram in currentColor + gold unread dot). Dot drops ≤20px.
interface LogoProps {
  size?: number;
  dot?: boolean;
  className?: string;
}

export function Logo({ size = 22, dot, className }: LogoProps) {
  const showDot = dot ?? size > 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="Markly"
    >
      <g transform="translate(24,24.8) scale(0.8) translate(-24,-24)">
        <path
          d="M11 36V12l13 22 13-22v24"
          fill="none"
          stroke="currentColor"
          strokeWidth="6.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {showDot && <circle cx="40" cy="8" r="3.7" fill="#caa53d" />}
    </svg>
  );
}
