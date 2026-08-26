import { redirect } from "next/navigation";
import { getMembership } from "@/lib/family";
import { memberMaps, type Member } from "@/lib/schedule-data";
import { signout } from "../login/actions";
import {
  updateExchangeTime,
  createVacation,
  deleteVacation,
  createHoliday,
  deleteHoliday,
} from "./actions";

export const dynamic = "force-dynamic";

type VacationRow = {
  id: string;
  parent_id: string;
  label: string | null;
  start_date: string;
  end_date: string;
};
type HolidayRow = {
  id: string;
  label: string;
  start_month_day: string;
  end_month_day: string;
  parent_even_years: string;
  parent_odd_years: string;
};

const inputCls =
  "rounded-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint";
const labelCls = "font-mono text-[10.5px] uppercase tracking-wider text-ink-faint";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
function fmtMonthDay(md: string) {
  return new Date("2000-" + md + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function RulesPage() {
  const m = await getMembership();
  if (!m) redirect("/login");

  const header = (
    <div className="flex items-baseline justify-between mb-5">
      <h1 className="font-display text-xl font-semibold">Keel</h1>
      <form action={signout}>
        <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-ink">
          Sign out
        </button>
      </form>
    </div>
  );

  if (!m.member) {
    return (
      <main className="mx-auto max-w-md px-5 pt-8 pb-24">
        {header}
        <p className="text-sm text-ink-soft">
          Your account isn&apos;t linked to a family yet.
        </p>
      </main>
    );
  }

  const familyId = m.member.family_id;
  const [membersRes, vacationsRes, holidaysRes, familyRes] = await Promise.all([
    m.supabase
      .from("family_members")
      .select("id, display_name, color")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    m.supabase
      .from("vacations")
      .select("id, parent_id, label, start_date, end_date")
      .eq("family_id", familyId)
      .order("start_date", { ascending: true }),
    m.supabase
      .from("holiday_rules")
      .select("id, label, start_month_day, end_month_day, parent_even_years, parent_odd_years")
      .eq("family_id", familyId)
      .order("start_month_day", { ascending: true }),
    m.supabase.from("families").select("exchange_time").eq("id", familyId).maybeSingle(),
  ]);

  const members = (membersRes.data ?? []) as Member[];
  const vacations = (vacationsRes.data ?? []) as VacationRow[];
  const holidays = (holidaysRes.data ?? []) as HolidayRow[];
  const exchangeTime = (
    (familyRes.data as { exchange_time?: string } | null)?.exchange_time ?? "17:00"
  ).slice(0, 5);
  const { labelFor } = memberMaps(members);

  const parentOptions = members.map((mm) => (
    <option key={mm.id} value={mm.id}>
      {mm.display_name}
    </option>
  ));

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-24">
      {header}

      {/* Exchange time */}
      <section className="mb-8">
        <h2 className="font-display text-lg mb-3">Exchange time</h2>
        <form
          action={updateExchangeTime}
          className="rounded-card border border-line bg-card shadow-sm p-4 flex items-end gap-3"
        >
          <label className="flex flex-col gap-1 flex-1">
            <span className={labelCls}>Handoff time</span>
            <input
              type="time"
              name="exchange_time"
              defaultValue={exchangeTime}
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            className="rounded-sm bg-ink text-white font-display text-sm px-4 py-2 hover:opacity-90"
          >
            Save
          </button>
        </form>
      </section>

      {/* Vacations */}
      <section className="mb-8">
        <h2 className="font-display text-lg mb-3">Vacations</h2>

        <form
          action={createVacation}
          className="rounded-card border border-line bg-card shadow-sm p-4 flex flex-col gap-3 mb-3"
        >
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Parent</span>
            <select name="parent_id" className={inputCls} defaultValue={members[0]?.id}>
              {parentOptions}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>From</span>
              <input type="date" name="start_date" required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>To</span>
              <input type="date" name="end_date" required className={inputCls} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Label (optional)</span>
            <input name="label" placeholder="e.g. Summer trip" className={inputCls} />
          </label>
          <button
            type="submit"
            className="rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
          >
            Add vacation
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {vacations.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-sm border border-line bg-card px-3.5 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">
                  {labelFor(v.parent_id)}
                  {v.label ? ` · ${v.label}` : ""}
                </div>
                <div className="text-[11.5px] text-ink-faint">
                  {fmtDate(v.start_date)} – {fmtDate(v.end_date)}
                </div>
              </div>
              <form action={deleteVacation}>
                <input type="hidden" name="id" value={v.id} />
                <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-danger">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* Holidays */}
      <section>
        <h2 className="font-display text-lg mb-1">Holidays</h2>
        <p className="text-[11.5px] text-ink-soft mb-3">
          Alternates by year. Pick any dates — only the month &amp; day are used.
          Cross-New-Year holidays need two rules.
        </p>

        <form
          action={createHoliday}
          className="rounded-card border border-line bg-card shadow-sm p-4 flex flex-col gap-3 mb-3"
        >
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Name</span>
            <input name="label" required placeholder="e.g. Thanksgiving" className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>From (mo/day)</span>
              <input type="date" name="start_date" required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>To (mo/day)</span>
              <input type="date" name="end_date" required className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Even years</span>
              <select name="parent_even_years" className={inputCls} defaultValue={members[0]?.id}>
                {parentOptions}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Odd years</span>
              <select name="parent_odd_years" className={inputCls} defaultValue={members[1]?.id}>
                {parentOptions}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
          >
            Add holiday
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {holidays.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-sm border border-line bg-card px-3.5 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{h.label}</div>
                <div className="text-[11.5px] text-ink-faint">
                  {fmtMonthDay(h.start_month_day)} – {fmtMonthDay(h.end_month_day)} · even:{" "}
                  {labelFor(h.parent_even_years)}, odd: {labelFor(h.parent_odd_years)}
                </div>
              </div>
              <form action={deleteHoliday}>
                <input type="hidden" name="id" value={h.id} />
                <button className="font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-danger">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
