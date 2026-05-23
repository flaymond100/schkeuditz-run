import { Link } from 'react-router-dom';

type SectionIntroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
};

export function SectionIntro({
  eyebrow,
  title,
  description,
  actionLabel,
  actionTo,
}: SectionIntroProps) {
  return (
    <div className="section-intro flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="mt-4 font-heading text-3xl font-semibold text-(--text-primary-dark) sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-base leading-7 text-(--text-secondary-dark)">
            {description}
          </p>
        )}
      </div>

      {actionLabel && actionTo ? (
        <Link
          className="ghost-button w-full justify-center md:w-auto"
          to={actionTo}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
