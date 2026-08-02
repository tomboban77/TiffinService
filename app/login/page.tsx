import { Banner, Card, Input, KettleMark, SubmitButton } from "../../components/ui";
import { signIn, signUp } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-kettle-hero px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent-100 bg-white text-accent-700 shadow-glow">
            <KettleMark className="h-7 w-7" />
          </span>
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Kettle</h1>
            <p className="mt-1 text-sm text-ink-muted">Your kitchen, running like clockwork.</p>
          </div>
        </div>

        {searchParams.error && <Banner variant="error">{searchParams.error}</Banner>}

        <Card className="w-full">
          <form className="flex flex-col gap-4">
            <Input label="Email" name="email" type="email" autoComplete="email" required />
            <Input label="Password" name="password" type="password" autoComplete="current-password" required minLength={6} />
            <div className="flex gap-2 pt-1">
              <SubmitButton formAction={signIn} className="flex-1">
                Log in
              </SubmitButton>
              <SubmitButton formAction={signUp} variant="secondary" className="flex-1">
                Sign up
              </SubmitButton>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
