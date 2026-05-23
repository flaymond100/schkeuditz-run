import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function readRedirectPath(state: unknown): string {
  if (
    state &&
    typeof state === 'object' &&
    'from' in state &&
    (state as { from?: { pathname?: unknown } }).from &&
    typeof (state as { from: { pathname?: unknown } }).from.pathname ===
      'string'
  ) {
    return (state as { from: { pathname: string } }).from.pathname;
  }

  return '/';
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const redirectPath = readRedirectPath(location.state);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
      }

      setIsLoggedIn(Boolean(data.session));
      setIsCheckingSession(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    navigate(redirectPath, { replace: true });
  }

  async function handleSignOut() {
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
  }

  return (
    <section className="page-shell">
      <div className="surface-panel mx-auto w-full max-w-xl p-6 sm:p-8">
        <span className="eyebrow">Authentication</span>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
          Login
        </h1>
        <p className="mt-4 text-base leading-7 text-(--text-secondary-dark)">
          Sign in with your email and password.
        </p>

        {isCheckingSession ? (
          <p className="mt-6 text-sm text-(--text-secondary-dark)">
            Checking session...
          </p>
        ) : isLoggedIn ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              You are logged in.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="cta-button justify-center" to={redirectPath}>
                Continue
              </Link>
              <button
                className="ghost-button justify-center"
                onClick={handleSignOut}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm text-(--text-secondary-dark)">
              Email
              <input
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                onChange={event => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block text-sm text-(--text-secondary-dark)">
              Password
              <input
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-(--text-primary-dark) outline-none transition focus:border-(--accent-secondary)"
                minLength={6}
                onChange={event => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            <button
              className="cta-button w-full justify-center"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {message ? (
          <p className="mt-4 rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
