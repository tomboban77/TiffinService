import { signIn, signUp } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-xl font-semibold">Kitchen Dashboard</h1>

      {searchParams.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p>
      )}

      <form className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input name="email" type="email" required className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input name="password" type="password" required minLength={6} className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <div className="flex gap-2 pt-2">
          <button formAction={signIn} className="flex-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
            Log in
          </button>
          <button formAction={signUp} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium">
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
