'use client';

import Image from 'next/image';
import Link from 'next/link';

export function BrandBlock({ tenantHost }: { tenantHost: string }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 px-2 py-1 rounded-md focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2"
    >
      <Image
        src="/logo.png"
        alt="WeatherHub"
        width={28}
        height={28}
        className="block shrink-0"
        priority
      />
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-sm font-semibold text-fg tracking-tight truncate">WeatherHub</span>
        <span className="font-mono text-[11px] text-fg-subtle truncate">{tenantHost}</span>
      </div>
    </Link>
  );
}
