import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const navLinks = [
  { label: 'Start', to: '/' },
  { label: 'Anmelden', to: '/register' },
  { label: 'Ergebnisse', to: '/results' },
];

function navLinkClass(isActive: boolean) {
  return [
    'rounded-full px-4 py-2 text-sm font-semibold transition',
    isActive
      ? 'bg-green-100 text-green-800'
      : 'text-green-700 hover:bg-green-50 hover:text-green-900',
  ].join(' ');
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (isMounted) setSession(data.session ?? null);
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
    navigate('/login');
  }

  return (
    <header
      className="sticky top-0 z-50 border-b-2 backdrop-blur-xl"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--header-bg)' }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="Schkeuditz Run home"
          className="font-heading text-xl font-bold"
          style={{ color: 'var(--primary-dark)' }}
        >
          Schkeuditz Run
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              end={link.to === '/'}
              className={({ isActive }) => navLinkClass(isActive)}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {session ? (
            <>
              <Link
                className="rounded-full border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition hover:opacity-90"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                to="/races/new"
              >
                New Race
              </Link>
              <button
                className="rounded-full border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition hover:opacity-70"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
                disabled={isSigningOut}
                onClick={handleSignOut}
                type="button"
              >
                {isSigningOut ? 'Signing out…' : 'Logout'}
              </button>
            </>
          ) : (
            <Link className="btn-primary text-sm" to="/register">
              Jetzt anmelden
            </Link>
          )}
        </div>

        <button
          aria-controls="mobile-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition hover:border-green-400 lg:hidden"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onClick={() => setIsMenuOpen(c => !c)}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d={isMenuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t-2 lg:hidden"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
            <nav aria-label="Mobile primary" className="grid gap-1">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => navLinkClass(isActive)}
                  to={link.to}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t-2 pt-4" style={{ borderColor: 'var(--border)' }}>
              {session ? (
                <div className="flex flex-col gap-2">
                  <Link className="btn-outline text-sm justify-center" to="/races/new">New Race</Link>
                  <button
                    className="btn-outline text-sm justify-center"
                    disabled={isSigningOut}
                    onClick={handleSignOut}
                    type="button"
                  >
                    {isSigningOut ? 'Signing out…' : 'Logout'}
                  </button>
                </div>
              ) : (
                <Link className="btn-primary w-full justify-center" to="/register">
                  Jetzt anmelden
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
