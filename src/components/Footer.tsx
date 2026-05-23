import { Link } from 'react-router-dom';

const secondaryLinks: { label: string; to: string }[] = [
  // { label: 'Training Camp', to: '/training-camp' },
  { label: 'Partners', to: '/partners' },
  { label: 'Contact', to: '/contact' },
  // { label: 'FAQ', to: '/faq' },
];

const legalLinks = [
  { label: 'Imprint', to: '/imprint' },
  { label: 'Privacy', to: '/privacy' },
];

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border-dark)] bg-[color:var(--bg-secondary)]/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-[color:var(--border-dark)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-secondary)]">
              Revolution Crit Series
            </span>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-[color:var(--text-primary-dark)]">
                Making racing more accessible, engaging and rewarding for all
                riders.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-[color:var(--text-secondary-dark)] sm:text-base">
                Critirium races for all levels of racers, from first-timers to
                seasoned pros, with a focus on community, fun and development.
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-heading text-sm uppercase tracking-[0.24em] text-[color:var(--text-primary-dark)]">
              Explore
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary-dark)]">
              {secondaryLinks.length > 0
                ? secondaryLinks.map(link => (
                    <li key={link.to}>
                      <Link className="footer-link" to={link.to}>
                        {link.label}
                      </Link>
                    </li>
                  ))
                : null}
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-sm uppercase tracking-[0.24em] text-[color:var(--text-primary-dark)]">
              Legal
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary-dark)]">
              {legalLinks.map(link => (
                <li key={link.to}>
                  <Link className="footer-link" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[color:var(--border-dark)] pt-6 text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary-dark)] sm:flex-row sm:items-center sm:justify-between">
          <p></p>
          <p>Revolution Crit &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
