'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HairlineCard } from '@/components/ui/hairline-card';
import { LiveDot } from '@/components/dashboard/live-dot';
import { useAuthContext } from '@/providers/AuthProvider';
import { authService } from '@/services/api';
import { STORAGE_KEYS } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setIsLoading: setAuthLoading } = useAuthContext();
  const [email, setEmail] = useState('chiheb@enit.utm.tn');
  const [password, setPassword] = useState('weatherhub123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setAuthLoading(true);
    try {
      const { user, token } = await authService.login(email, password);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      setUser(user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT — brand + headline + stats. Hidden on small screens. */}
        <section className="hidden lg:flex flex-col gap-8 px-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="WeatherHub" width={28} height={28} priority />
            <span className="text-sm font-semibold tracking-tight">WeatherHub</span>
            <span className="font-mono text-[11px] text-fg-subtle">enit.weatherhub.tn</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-[1.1]">
              Real-time weather, rooted in{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(110deg, var(--accent-brand), color-mix(in oklch, var(--accent-brand) 60%, var(--sev-success)))',
                }}
              >
                trust
              </span>
              .
            </h1>
            <p className="text-sm text-fg-muted leading-relaxed max-w-md">
              Stream live readings from the École Nationale d&apos;Ingénieurs de Tunis campus,
              forecast micro-climates, and verify every record on Hedera.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <Stat label="Live SSE"  value="< 1s" />
            <Stat label="Sensors"   value="7+" />
            <Stat label="Integrity" value="100%" />
          </div>

          <div className="flex items-center gap-2 text-xs text-fg-subtle">
            <LiveDot state="live" />
            <span>All systems operational</span>
            <span className="font-mono ml-2">enit · esprit · insat</span>
          </div>
        </section>

        {/* RIGHT — login form. This card is the one place where glass-on-overlay is permitted. */}
        <HairlineCard className="p-8 sm:p-10">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <Image src="/logo.png" alt="WeatherHub" width={28} height={28} priority />
            <span className="text-sm font-semibold tracking-tight">WeatherHub</span>
            <span className="font-mono text-[11px] text-fg-subtle">enit.weatherhub.tn</span>
          </div>

          <header className="mb-8">
            <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-fg-muted mt-1">
              Sign in to your weather station dashboard.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 px-3 py-2 rounded-md border text-sm"
                style={{
                  borderColor: 'oklch(from var(--sev-critical) l c h / 0.4)',
                  background: 'oklch(from var(--sev-critical) l c h / 0.08)',
                  color: 'var(--sev-critical)',
                }}
              >
                <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-fg">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@enit.utm.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-fg">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs text-accent-brand hover:underline focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2 rounded-sm"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-10 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition-colors focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2 rounded-sm"
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" disabled={isLoading} className="w-full justify-center">
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                    aria-hidden="true"
                  />
                  Signing in…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Sign in <ArrowRight size={14} strokeWidth={1.5} />
                </span>
              )}
            </Button>

            <div className="relative my-6 flex items-center">
              <span className="flex-1 hairline" />
              <span className="px-3 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                Demo credentials
              </span>
              <span className="flex-1 hairline" />
            </div>

            <div className="rounded-md bg-surface-2 border border-border-subtle px-3 py-2.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-fg-muted">
                <span>Email</span>
                <span className="text-fg">chiheb@enit.utm.tn</span>
              </div>
              <div className="flex justify-between text-fg-muted">
                <span>Password</span>
                <span className="text-fg">weatherhub123</span>
              </div>
            </div>
          </form>
        </HairlineCard>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <HairlineCard className="px-4 py-3">
      <div className="font-mono text-xl font-medium text-fg tabular-nums tracking-[-0.02em]">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle mt-0.5">{label}</div>
    </HairlineCard>
  );
}
