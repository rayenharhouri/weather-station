import * as React from 'react';

type SevSize = number;

interface SevShapeProps {
  size?: SevSize;
  className?: string;
  title?: string;
}

const baseSvgProps = (size: number, title?: string) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    role: title ? 'img' : 'presentation',
    'aria-hidden': title ? undefined : 'true',
    style: { display: 'block', flexShrink: 0 },
  }) as const;

export function SevInfo({ size = 14, className, title }: SevShapeProps) {
  return (
    <svg {...baseSvgProps(size, title)} className={className} fill="var(--sev-info)">
      {title && <title>{title}</title>}
      <circle cx="8" cy="8" r="3.4" />
    </svg>
  );
}

export function SevWarn({ size = 14, className, title }: SevShapeProps) {
  return (
    <svg {...baseSvgProps(size, title)} className={className} fill="var(--sev-warn)">
      {title && <title>{title}</title>}
      <polygon points="8,2.6 13.6,13 2.4,13" />
    </svg>
  );
}

export function SevCritical({ size = 14, className, title }: SevShapeProps) {
  return (
    <svg {...baseSvgProps(size, title)} className={className} fill="var(--sev-critical)">
      {title && <title>{title}</title>}
      <polygon points="8,2.4 13.6,8 8,13.6 2.4,8" />
    </svg>
  );
}

export type Severity = 'info' | 'warn' | 'critical';

export function Sev({ severity, size, title }: { severity: Severity; size?: SevSize; title?: string }) {
  if (severity === 'critical') return <SevCritical size={size} title={title} />;
  if (severity === 'warn') return <SevWarn size={size} title={title} />;
  return <SevInfo size={size} title={title} />;
}
