import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { http } from '../lib/api';

const PERIODS = [
  { label: 'Hoje', days: 1 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
];

const PIE_COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#64748b'];

function formatDay(iso) {
  if (!iso) return '';
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function delta(value) {
  if (value === 0) return null;
  return value > 0 ? `+${value}` : `${value}`;
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined || value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? '▲' : '▼'} {Math.abs(value)} vs. ontem
    </span>
  );
}

// ——— Card de resumo
function MetricCard({ label, value, sub, deltaValue, icon, loading }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="h-8 w-20 bg-neutral-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-neutral-900 mt-1">{value ?? '—'}</p>
          )}
          {!loading && (
            <div className="mt-1.5 space-y-0.5">
              {sub && <p className="text-xs text-neutral-400">{sub}</p>}
              <DeltaBadge value={deltaValue} />
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 ml-3">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ——— Seção de gráfico
function ChartCard({ title, loading, children }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <h3 className="text-sm font-semibold text-neutral-700 mb-4">{title}</h3>
      {loading ? (
        <div className="h-48 bg-neutral-50 rounded-lg animate-pulse" />
      ) : (
        <div className="h-48">{children}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(PERIODS[2]); // 30 dias por padrão
  const [summary, setSummary] = useState(null);
  const [leadsPerDay, setLeadsPerDay] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [messagesVolume, setMessagesVolume] = useState([]);
  const [agentDist, setAgentDist] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const timerRef = useRef(null);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await http.get('/metrics/summary');
      setSummary(data);
    } catch {
      // silencioso
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchCharts = useCallback(async (days) => {
    setLoadingCharts(true);
    try {
      const [lpd, conv, msg, agent] = await Promise.all([
        http.get('/metrics/leads-per-day', { params: { days } }),
        http.get('/metrics/conversions', { params: { days } }),
        http.get('/metrics/messages-volume', { params: { days } }),
        http.get('/metrics/agent-distribution'),
      ]);
      setLeadsPerDay(lpd.data);
      setConversions(conv.data);
      setMessagesVolume(msg.data);
      setAgentDist(agent.data);
    } catch {
      // silencioso
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  // carregamento inicial + auto-refresh a cada 60s
  useEffect(() => {
    fetchSummary();
    fetchCharts(period.days);

    timerRef.current = setInterval(() => {
      fetchSummary();
    }, 60_000);

    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // refetch gráficos ao trocar período
  useEffect(() => {
    fetchCharts(period.days);
  }, [period, fetchCharts]);

  // filtra dados por período selecionado
  const lpd = period.days === 1 ? leadsPerDay.slice(-1) : leadsPerDay.slice(-period.days);
  const conv = period.days === 1 ? conversions.slice(-1) : conversions.slice(-period.days);
  const msgVol = period.days === 1 ? messagesVolume.slice(-1) : messagesVolume.slice(-period.days);

  const cards = [
    {
      label: 'Conversas ativas',
      value: summary?.conversas_ativas,
      icon: <ChatIcon />,
    },
    {
      label: 'Leads hoje',
      value: summary?.leads_hoje,
      deltaValue: summary?.leads_hoje_delta,
      icon: <LeadIcon />,
    },
    {
      label: 'Em qualificação',
      value: summary?.leads_qualificados,
      sub: `${summary?.total_leads ?? 0} leads no total`,
      icon: <QualifyIcon />,
    },
    {
      label: 'Vendas hoje',
      value: summary?.vendas_hoje,
      deltaValue: summary?.vendas_hoje_delta,
      icon: <SaleIcon />,
    },
    {
      label: 'Taxa de conversão',
      value: summary?.taxa_conversao != null ? `${summary.taxa_conversao}%` : null,
      sub: 'Leads → venda concluída',
      icon: <RateIcon />,
    },
    {
      label: 'Com operador humano',
      value: summary?.atendimentos_humanos,
      icon: <HumanIcon />,
    },
    {
      label: 'Total de mensagens',
      value: summary?.total_mensagens,
      sub: `${summary?.mensagens_ontem ?? 0} ontem`,
      icon: <MsgIcon />,
    },
    {
      label: 'Agentes ativos',
      value: summary?.agentes_ativos,
      icon: <BotIcon />,
    },
  ];

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Visão geral das operações · atualiza a cada 60s</p>
        </div>

        {/* seletor de período */}
        <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriod(p)}
              className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                period.days === p.days
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <MetricCard key={c.label} {...c} loading={loadingSummary} />
        ))}
      </div>

      {/* gráficos — linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Leads por dia" loading={loadingCharts}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lpd} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, 'Leads']}
                labelFormatter={(l) => formatDay(l)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="total" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vendas concluídas por dia" loading={loadingCharts}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={conv} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, 'Vendas']}
                labelFormatter={(l) => formatDay(l)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="vendas"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* gráficos — linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Volume de mensagens" loading={loadingCharts}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={msgVol} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRecebidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEnviadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(l) => formatDay(l)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="recebidas" name="Recebidas" stroke="#3b82f6" strokeWidth={2} fill="url(#gradRecebidas)" dot={false} />
              <Area type="monotone" dataKey="enviadas" name="Enviadas" stroke="#dc2626" strokeWidth={2} fill="url(#gradEnviadas)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição por agente" loading={loadingCharts}>
          {agentDist.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-neutral-400">
              Nenhuma conversa com agente atribuído
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agentDist}
                  dataKey="conversas"
                  nameKey="agent"
                  cx="40%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={35}
                >
                  {agentDist.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [v, n]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ícones inline
function ChatIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function LeadIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function QualifyIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function SaleIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function RateIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function HumanIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function MsgIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function BotIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
    </svg>
  );
}
