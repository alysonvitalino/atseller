import { clsx } from 'clsx';

export function Select({ label, error, className, children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-neutral-700">{label}</label>}
      <select
        className={clsx(
          'w-full px-3 py-2.5 rounded-lg border text-sm text-neutral-900 bg-white transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent',
          error ? 'border-red-400 bg-red-50' : 'border-neutral-300 hover:border-neutral-400',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
