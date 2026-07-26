'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User as UserIcon,
  Palette,
  Bell,
  Sliders,
  Lock,
  LogOut,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/providers/AuthProvider';
import { authService, settingsService } from '@/services/api';

type ThemeOption = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useAuthContext();

  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings.preferences'],
    queryFn: () => settingsService.get(),
    staleTime: 60_000,
  });

  const [alertsEmail, setAlertsEmail] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const [tempCritical, setTempCritical] = useState('35');
  const [humidityWarn, setHumidityWarn] = useState('80');
  const [pressureLow, setPressureLow] = useState('990');
  const [rainfallHourly, setRainfallHourly] = useState('10');

  const [thresholdsFlash, setThresholdsFlash] = useState(false);
  const [notificationsFlash, setNotificationsFlash] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setAlertsEmail(settings.notifications.alertsEmail);
    setDailyReport(settings.notifications.dailyReport);
    setWeeklyReport(settings.notifications.weeklyReport);
    setTempCritical(String(settings.thresholds.tempCriticalC));
    setHumidityWarn(String(settings.thresholds.humidityWarnPct));
    setPressureLow(String(settings.thresholds.pressureLowHpa));
    setRainfallHourly(String(settings.thresholds.rainfallHourlyMm));
  }, [settings]);

  const patchSettings = useMutation({
    mutationFn: settingsService.patch,
    onSuccess: (next) => queryClient.setQueryData(['settings.preferences'], next),
  });

  const flash = (set: (v: boolean) => void) => {
    set(true);
    setTimeout(() => set(false), 1500);
  };

  const updateNotification = (
    key: 'alertsEmail' | 'dailyReport' | 'weeklyReport',
    value: boolean,
  ) => {
    if (key === 'alertsEmail') setAlertsEmail(value);
    if (key === 'dailyReport') setDailyReport(value);
    if (key === 'weeklyReport') setWeeklyReport(value);
    patchSettings.mutate(
      { notifications: { [key]: value } },
      { onSuccess: () => flash(setNotificationsFlash) },
    );
  };

  const handleSaveThresholds = () => {
    patchSettings.mutate(
      {
        thresholds: {
          tempCriticalC: Number(tempCritical),
          humidityWarnPct: Number(humidityWarn),
          pressureLowHpa: Number(pressureLow),
          rainfallHourlyMm: Number(rainfallHourly),
        },
      },
      { onSuccess: () => flash(setThresholdsFlash) },
    );
  };

  const [isSigningOut, setIsSigningOut] = useState(false);
  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-6 py-5 max-w-4xl">
      <PageHeader />

      <Section icon={UserIcon} title="Profile" description="Read-only summary of the signed-in account.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ReadField label="Name" value={user?.name ?? '—'} />
          <ReadField label="Email" value={user?.email ?? '—'} mono />
          <ReadField label="Role" value={user?.role ?? '—'} capitalize />
        </div>
      </Section>

      <Section icon={Palette} title="Appearance" description="The default is dark; light mode is for daytime + decks.">
        <Row label="Theme" hint="System follows your OS preference.">
          <SegmentedTabs<ThemeOption>
            value={(theme ?? 'system') as ThemeOption}
            onChange={(v) => setTheme(v)}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
        </Row>
      </Section>

      <Section
        icon={Bell}
        title="Notifications"
        description="Preferences are saved per user. Email provider wiring lands in Phase 6+; toggles persist either way."
        action={
          notificationsFlash ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-sev-success">
              <Check size={11} strokeWidth={1.8} /> saved
            </span>
          ) : null
        }
      >
        <Row label="Alert email" hint="Send an email when a critical alert fires.">
          <Switch
            checked={alertsEmail}
            onCheckedChange={(v) => updateNotification('alertsEmail', v)}
          />
        </Row>
        <hr className="hairline" />
        <Row label="Daily report" hint="Daily summary of weather + incidents at 09:00 local time.">
          <Switch
            checked={dailyReport}
            onCheckedChange={(v) => updateNotification('dailyReport', v)}
          />
        </Row>
        <hr className="hairline" />
        <Row label="Weekly report" hint="High-level digest emailed every Monday.">
          <Switch
            checked={weeklyReport}
            onCheckedChange={(v) => updateNotification('weeklyReport', v)}
          />
        </Row>
      </Section>

      <Section
        icon={Sliders}
        title="Alert thresholds"
        description="Stored per user. The global evaluator still uses built-in defaults — per-user overrides land in Phase 5+."
        action={
          thresholdsFlash ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-sev-success">
              <Check size={11} strokeWidth={1.8} /> saved
            </span>
          ) : null
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ThresholdField label="Temperature · critical" value={tempCritical} onChange={setTempCritical} unit="°C" />
          <ThresholdField label="Humidity · warning"     value={humidityWarn}   onChange={setHumidityWarn}   unit="%" />
          <ThresholdField label="Pressure · low"          value={pressureLow}    onChange={setPressureLow}    unit="hPa" />
          <ThresholdField label="Rainfall · hourly"       value={rainfallHourly} onChange={setRainfallHourly} unit="mm/h" />
        </div>
        <div className="pt-2">
          <Button
            size="sm"
            onClick={handleSaveThresholds}
            disabled={patchSettings.isPending}
          >
            {patchSettings.isPending ? 'Saving…' : 'Save thresholds'}
          </Button>
        </div>
      </Section>

      <Section icon={Lock} title="Security" description="Protect this account.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" size="sm" className="justify-start">Change password</Button>
          <Button variant="outline" size="sm" className="justify-start">Enable two-factor auth</Button>
        </div>
      </Section>

      <HairlineCard className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--sev-critical)' }} className="flex">
            <LogOut size={16} strokeWidth={1.5} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-fg">Sign out of WeatherHub</span>
            <span className="text-xs text-fg-muted">You can sign back in any time.</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isSigningOut}
          style={{ borderColor: 'oklch(from var(--sev-critical) l c h / 0.4)' }}
          className="text-sev-critical hover:bg-surface-2"
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </HairlineCard>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-end justify-between pb-1 flex-wrap gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Settings</h1>
          <Chip>v1.4</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Profile · theme · notifications · alert thresholds · security
        </span>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <HairlineCard className="p-4 flex flex-col gap-4">
      <div className="flex items-start gap-3 pb-3 border-b border-border-subtle">
        <span className="flex pt-0.5" style={{ color: 'var(--accent-brand)' }}>
          <Icon size={16} strokeWidth={1.5} />
        </span>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-semibold text-fg">{title}</span>
          {description && <span className="text-xs text-fg-muted">{description}</span>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </HairlineCard>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-fg">{label}</span>
        {hint && <span className="text-xs text-fg-muted">{hint}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ReadField({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-surface-2 border border-border-subtle">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span
        className={[
          'text-sm text-fg',
          mono ? 'font-mono' : '',
          capitalize ? 'capitalize' : '',
        ].join(' ').trim()}
      >
        {value}
      </span>
    </div>
  );
}

function ThresholdField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-14 font-mono tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle font-mono">
          {unit}
        </span>
      </div>
    </div>
  );
}
