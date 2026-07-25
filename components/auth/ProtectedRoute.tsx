'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { CloudSun } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="aurora-bg min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl px-8 py-7 flex flex-col items-center gap-4">
          <div className="relative">
            <CloudSun className="w-10 h-10 text-primary animate-pulse" />
            <div className="absolute inset-0 rounded-full blur-xl bg-primary/30 -z-10" />
          </div>
          <p className="text-sm text-muted-foreground tracking-wide">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
