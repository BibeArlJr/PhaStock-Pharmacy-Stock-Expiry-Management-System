import markLogoSrc from '@/assets/brand/logo-mark.svg';
import fullLogoSrc from '@/assets/brand/logo-full.svg';
import { cn } from '@/lib/utils';

function FallbackMark({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect x="4" y="10" width="56" height="44" rx="22" fill="#E4FFC2" stroke="#1F6534" strokeWidth="3" />
      <path d="M24 20H35C40.523 20 45 24.477 45 30C45 35.523 40.523 40 35 40H24V20Z" fill="#299640" />
      <path d="M24 24H34C37.314 24 40 26.686 40 30C40 33.314 37.314 36 34 36H29V46H24V24Z" fill="white" />
    </svg>
  );
}

export default function BrandLogo({ size = 44, showText = true, variant = 'mark', className }) {
  const resolvedSize = Number(size) || 44;
  const resolvedVariant = variant === 'full' ? 'full' : 'mark';

  if (resolvedVariant === 'full') {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <img
          src={fullLogoSrc || markLogoSrc}
          alt="PhaStock"
          style={{ height: resolvedSize }}
          className="w-auto shrink-0"
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {markLogoSrc ? (
        <img
          src={markLogoSrc}
          alt="PhaStock logo"
          width={resolvedSize}
          height={resolvedSize}
          className="shrink-0"
        />
      ) : (
        <FallbackMark size={resolvedSize} />
      )}

      {showText ? <span className="text-xl font-bold tracking-tight text-primary">PhaStock</span> : null}
    </div>
  );
}
