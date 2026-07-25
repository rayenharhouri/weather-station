'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { CloudSun } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading) {
      router.push(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="aurora-bg min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl px-8 py-7 flex flex-col items-center gap-4">
        <div className="relative">
          <CloudSun className="w-10 h-10 text-primary animate-pulse" />
          <div className="absolute inset-0 rounded-full blur-xl bg-primary/30 -z-10" />
        </div>
        <p className="text-sm text-muted-foreground tracking-wide">Tuning into the weather…</p>
      </div>
    </div>
  );
}
