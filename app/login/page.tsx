import { ChefHat } from "lucide-react";
import { Banner, Card, Input, SubmitButton } from "../../components/ui";
import { signIn, signUp } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <ChefHat className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold text-ink">Kitchen Dashboard</h1>
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
