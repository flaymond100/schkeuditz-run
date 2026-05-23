import { Link } from 'react-router-dom';

const legalLinks = [
  { label: 'Impressum', to: '/imprint' },
  { label: 'Datenschutz', to: '/privacy' },
];

export function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--primary-dark)', color: '#dcfce7' }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-3">
            <span className="font-heading text-2xl font-bold text-white">Schkeuditz Run</span>
            <p className="text-sm" style={{ color: '#86efac' }}>
              Laufevent in Schkeuditz. Für alle — Anfänger bis Profis.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#4ade80' }}>
              Rechtliches
            </h3>
            <ul className="space-y-2 text-sm">
              {legalLinks.map(link => (
                <li key={link.to}>
                  <Link
                    className="transition hover:text-white"
                    style={{ color: '#86efac' }}
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="border-t pt-6 flex items-center justify-between text-xs"
          style={{ borderColor: 'rgba(134,239,172,0.2)', color: '#4ade80' }}
        >
          <span>Schkeuditz Run &copy; {new Date().getFullYear()}</span>
          <Link
            className="transition hover:text-white"
            style={{ color: '#4ade80' }}
            to="/login"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
