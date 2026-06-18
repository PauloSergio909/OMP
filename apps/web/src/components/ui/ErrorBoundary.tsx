import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Algo deu errado</h1>
            <p className="text-sm text-gray-500 mb-1">
              Ocorreu um erro inesperado na aplicação.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400 font-mono bg-red-50 rounded-lg px-3 py-2 mt-3 mb-5 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => { window.location.href = '/'; }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition mx-auto"
            >
              <RefreshCw size={14} /> Voltar ao início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ListErrorBanner() {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
      <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
      <p className="text-sm font-medium text-red-700">Falha ao carregar a lista. Verifique a conexão e tente novamente.</p>
    </div>
  );
}

export function PageErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
        <AlertTriangle size={20} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Erro ao carregar esta seção</p>
        {error?.message && (
          <p className="text-xs text-red-400 font-mono mt-1 max-w-xs break-all">{error.message}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
      >
        <RefreshCw size={12} /> Tentar novamente
      </button>
    </div>
  );
}
