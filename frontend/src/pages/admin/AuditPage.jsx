import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const actionColor = {
  login: 'green',
  logout: 'gray',
  'company.create': 'blue',
  'company.update': 'blue',
  'company.blocked': 'red',
  'company.active': 'green',
  'user.create': 'blue',
  'user.update': 'blue',
  'admin.impersonate': 'yellow',
};

function actionLabel(action) {
  const labels = {
    login: 'Login',
    logout: 'Logout',
    'company.create': 'Empresa criada',
    'company.update': 'Empresa editada',
    'company.blocked': 'Empresa bloqueada',
    'company.active': 'Empresa reativada',
    'user.create': 'Usuário criado',
    'user.update': 'Usuário editado',
    'admin.impersonate': 'Impersonation',
  };
  return labels[action] || action;
}

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/audit', { params: { action: search, page, limit } });
      setLogs(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar auditoria.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Auditoria</h1>
        <p className="text-sm text-neutral-500 mt-1">{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Filtrar por ação (ex: login, user.create)..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" description="Os eventos auditados aparecerão aqui." />
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Ação</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Usuário</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Empresa</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">IP</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant={actionColor[log.action] || 'gray'}>
                        {actionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {log.user_name ? (
                        <div>
                          <p className="text-sm font-medium text-neutral-800">{log.user_name}</p>
                          <p className="text-xs text-neutral-400">{log.user_email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{log.company_name || '—'}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-neutral-500">{log.ip_address || '—'}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-sm px-3 py-1 rounded border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-sm px-3 py-1 rounded border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
