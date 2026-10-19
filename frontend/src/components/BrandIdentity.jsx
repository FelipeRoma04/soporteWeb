export default function BrandIdentity({ className, showTagline = true }) {
  return (
    <div
      className={`brand-lockup ${className}`}
      role="img"
      aria-label="SysPulse — Centro de Asistencia Inteligente"
    >
      <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <g fill="currentColor">
          <rect x="20" y="1" width="8" height="10" rx="2" />
          <rect x="20" y="1" width="8" height="10" rx="2" transform="rotate(45 24 24)" />
          <rect x="20" y="1" width="8" height="10" rx="2" transform="rotate(90 24 24)" />
          <rect x="20" y="1" width="8" height="10" rx="2" transform="rotate(135 24 24)" />
          <rect x="20" y="1" width="8" height="10" rx="2" transform="rotate(180 24 24)" />
          <rect x="20" y="1" width="8" height="10" rx="2" transform="rotate(225 24 24)" />
          <rect x="20" y="1" width="8" height="10" rx="2" transform="rotate(270 24 24)" />
          <rect x="20" y="1" width="8" height="10" rx="2" transform="rotate(315 24 24)" />
          <circle cx="24" cy="24" r="17" />
        </g>
        <circle cx="24" cy="24" r="11.5" fill="#031926" stroke="currentColor" strokeWidth="1.5" />
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
          <path d="M16 20h9v-4h5" />
          <path d="M16 24h16" />
          <path d="M16 28h6v4h7" />
        </g>
        <g fill="currentColor">
          <circle cx="31.5" cy="16" r="2" />
          <circle cx="34" cy="24" r="2" />
          <circle cx="30" cy="32" r="2" />
        </g>
      </svg>
      <span className="brand-copy">
        <strong>SysPulse</strong>
        {showTagline && <small>Centro de Asistencia Inteligente</small>}
      </span>
    </div>
  );
}
