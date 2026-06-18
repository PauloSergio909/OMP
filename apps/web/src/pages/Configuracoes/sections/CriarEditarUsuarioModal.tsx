import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../../components/ui/Modal';
import {
  useCriarUsuario, useAtualizarUsuario, useFuncionarios,
  type UsuarioListItem, type FuncionarioListItem,
} from '../../../hooks/useApi';
import toast from 'react-hot-toast';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const emptyNovo = { nome: '', email: '', senha: '', role: 'visualizador', funcionarioId: '' };

interface Props {
  open: boolean;
  onClose: () => void;
  /** null = modo criação; UsuarioListItem = modo edição */
  editando: UsuarioListItem | null;
}

export function CriarEditarUsuarioModal({ open, onClose, editando }: Props) {
  const [formNovo, setFormNovo] = useState(emptyNovo);
  const [formEditar, setFormEditar] = useState({ role: '', ativo: true, senha: '' });

  const { data: funcListData } = useFuncionarios(1, '', undefined, undefined, 200);
  const criarUser = useCriarUsuario();
  const atualizarUser = useAtualizarUsuario();

  const funcSemConta: FuncionarioListItem[] = (funcListData?.data ?? []).filter((f) => !f.user);

  useEffect(() => {
    if (open) {
      if (editando) {
        setFormEditar({ role: editando.role, ativo: editando.ativo, senha: '' });
      } else {
        setFormNovo(emptyNovo);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    try {
      if (editando) {
        const payload: { id: string; role: string; ativo: boolean; senha?: string } = {
          id: editando.id, role: formEditar.role, ativo: formEditar.ativo,
        };
        if (formEditar.senha) payload.senha = formEditar.senha;
        await atualizarUser.mutateAsync(payload);
      } else {
        if (!formNovo.nome || !formNovo.email || !formNovo.senha) { toast.error('Preencha os campos obrigatórios'); return; }
        if (!isValidEmail(formNovo.email)) { toast.error('E-mail inválido'); return; }
        await criarUser.mutateAsync({
          nome: formNovo.nome,
          email: formNovo.email,
          senha: formNovo.senha,
          role: formNovo.role,
          funcionarioId: formNovo.funcionarioId || undefined,
        });
      }
      onClose();
    } catch { /* handled by onError */ }
  }

  const roleOptions = [
    { value: 'admin', label: 'Administrador' },
    { value: 'gerente', label: 'Gerente' },
    { value: 'mecanico', label: 'Mecânico' },
    { value: 'almoxarife', label: 'Almoxarife' },
    { value: 'visualizador', label: 'Visualizador' },
  ];

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Usuário' : 'Novo Usuário'} size="md">
      {editando ? (
        <div className="space-y-4">
          <Field label="Perfil de acesso" required>
            <select className={selectCls} value={formEditar.role} onChange={(e) => setFormEditar({ ...formEditar, role: e.target.value })}>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Situação">
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFormEditar({ ...formEditar, ativo: !formEditar.ativo })}
                aria-label={formEditar.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                className="flex-shrink-0"
              >
                {formEditar.ativo
                  ? <ToggleRight size={28} className="text-blue-600" />
                  : <ToggleLeft size={28} className="text-gray-300" />
                }
              </button>
              <span className="text-sm text-gray-600">{formEditar.ativo ? 'Usuário ativo' : 'Usuário inativo'}</span>
            </div>
          </Field>
          <Field label="Nova senha" description="Deixe em branco para não alterar">
            <input
              className={inputCls}
              type="password"
              placeholder="••••••••"
              value={formEditar.senha}
              onChange={(e) => setFormEditar({ ...formEditar, senha: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Nome completo" required>
            <input className={inputCls} autoComplete="name" placeholder="Nome do usuário" value={formNovo.nome} onChange={(e) => setFormNovo({ ...formNovo, nome: e.target.value })} />
          </Field>
          <Field label="E-mail" required>
            <input className={inputCls} type="email" autoComplete="email" placeholder="email@exemplo.com" value={formNovo.email} onChange={(e) => setFormNovo({ ...formNovo, email: e.target.value })} />
          </Field>
          <Field label="Senha" required>
            <input className={inputCls} type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={formNovo.senha} onChange={(e) => setFormNovo({ ...formNovo, senha: e.target.value })} />
          </Field>
          <Field label="Perfil de acesso" required>
            <select className={selectCls} value={formNovo.role} onChange={(e) => setFormNovo({ ...formNovo, role: e.target.value })}>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          {funcSemConta.length > 0 && (
            <Field label="Vincular a funcionário" description="Opcional — conecta o usuário a um registro de funcionário">
              <select className={selectCls} value={formNovo.funcionarioId} onChange={(e) => setFormNovo({ ...formNovo, funcionarioId: e.target.value })}>
                <option value="">— Nenhum —</option>
                {funcSemConta.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome} {f.cargo ? `(${f.cargo})` : ''}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
      )}
      <ModalFooter
        onCancel={onClose}
        onConfirm={salvar}
        loading={criarUser.isPending || atualizarUser.isPending}
        disabled={!editando && (!formNovo.nome || !formNovo.email || !formNovo.senha)}
        confirmLabel={editando ? 'Salvar' : 'Criar usuário'}
      />
    </Modal>
  );
}
