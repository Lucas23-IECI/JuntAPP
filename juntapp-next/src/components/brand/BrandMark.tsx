type BrandMarkProps = {
  className?: string;
  size?: number;
  title?: string;
};

export default function BrandMark({ className, size = 48, title = 'JuntAPP' }: BrandMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="64 64 896 896"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="64" y="64" width="896" height="896" rx="176" fill="#031636" />
      <path d="M650 270v315c0 137-62 205-175 205-86 0-141-39-165-115" fill="none" stroke="#fff" strokeWidth="156" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="310" cy="675" r="78" fill="#ff6b00" />
    </svg>
  );
}
