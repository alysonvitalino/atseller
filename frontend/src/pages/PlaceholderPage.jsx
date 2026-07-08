export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-600">Em desenvolvimento</p>
          <p className="text-xs text-neutral-400 mt-1">Esta seção será implementada nas próximas fases</p>
        </div>
      </div>
    </div>
  );
}
