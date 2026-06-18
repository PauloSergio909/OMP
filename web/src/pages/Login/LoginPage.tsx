// ══════════════════════════════════════════════════════════════
// LOGIN PAGE — Tela de autenticação
// ══════════════════════════════════════════════════════════════
// Usa React Hook Form para gerenciar o formulário e Zod para validação.
// React Hook Form: controla inputs sem re-render desnecessário.
// zodResolver: conecta a validação Zod ao formulário automaticamente.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@shared/validations';
import { useAuthStore } from '../../stores/auth.store';
import { Truck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// O tipo do formulário é inferido automaticamente do schema Zod
type LoginForm = { email: string; senha: string };

export function LoginPage() {
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  // useForm gerencia o estado do formulário inteiro
  // register: conecta um input ao form
  // handleSubmit: valida antes de chamar onSubmit
  // formState.errors: erros de validação por campo
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema), // Conecta Zod como validador
    defaultValues: { email: '', senha: '' },
  });

  // Chamado quando o form é válido
  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.senha);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao fazer login';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── LADO ESQUERDO: Branding ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-fleet-primary relative overflow-hidden items-center justify-center">
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-fleet-accent/10" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-fleet-info/10" />

        <div className="relative z-10 text-center px-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fleet-accent to-amber-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-fleet-accent/30">
            <Truck size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">FleetMaster Pro</h1>
          <p className="text-white/50 text-lg leading-relaxed max-w-md">
            Sistema integrado de gestão de materiais, controle de estoque e manutenção de frota
          </p>

          {/* Stats decorativos */}
          <div className="flex gap-8 mt-12 justify-center">
            {[
              { value: '99.8%', label: 'Uptime' },
              { value: '2.5k+', label: 'OS/mês' },
              { value: '150+', label: 'Veículos' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-fleet-accent text-2xl font-bold">{stat.value}</div>
                <div className="text-white/30 text-xs uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── LADO DIREITO: Formulário ─── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fleet-accent to-amber-400 flex items-center justify-center">
              <Truck size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-fleet-primary">FleetMaster</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h2>
          <p className="text-gray-500 text-sm mb-8">Entre com suas credenciais para acessar o sistema</p>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Campo Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')} // register conecta este input ao form
                type="email"
                placeholder="seu@email.com.br"
                className={`
                  w-full px-4 py-3 rounded-xl border text-sm transition
                  focus:outline-none focus:ring-2
                  ${errors.email
                    ? 'border-fleet-danger focus:ring-fleet-danger/30'
                    : 'border-gray-200 focus:ring-fleet-info/30 focus:border-fleet-info'
                  }
                `}
              />
              {/* Mensagem de erro (aparece se Zod rejeitar) */}
              {errors.email && (
                <p className="mt-1.5 text-xs text-fleet-danger flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  {...register('senha')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  className={`
                    w-full px-4 py-3 pr-12 rounded-xl border text-sm transition
                    focus:outline-none focus:ring-2
                    ${errors.senha
                      ? 'border-fleet-danger focus:ring-fleet-danger/30'
                      : 'border-gray-200 focus:ring-fleet-info/30 focus:border-fleet-info'
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.senha && (
                <p className="mt-1.5 text-xs text-fleet-danger flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.senha.message}
                </p>
              )}
            </div>

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-fleet-primary text-white rounded-xl font-semibold text-sm hover:bg-fleet-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar no sistema'
              )}
            </button>
          </form>

          {/* Credenciais de teste */}
          <div className="mt-6 p-4 rounded-xl bg-fleet-info/5 border border-fleet-info/20">
            <p className="text-xs font-medium text-fleet-info mb-1">Credenciais de teste:</p>
            <p className="text-xs text-gray-500">admin@fleetmaster.com.br / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
