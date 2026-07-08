import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, http } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const roleBadge = {
  gestor: <Badge variant="blue">Gestor</Badge>,
  operador: <Badge variant="gray">Operador</Badge>,
};

const statusBadge = {
  active: <Badge variant="green">Ativo</Badge>,
  inactive: <Badge variant="gray">Inativo</Badge>,
};

export default function UsersPage({ companyId: propCompanyId }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'platform_admin';
  const companyId = propCompanyId || (isAdmin ? null : user?.companyId);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const client = isAdmin ? adminApi : http;
      const url = isAdmin && companyId ? `/companies/${companyId}/users` : '/users';
      const { data } = await client.get(url, { params: { search, status: '' } });
      setUsers(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, [search, isAdmin, companyId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleToggleStatus(u) {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      const client = isAdmin ? adminApi : http;
      await client.put(`/${isAdmin ? 'companies/' + companyId + '/users/' : 'users/'}${u.id}`.replace('/users//', '/users/'), { status: newStatus });
      // caminho simplificado
      await http.put(`/users/${u.id}`, { status: newStatus });
      toast.success(`Usuário ${newStatus === 'active' ? 'reativado' : 'desativado'}.`);
      fetchUsers();
    } catch {
      toast.error('Erro ao alterar status.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Usuários</h1>
          <p className="text-sm text-neutral-500 mt-1">{total} usuário{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo usuário
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Adicione o primeiro usuário da empresa."
            action={<Button size="sm" onClick={() => { setEditTarget(null); setModalOpen(true); }}>Criar usuário</Button>}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">E-mail</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Perfil</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Último acesso</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-semibold text-neutral-600">
                        {u.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{u.email}</td>
                  <td className="px-4 py-3">{roleBadge[u.role] || <Badge>{u.role}</Badge>}</td>
                  <td className="px-4 py-3">{statusBadge[u.status]}</td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setEditTarget(u); setModalOpen(true); }}
                        className="text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        Senha
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${u.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {u.status === 'active' ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserModal
        open={modalOpen}
        user={editTarget}
        companyId={companyId}
        isAdmin={isAdmin}
        onClose={() => setModalOpen(false)}
        onSave={() => { setModalOpen(false); fetchUsers(); }}
      />

      <ResetPasswordModal
        open={!!resetTarget}
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onSave={() => setResetTarget(null)}
      />
    </div>
  );
}

function UserModal({ open, user, companyId, isAdmin, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operador' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) setForm({ name: user?.name || '', email: user?.email || '', password: '', role: user?.role || 'operador' });
    setErrors({});
  }, [open, user]);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório.';
    if (!form.email.trim()) e.email = 'E-mail é obrigatório.';
    if (!isEdit && form.password.length < 8) e.password = 'Mínimo 8 caracteres.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, company_id: companyId };
      if (isEdit) {
        await http.put(`/users/${user.id}`, payload);
        toast.success('Usuário atualizado.');
      } else {
        await http.post('/users', payload);
        toast.success('Usuário criado com sucesso!');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar usuário.');
    } finally {
      setLoading(false);
    }
  }

  const availableRoles = isAdmin ? ['gestor', 'operador'] : ['operador'];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar usuário' : 'Novo usuário'} size="sm">
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        <Input label="Nome completo" placeholder="João Silva" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="E-mail" type="email" placeholder="joao@empresa.com" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        {!isEdit && (
          <Input label="Senha" type="password" placeholder="Mínimo 8 caracteres" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        )}
        <Select label="Perfil de acesso" value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {r === 'gestor' ? 'Gestor' : 'Operador'}
            </option>
          ))}
        </Select>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'Salvar' : 'Criar usuário'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ open, user, onClose, onSave }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setPassword(''); }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Mínimo 8 caracteres.');
    setLoading(true);
    try {
      await http.patch(`/users/${user.id}/reset-password`, { password });
      toast.success('Senha redefinida com sucesso.');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Redefinir senha — ${user?.name}`} size="sm">
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        <Input label="Nova senha" type="password" placeholder="Mínimo 8 caracteres"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1">Redefinir senha</Button>
        </div>
      </form>
    </Modal>
  );
}
