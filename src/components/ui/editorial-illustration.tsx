/**
 * Static SVG editorial illustrations for section imagery.
 * These are lightweight, brand-consistent visuals that communicate
 * section purpose. They are NOT admin-editable — they're part of the
 * site's visual information architecture.
 */

export function LegalScales({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Pillar */}
      <rect x="96" y="20" width="8" height="120" fill="#e4e1d9" />
      <rect x="70" y="136" width="60" height="6" rx="1" fill="#17140f" />

      {/* Beam */}
      <rect x="30" y="36" width="140" height="4" rx="1" fill="#17140f" />

      {/* Left pan */}
      <line x1="50" y1="40" x2="50" y2="70" stroke="#a3352a" strokeWidth="2" />
      <line x1="30" y1="40" x2="70" y2="40" stroke="#a3352a" strokeWidth="2" />
      <path d="M30 70 Q50 90 70 70" stroke="#a3352a" strokeWidth="2" fill="none" />

      {/* Right pan */}
      <line x1="150" y1="40" x2="150" y2="70" stroke="#a3352a" strokeWidth="2" />
      <line x1="130" y1="40" x2="170" y2="40" stroke="#a3352a" strokeWidth="2" />
      <path d="M130 70 Q150 90 170 70" stroke="#a3352a" strokeWidth="2" fill="none" />

      {/* Top ornament */}
      <circle cx="100" cy="20" r="6" fill="#a3352a" />
    </svg>
  );
}

export function OpenBook({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Left page */}
      <path d="M100 30 L100 120 Q60 110 20 115 L20 25 Q60 20 100 30Z" fill="#fafaf8" stroke="#e4e1d9" strokeWidth="2" />
      {/* Right page */}
      <path d="M100 30 L100 120 Q140 110 180 115 L180 25 Q140 20 100 30Z" fill="#fafaf8" stroke="#e4e1d9" strokeWidth="2" />

      {/* Spine */}
      <line x1="100" y1="30" x2="100" y2="120" stroke="#a3352a" strokeWidth="2" />

      {/* Text lines left */}
      <line x1="35" y1="45" x2="85" y2="42" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="35" y1="55" x2="80" y2="52" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="35" y1="65" x2="75" y2="62" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="35" y1="75" x2="82" y2="72" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="35" y1="85" x2="70" y2="82" stroke="#e4e1d9" strokeWidth="1.5" />

      {/* Text lines right */}
      <line x1="115" y1="42" x2="165" y2="45" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="115" y1="52" x2="160" y2="55" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="115" y1="62" x2="155" y2="65" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="115" y1="72" x2="162" y2="75" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="115" y1="82" x2="145" y2="85" stroke="#e4e1d9" strokeWidth="1.5" />

      {/* Red bookmark */}
      <path d="M140 25 L140 55 L148 48 L156 55 L156 25" fill="#a3352a" />
    </svg>
  );
}

export function PenAndDocument({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Document */}
      <rect x="40" y="20" width="100" height="130" rx="2" fill="#fafaf8" stroke="#e4e1d9" strokeWidth="2" />

      {/* Text lines */}
      <line x1="55" y1="45" x2="125" y2="45" stroke="#e4e1d9" strokeWidth="2" />
      <line x1="55" y1="60" x2="120" y2="60" stroke="#e4e1d9" strokeWidth="2" />
      <line x1="55" y1="75" x2="115" y2="75" stroke="#e4e1d9" strokeWidth="2" />
      <line x1="55" y1="90" x2="122" y2="90" stroke="#e4e1d9" strokeWidth="2" />
      <line x1="55" y1="105" x2="100" y2="105" stroke="#e4e1d9" strokeWidth="2" />

      {/* Red header line */}
      <rect x="55" y="32" width="50" height="4" rx="1" fill="#a3352a" />

      {/* Pen */}
      <g transform="translate(130, 30) rotate(30)">
        <rect x="0" y="0" width="6" height="60" rx="1" fill="#17140f" />
        <polygon points="0,60 6,60 3,72" fill="#a3352a" />
        <rect x="0" y="0" width="6" height="8" rx="1" fill="#a3352a" />
      </g>
    </svg>
  );
}

export function Gavel({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Sound block */}
      <rect x="60" y="120" width="80" height="12" rx="2" fill="#17140f" />
      <rect x="55" y="128" width="90" height="8" rx="2" fill="#a3352a" />

      {/* Handle */}
      <rect x="96" y="50" width="8" height="75" rx="2" fill="#6e6a63" transform="rotate(-15, 100, 87)" />

      {/* Head */}
      <rect x="70" y="30" width="60" height="24" rx="4" fill="#17140f" transform="rotate(-15, 100, 42)" />
      <rect x="72" y="34" width="56" height="4" rx="1" fill="#a3352a" transform="rotate(-15, 100, 42)" />
    </svg>
  );
}

export function Handshake({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Left arm */}
      <path d="M20 80 L60 60 L90 70" stroke="#17140f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Right arm */}
      <path d="M180 80 L140 60 L110 70" stroke="#17140f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Handshake */}
      <path d="M90 70 Q100 55 110 70" stroke="#a3352a" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="100" cy="62" r="4" fill="#a3352a" />
    </svg>
  );
}

export function MagnifyingGlass({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* Glass circle */}
      <circle cx="85" cy="85" r="50" stroke="#17140f" strokeWidth="6" fill="none" />
      <circle cx="85" cy="85" r="50" stroke="#a3352a" strokeWidth="2" strokeDasharray="8 4" fill="none" />

      {/* Handle */}
      <line x1="120" y1="120" x2="165" y2="165" stroke="#17140f" strokeWidth="8" strokeLinecap="round" />

      {/* Document inside glass */}
      <rect x="65" y="60" width="40" height="50" rx="2" fill="#fafaf8" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="70" y1="72" x2="100" y2="72" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="70" y1="80" x2="95" y2="80" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="70" y1="88" x2="98" y2="88" stroke="#e4e1d9" strokeWidth="1.5" />
      <line x1="70" y1="96" x2="90" y2="96" stroke="#e4e1d9" strokeWidth="1.5" />
    </svg>
  );
}
