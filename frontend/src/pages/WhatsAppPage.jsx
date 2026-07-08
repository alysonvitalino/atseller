import { useWhatsApp } from '../hooks/useWhatsApp';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  connected: {
    label: 'Conectado',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
    pulse: true,
  },
  connecting: {
    label: 'Conectando...',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
    dot: 'bg-yellow-500',
    pulse: true,
  },
  disconnected: {
    label: 'Desconectado',
    color: 'text-neutral-600',
    bg: 'bg-neutral-100 border-neutral-200',
    dot: 'bg-neutral-400',
    pulse: false,
  },
  error: {
    label: 'Erro de conexão',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
    pulse: false,
  },
};

export default function WhatsAppPage() {
  const { connection, qrCode, loading, actionLoading, connect, disconnect, reconnect } = useWhatsApp();

  const status = connection?.status || 'disconnected';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;

  async function handleConnect() {
    try {
      await connect();
      toast.success('Iniciando conexão... Escaneie o QR Code.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao iniciar conexão.');
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect();
      toast.success('WhatsApp desconectado.');
    } catch {
      toast.error('Erro ao desconectar.');
    }
  }

  async function handleReconnect() {
    try {
      await reconnect();
      toast.success('Reconectando... Escaneie o QR Code.');
    } catch {
      toast.error('Erro ao reconectar.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Integração WhatsApp</h1>
        <p className="text-sm text-neutral-500 mt-1">Conecte seu número para receber e enviar mensagens automaticamente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* painel principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* status card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-neutral-900">Status da Conexão</h2>
              <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium', config.bg, config.color)}>
                <span className={clsx('w-2 h-2 rounded-full', config.dot, config.pulse && 'animate-pulse')} />
                {config.label}
              </div>
            </div>

            {/* QR Code */}
            {status === 'connecting' && (
              <div className="flex flex-col items-center py-6">
                <p className="text-sm text-neutral-600 mb-4 text-center">
                  Abra o WhatsApp no seu celular →{' '}
                  <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong>
                </p>
                <div className="relative">
                  {qrCode ? (
                    <div className="p-3 bg-white border-2 border-neutral-200 rounded-xl shadow-sm">
                      <img
                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                        alt="QR Code WhatsApp"
                        className="w-56 h-56"
                      />
                    </div>
                  ) : (
                    <div className="w-56 h-56 bg-neutral-100 rounded-xl flex items-center justify-center border-2 border-dashed border-neutral-300">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-neutral-500">Gerando QR Code...</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-3">O QR Code é atualizado automaticamente a cada 30 segundos</p>
              </div>
            )}

            {/* conectado */}
            {status === 'connected' && (
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <WhatsAppIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    {connection?.phone ? `+${connection.phone}` : 'Número conectado'}
                  </p>
                  <p className="text-xs text-green-700">
                    {connection?.connected_at
                      ? `Conectado em ${new Date(connection.connected_at).toLocaleString('pt-BR')}`
                      : 'WhatsApp ativo e recebendo mensagens'}
                  </p>
                </div>
              </div>
            )}

            {/* desconectado */}
            {status === 'disconnected' && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <WhatsAppIcon className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700 mb-1">WhatsApp não conectado</p>
                <p className="text-xs text-neutral-400 mb-6">Conecte seu número para começar a receber mensagens dos clientes</p>
              </div>
            )}

            {/* erro */}
            {status === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-sm font-medium text-red-700 mb-1">Falha na conexão</p>
                <p className="text-xs text-red-600">Tente reconectar ou verifique sua conexão com a internet.</p>
              </div>
            )}

            {/* ações */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-100">
              {status === 'disconnected' || status === 'error' ? (
                <Button onClick={handleConnect} loading={actionLoading} className="flex-1">
                  <WhatsAppIcon className="w-4 h-4" />
                  Conectar WhatsApp
                </Button>
              ) : status === 'connecting' ? (
                <Button variant="secondary" onClick={handleDisconnect} loading={actionLoading} className="flex-1">
                  Cancelar
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleReconnect} loading={actionLoading}>
                    Reconectar
                  </Button>
                  <Button variant="danger" onClick={handleDisconnect} loading={actionLoading}>
                    Desconectar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* instruções */}
          {(status === 'disconnected' || status === 'connecting') && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="text-sm font-semibold text-neutral-800 mb-4">Como conectar</h3>
              <ol className="space-y-3">
                {[
                  'Clique em "Conectar WhatsApp" acima',
                  'Abra o WhatsApp no seu celular',
                  'Toque em Menu (⋮) → Dispositivos conectados → Conectar dispositivo',
                  'Aponte a câmera para o QR Code exibido acima',
                  'Aguarde a confirmação de conexão',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-neutral-600">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* painel de monitoramento */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-800 mb-4">Monitoramento</h3>
            <div className="space-y-4">
              <MonitorItem
                label="Número conectado"
                value={connection?.phone ? `+${connection.phone}` : '—'}
              />
              <MonitorItem
                label="Último heartbeat"
                value={connection?.last_heartbeat
                  ? new Date(connection.last_heartbeat).toLocaleTimeString('pt-BR')
                  : '—'}
              />
              <MonitorItem
                label="Mensagens recebidas"
                value={connection?.stats?.messages_received ?? 0}
              />
              <MonitorItem
                label="Mensagens enviadas"
                value={connection?.stats?.messages_sent ?? 0}
              />
              <MonitorItem
                label="Instância"
                value={connection?.instance_name
                  ? <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{connection.instance_name}</code>
                  : '—'}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3">Dicas</h3>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li className="flex gap-2">
                <span className="text-yellow-500">⚠</span>
                Mantenha o celular conectado à internet para a sessão permanecer ativa.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">ℹ</span>
                O número conectado continua recebendo mensagens normalmente no app do celular.
              </li>
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                Em caso de desconexão, use "Reconectar" para gerar um novo QR Code.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonitorItem({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-xs font-medium text-neutral-800">{value}</span>
    </div>
  );
}

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
