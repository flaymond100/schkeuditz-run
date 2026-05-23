import { Link, useSearchParams } from 'react-router-dom';

export function RegistrationSuccessPage() {
  const [searchParams] = useSearchParams();
  const raceId = searchParams.get('raceId');

  return (
    <section className="page-shell">
      <div className="surface-panel p-8 text-center sm:p-12">
        <span className="eyebrow">Registration</span>
        <h1 className="mt-5 font-heading text-4xl font-semibold text-(--text-primary-dark) sm:text-5xl">
          You're registered!
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-(--text-secondary-dark)">
          Payment confirmed. Your spot is secured. You'll receive a confirmation
          email shortly.
        </p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          {raceId ? (
            <Link
              className="cta-button w-full justify-center"
              to={`/calendar/${raceId}`}
            >
              Back to the race
            </Link>
          ) : (
            <Link className="cta-button w-full justify-center" to="/calendar">
              Back to races
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
