import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return toast.error('Informe o e-mail.');
    setLoading(true);
    try {
      await api.post('/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-neutral-900 tracking-tight">ATSeller</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">E-mail enviado</h2>
              <p className="text-sm text-neutral-500 mb-6">
                Se o e-mail existir na plataforma, você receberá as instruções para redefinir sua senha.
              </p>
              <Link to="/login" className="text-sm text-red-600 hover:text-red-700 font-medium">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-neutral-900 mb-1">Recuperar senha</h1>
              <p className="text-sm text-neutral-500 mb-6">
                Informe seu e-mail e enviaremos um link para redefinir a senha.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Button type="submit" loading={loading} className="w-full">
                  Enviar instruções
                </Button>
              </form>
              <div className="text-center mt-4">
                <Link to="/login" className="text-sm text-neutral-500 hover:text-neutral-700">
                  Voltar para o login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
