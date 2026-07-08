import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UsersPage from './UsersPage';

const tabs = [
  { id: 'users', label: 'Usuários' },
  { id: 'company', label: 'Empresa' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Configurações</h1>
        <p className="text-sm text-neutral-500 mt-1">{user?.companyName}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersPage />}
      {activeTab === 'company' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-sm text-neutral-500">
          Configurações de empresa disponíveis em breve.
        </div>
      )}
    </div>
  );
}
