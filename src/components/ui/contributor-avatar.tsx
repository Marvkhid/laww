import Image from "next/image";

function initials(name: string): string {
  return name
    .replace(/^(Prof\.|Dr\.|Hon\.)\s+/, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

/**
 * Shared contributor avatar that shows the contributor's photo if available,
 * falling back to typographic initials when no image exists.
 */
export function ContributorAvatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-10 w-10 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-xl",
  };

  const sizePx = { sm: 40, md: 48, lg: 64 };

  if (photoUrl) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${sizeClasses[size]} ${className}`}
      >
        <Image
          src={photoUrl}
          alt={name}
          fill
          sizes={`${sizePx[size]}px`}
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-ink font-display italic text-paper transition-all duration-300 ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
