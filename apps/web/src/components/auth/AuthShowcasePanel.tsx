import { Activity, Bell, CalendarCheck, Check, CreditCard, Dumbbell, LucideIcon, Users } from 'lucide-react';

import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

type ShowcaseStep = {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
};

type AuthShowcasePanelProps = {
  mode: 'login' | 'signup';
  step?: number;
  steps?: readonly ShowcaseStep[];
};

const operations = [
  { label: 'Members checked in', value: '128', icon: Users },
  { label: 'Renewals due', value: '24', icon: Bell },
  { label: 'Classes today', value: '11', icon: CalendarCheck },
];

const activityLane = [
  { time: '06:00', title: 'Morning strength batch', status: '32 booked' },
  { time: '10:30', title: 'PT session window', status: '4 trainers' },
  { time: '18:00', title: 'Prime hour follow-ups', status: '18 leads' },
];

export function AuthShowcasePanel({ mode, step = 1, steps = [] }: AuthShowcasePanelProps) {
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Build Your GymOs Workspace' : 'GymOs Command Center';
  const description = isSignup
    ? 'Organize branches, owners, media, plans, and billing from a focused onboarding flow.'
    : 'Track members, attendance, collections, and follow-ups from one operational dashboard.';

  return (
    <aside className="relative hidden overflow-hidden bg-secondary p-8 text-secondary-foreground lg:flex lg:h-screen lg:w-2/5 lg:flex-col lg:justify-center xl:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-y-0 left-12 w-px bg-white/10" />
        <div className="absolute inset-y-0 right-12 w-px bg-white/10" />
        <div className="absolute inset-x-0 top-24 h-px bg-white/10" />
        <div className="absolute inset-x-0 bottom-24 h-px bg-white/10" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-sm space-y-5 xl:max-w-md xl:space-y-6">
        <div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-white/12 bg-white/8 xl:h-16 xl:w-16">
            <BrandLogo tone="light" className="h-8 w-8 xl:h-9 xl:w-9" />
          </div>
          <h1 className="text-2xl font-bold text-white xl:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70 xl:text-base">{description}</p>
        </div>

        <div className="rounded-xl border border-white/12 bg-white/8 p-4 shadow-elevated xl:p-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 xl:pb-4">
            <div>
              <p className="text-xs font-medium text-white/55 xl:text-sm">Live floor</p>
              <p className="mt-1 text-base font-semibold text-white xl:text-lg">Today at Peak Hour</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground xl:h-11 xl:w-11">
              <Dumbbell className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 xl:mt-4 xl:gap-3">
            {operations.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-secondary/80 p-2.5 xl:p-3">
                <item.icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-lg font-semibold text-white xl:mt-3 xl:text-xl">{item.value}</p>
                <p className="mt-1 text-xs leading-snug text-white/55">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 hidden space-y-2 [@media(min-height:900px)]:block xl:mt-5 xl:space-y-3">
            {activityLane.map((item) => (
              <div key={item.time} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5 xl:p-3">
                <div className="w-12 text-sm font-medium text-primary">{item.time}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-white/50">{item.status}</p>
                </div>
                <Activity className="h-4 w-4 text-white/45" />
              </div>
            ))}
          </div>
        </div>

        {isSignup ? (
          <div className="space-y-2 xl:space-y-3">
            {steps.map((section) => (
              <div
                key={section.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-2.5 transition-all xl:p-3',
                  step === section.id ? 'border-primary/60 bg-primary/15' : 'border-white/10 bg-white/5 opacity-70'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md xl:h-9 xl:w-9',
                    step > section.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'
                  )}
                >
                  {step > section.id ? <Check className="h-4 w-4" /> : <section.icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{section.title}</p>
                  <p className="truncate text-xs text-white/55">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 xl:p-4">
              <CreditCard className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-medium text-white">Collections ready</p>
              <p className="mt-1 text-xs text-white/55">Invoices, sales, and renewals in sync.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 xl:p-4">
              <Bell className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-medium text-white">Lead follow-ups</p>
              <p className="mt-1 text-xs text-white/55">Never lose a trial enquiry again.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
