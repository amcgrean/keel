/**
 * Keel schedule engine
 *
 * A generic N-day repeating custody rotation, resolved through a fixed
 * override hierarchy. This module has no UI dependencies and no database
 * dependencies — it's pure date-in, assignment-out logic, so it can be
 * unit tested on its own and reused by the API, cron jobs, and reports.
 *
 * Resolution order (highest wins, but nothing is ever destroyed —
 * lower layers stay recorded even when overridden):
 *   1. base rotation (schedule_patterns / schedule_segments)
 *   2. holiday rule
 *   3. vacation block
 *   4. approved swap / schedule_exception
 *   5. manual override
 */

export type ParentId = string;

export interface RotationPattern {
  /** Ordered list of parent ids, one entry per day of the cycle. */
  cycle: ParentId[];
  /** Any date that maps to day 0 of the cycle — used to phase-align. */
  anchorDate: string; // ISO date, e.g. "2026-08-24"
}

export interface HolidayRule {
  id: string;
  label: string;
  parentOnEvenYears: ParentId;
  parentOnOddYears: ParentId;
  /** Inclusive date range, month/day only — year is resolved per-instance. */
  startMonthDay: string; // "MM-DD"
  endMonthDay: string; // "MM-DD"
}

export interface VacationBlock {
  id: string;
  parentId: ParentId;
  startDate: string; // ISO date
  endDate: string; // ISO date
}

export interface ScheduleException {
  id: string;
  date: string; // ISO date
  parentId: ParentId;
  reason?: string;
  approvedAt?: string;
  /** 'pending' = self-logged, not yet agreed by the other parent;
   *  'confirmed' = agreed (accepted swap, or a confirmed overnight).
   *  Omitted values are treated as confirmed for backwards compatibility. */
  status?: "pending" | "confirmed";
}

export interface ManualOverride {
  id: string;
  date: string; // ISO date
  parentId: ParentId;
}

export interface ScheduleInputs {
  pattern: RotationPattern;
  holidays?: HolidayRule[];
  vacations?: VacationBlock[];
  exceptions?: ScheduleException[];
  overrides?: ManualOverride[];
}

export interface ResolvedDay {
  date: string; // ISO date
  parentId: ParentId;
  /** Which layer produced the final assignment, for UI + audit display. */
  source: "base" | "holiday" | "vacation" | "exception" | "override";
  /** What the base rotation alone would have said — used to render
   *  "exception" styling (dashed segments) even when a higher layer wins. */
  basedOn: ParentId;
  /** True when the winning layer is a not-yet-agreed exception (a logged
   *  overnight awaiting the other parent's confirmation). The assignment
   *  still reflects who actually had the child; the flag just lets the UI
   *  mark it as provisional. */
  pending?: boolean;
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function monthDay(iso: string): string {
  return iso.slice(5, 10);
}

/** Resolves the base rotation parent for a single date, ignoring all overrides. */
export function resolveBase(pattern: RotationPattern, dateIso: string): ParentId {
  const anchor = new Date(pattern.anchorDate + "T00:00:00Z");
  const target = new Date(dateIso + "T00:00:00Z");
  const offset = daysBetween(anchor, target);
  const cycleLength = pattern.cycle.length;
  const idx = ((offset % cycleLength) + cycleLength) % cycleLength;
  return pattern.cycle[idx];
}

function resolveHoliday(holidays: HolidayRule[], dateIso: string): HolidayRule | null {
  const md = monthDay(dateIso);
  for (const h of holidays) {
    // Simple same-year range check; cross-New-Year ranges (e.g. winter
    // break) need splitting into two rules — deliberately not handled
    // here to keep this module boring and easy to verify.
    if (md >= h.startMonthDay && md <= h.endMonthDay) return h;
  }
  return null;
}

function resolveVacation(vacations: VacationBlock[], dateIso: string): VacationBlock | null {
  return vacations.find((v) => dateIso >= v.startDate && dateIso <= v.endDate) ?? null;
}

/** Resolves a single date through the full override hierarchy. */
export function resolveDay(inputs: ScheduleInputs, dateIso: string): ResolvedDay {
  const base = resolveBase(inputs.pattern, dateIso);
  let result: ResolvedDay = { date: dateIso, parentId: base, source: "base", basedOn: base };

  const holiday = inputs.holidays ? resolveHoliday(inputs.holidays, dateIso) : null;
  if (holiday) {
    const year = Number(dateIso.slice(0, 4));
    const parent = year % 2 === 0 ? holiday.parentOnEvenYears : holiday.parentOnOddYears;
    result = { ...result, parentId: parent, source: "holiday" };
  }

  const vacation = inputs.vacations ? resolveVacation(inputs.vacations, dateIso) : null;
  if (vacation) {
    result = { ...result, parentId: vacation.parentId, source: "vacation" };
  }

  const exception = inputs.exceptions?.find((e) => e.date === dateIso);
  if (exception) {
    result = {
      ...result,
      parentId: exception.parentId,
      source: "exception",
      pending: exception.status === "pending",
    };
  }

  const override = inputs.overrides?.find((o) => o.date === dateIso);
  if (override) {
    // A manual override is an explicit, agreed assignment — it supersedes a
    // pending exception and is never itself provisional.
    result = { ...result, parentId: override.parentId, source: "override", pending: false };
  }

  return result;
}

/** Resolves a contiguous date range — the primary function the UI calls. */
export function resolveRange(inputs: ScheduleInputs, startIso: string, days: number): ResolvedDay[] {
  const start = new Date(startIso + "T00:00:00Z");
  const out: ResolvedDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(resolveDay(inputs, d.toISOString().slice(0, 10)));
  }
  return out;
}

/** Finds exchange points (where the resolved parent changes day-to-day)
 *  within an already-resolved range — used for the handoff strip markers
 *  and for generating exchange notifications. */
export function findExchanges(resolved: ResolvedDay[]): { date: string; from: ParentId; to: ParentId }[] {
  const exchanges: { date: string; from: ParentId; to: ParentId }[] = [];
  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i].parentId !== resolved[i - 1].parentId) {
      exchanges.push({ date: resolved[i].date, from: resolved[i - 1].parentId, to: resolved[i].parentId });
    }
  }
  return exchanges;
}

/** Common rotation presets — a starting point, not an exhaustive list.
 *  Any custom cycle array works with resolveBase/resolveRange directly. */
export const PRESET_ROTATIONS: Record<string, (a: ParentId, b: ParentId) => ParentId[]> = {
  "2-2-3": (a, b) => [a, a, b, b, a, a, a, b, b, a, a, b, b, b],
  "2-2-5-5": (a, b) => [a, a, b, b, a, a, a, a, a, b, b, a, b, b, b, b, b, b],
  "alternating-weeks": (a, b) => [...Array(7).fill(a), ...Array(7).fill(b)],
  "every-other-weekend": (a, b) => [
    ...Array(5).fill(a),
    b,
    b,
    ...Array(5).fill(a),
    ...Array(2).fill(a), // second weekend stays with A in this base preset
  ],
};
