export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Visão geral das operações em tempo real</p>
      </div>

      {/* placeholder até a Fase 8 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {['Conversas ativas', 'Leads hoje', 'Leads qualificados', 'Vendas realizadas'].map((label) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-5">
            <p className="text-sm text-neutral-500 mb-2">{label}</p>
            <div className="h-7 w-16 bg-neutral-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-700">Métricas disponíveis na Fase 8</p>
          <p className="text-xs text-neutral-400 mt-1">Configure agentes e conecte o WhatsApp para ver dados reais</p>
        </div>
      </div>
    </div>
  );
}
