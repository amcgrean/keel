import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-5 min-h-screen flex flex-col justify-center pb-24">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Keel</h1>
        <p className="text-sm text-ink-faint mt-1">
          Who has Patrick, right now.
        </p>
      </div>

      <form action={login} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
            Email
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="rounded-sm border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink-faint"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="rounded-sm border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink-faint"
          />
        </label>

        {error && (
          <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-2 rounded-sm bg-ink text-white font-display text-sm py-2.5 hover:opacity-90"
        >
          Sign in
        </button>
      </form>

      <p className="text-[11.5px] text-ink-faint mt-6 leading-relaxed">
        No sign-up here yet — accounts are created in Supabase (Authentication →
        Add user). Ask Aaron if you need one.
      </p>
    </main>
  );
}
