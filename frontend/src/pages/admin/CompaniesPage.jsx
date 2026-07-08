import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const statusBadge = {
  active: <Badge variant="green">Ativa</Badge>,
  blocked: <Badge variant="red">Bloqueada</Badge>,
  suspended: <Badge variant="yellow">Suspensa</Badge>,
};

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/companies', { params: { search } });
      setCompanies(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar empresas.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function handleSetStatus(company, newStatus) {
    try {
      await adminApi.patch(`/companies/${company.id}/status`, { status: newStatus });
      toast.success(`Empresa ${newStatus === 'active' ? 'reativada' : 'bloqueada'}.`);
      fetchCompanies();
    } catch {
      toast.error('Erro ao alterar status.');
    }
  }

  function openCreate() { setEditTarget(null); setModalOpen(true); }
  function openEdit(company) { setEditTarget(company); setModalOpen(true); }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Empresas</h1>
          <p className="text-sm text-neutral-500 mt-1">{total} empresa{total !== 1 ? 's' : ''} cadastrada{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova empresa
        </Button>
      </div>

      {/* busca */}
      <div className="mb-4">
        <Input
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* tabela */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            title="Nenhuma empresa encontrada"
            description="Crie a primeira empresa da plataforma."
            action={<Button size="sm" onClick={openCreate}>Criar empresa</Button>}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Empresa</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Slug</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Usuários</th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide px-4 py-3">Criada em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-sm font-bold text-red-700">
                        {company.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">{company.slug}</code>
                  </td>
                  <td className="px-4 py-3">{statusBadge[company.status]}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/companies/${company.id}/users`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {company.user_count} usuário{company.user_count !== '1' ? 's' : ''}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {new Date(company.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(company)}
                        className="text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
                      >
                        Editar
                      </button>
                      {company.status === 'active' ? (
                        <button
                          onClick={() => handleSetStatus(company, 'blocked')}
                          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Bloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetStatus(company, 'active')}
                          className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CompanyModal
        open={modalOpen}
        company={editTarget}
        onClose={() => setModalOpen(false)}
        onSave={() => { setModalOpen(false); fetchCompanies(); }}
      />
    </div>
  );
}

function CompanyModal({ open, company, onClose, onSave }) {
  const isEdit = !!company;
  const [form, setForm] = useState({ name: '', slug: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) setForm({ name: company?.name || '', slug: company?.slug || '' });
    setErrors({});
  }, [open, company]);

  function autoSlug(name) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function handleNameChange(e) {
    const name = e.target.value;
    setForm((f) => ({ name, slug: isEdit ? f.slug : autoSlug(name) }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório.';
    if (!form.slug.trim()) e.slug = 'Slug é obrigatório.';
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Apenas letras minúsculas, números e hífens.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await adminApi.put(`/companies/${company.id}`, form);
        toast.success('Empresa atualizada.');
      } else {
        await adminApi.post('/companies', form);
        toast.success('Empresa criada com sucesso!');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar empresa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar empresa' : 'Nova empresa'} size="sm">
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        <Input
          label="Nome da empresa"
          placeholder="Ex: Vision Motors"
          value={form.name}
          onChange={handleNameChange}
          error={errors.name}
        />
        <Input
          label="Slug (identificador único)"
          placeholder="ex: vision-motors"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          error={errors.slug}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'Salvar' : 'Criar empresa'}</Button>
        </div>
      </form>
    </Modal>
  );
}
