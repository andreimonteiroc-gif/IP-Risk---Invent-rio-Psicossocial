"use client";

import { FormEvent, useState } from "react";
import AppMainContainer from "@/themes/components/main";

type AdminUser = {
  usuario: string;
  papel: "profissional_autorizado" | "gerenciador";
  nome?: string;
  ativo?: boolean;
};

function roleLabel(papel: AdminUser["papel"]) {
  return papel === "gerenciador" ? "Superadministrador" : "Médico / Profissional Autorizado";
}

export default function UsersPanel({
  initialUsers,
  initialError,
  currentUser,
}: {
  initialUsers: AdminUser[];
  initialError?: string;
  currentUser?: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listSuccess, setListSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editNovoUsuario, setEditNovoUsuario] = useState("");
  const [editNovaSenha, setEditNovaSenha] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const trimmedName = nome.trim();
    if (trimmedName.length > 100) {
      setError("O nome completo deve ter no máximo 100 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]{3,80}$/.test(usuario)) {
      setError("O usuário deve ter de 3 a 80 caracteres: letras, números, ponto, hífen ou sublinhado.");
      return;
    }
    if ([...senha].length < 8 || [...senha].length > 128) {
      setError("A senha deve ter de 8 a 128 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmedName ? { nome: trimmedName, usuario, senha } : { usuario, senha }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({})) as {
        usuario?: string;
        papel?: AdminUser["papel"];
        nome?: string;
        mensagem?: string;
      };
      if (!response.ok) {
        setError(response.status === 401 ? "Sua sessão expirou. Entre novamente para continuar."
          : response.status === 403 ? "Somente o Superadministrador pode cadastrar Médicos."
            : data.mensagem || "Não foi possível cadastrar o médico.");
        return;
      }
      if (typeof data.usuario !== "string" || data.papel !== "profissional_autorizado") {
        setError("O servidor retornou uma confirmação inválida.");
        return;
      }
      setUsers(current => [...current, {
        usuario: data.usuario!,
        papel: data.papel!,
        ...(data.nome ? { nome: data.nome } : {}),
        ativo: true,
      }]);
      setNome("");
      setUsuario("");
      setSenha("");
      setConfirmacao("");
      setSuccess("Médico cadastrado com sucesso.");
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(user: AdminUser) {
    if (user.usuario === currentUser || user.papel === "gerenciador") return;
    setListError(null);
    setListSuccess(null);
    const nextActive = user.ativo === false;
    setTogglingUser(user.usuario);
    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: user.usuario, ativo: nextActive }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({})) as { ativo?: boolean; mensagem?: string };
      if (!response.ok) {
        setListError(response.status === 401 ? "Sua sessão expirou. Entre novamente para continuar."
          : data.mensagem || "Não foi possível atualizar o acesso.");
        return;
      }
      setUsers(current => current.map(item => item.usuario === user.usuario ? { ...item, ativo: nextActive } : item));
      setListSuccess(data.mensagem || (nextActive ? "Acesso reativado com sucesso." : "Acesso desativado com sucesso."));
    } catch {
      setListError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setTogglingUser(null);
    }
  }

  function startEdit(user: AdminUser) {
    if (user.usuario === currentUser || user.papel === "gerenciador") return;
    setEditingUser(user.usuario);
    setEditNome(user.nome || "");
    setEditNovoUsuario(user.usuario);
    setEditNovaSenha("");
    setEditError(null);
    setListError(null);
    setListSuccess(null);
  }

  function cancelEdit() {
    setEditingUser(null);
    setEditError(null);
    setEditNovaSenha("");
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, user: AdminUser) {
    event.preventDefault();
    setEditError(null);
    setListError(null);
    setListSuccess(null);
    const trimmedName = editNome.trim();
    if (trimmedName.length > 100) {
      setEditError("O nome completo deve ter no máximo 100 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]{3,80}$/.test(editNovoUsuario)) {
      setEditError("O usuário deve ter de 3 a 80 caracteres: letras, números, ponto, hífen ou sublinhado.");
      return;
    }
    if (editNovaSenha.length > 0 && ([...editNovaSenha].length < 8 || [...editNovaSenha].length > 128)) {
      setEditError("A senha deve ter de 8 a 128 caracteres.");
      return;
    }
    setSavingEdit(true);
    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: user.usuario,
          nome: trimmedName,
          novoUsuario: editNovoUsuario,
          ...(editNovaSenha.length > 0 ? { novaSenha: editNovaSenha } : {}),
        }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({})) as {
        usuario?: string;
        papel?: AdminUser["papel"];
        nome?: string;
        ativo?: boolean;
        mensagem?: string;
      };
      if (!response.ok) {
        setEditError(response.status === 401 ? "Sua sessão expirou. Entre novamente para continuar."
          : data.mensagem || "Não foi possível atualizar os dados do médico.");
        return;
      }
      if (typeof data.usuario !== "string") {
        setEditError("O servidor retornou uma confirmação inválida.");
        return;
      }
      setUsers(current => current.map(item => item.usuario === user.usuario ? {
        usuario: data.usuario!,
        papel: data.papel || item.papel,
        ...(data.nome ? { nome: data.nome } : {}),
        ...(typeof data.ativo === "boolean" ? { ativo: data.ativo } : typeof item.ativo === "boolean" ? { ativo: item.ativo } : {}),
      } : item));
      setEditingUser(null);
      setEditNovaSenha("");
      setListSuccess(data.mensagem || "Dados do médico atualizados com sucesso.");
    } catch {
      setEditError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSavingEdit(false);
    }
  }

  return <AppMainContainer
    title="Gestão de Médicos e Acessos"
    description="Exclusivo do Superadministrador. Cadastre Médicos e gerencie o acesso às consultas agregadas do Dashboard."
  >
    <div className="users-layout">
      <section className="users-form-card" aria-labelledby="new-user-title">
        <h2 id="new-user-title">Cadastrar Médico</h2>
        <p>O Médico terá acesso exclusivo à consulta de resultados agregados no Dashboard, sem permissão para gerenciar contas.</p>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="new-fullname">Nome completo</label>
            <input id="new-fullname" name="fullname" autoComplete="off" maxLength={100}
              value={nome} onChange={event => setNome(event.target.value)} placeholder="Ex.: Dra. Ana Clara Souza" />
          </div>
          <div className="field">
            <label htmlFor="new-username">Usuário / identificador</label>
            <input id="new-username" name="username" autoComplete="off" required minLength={3} maxLength={80}
              value={usuario} onChange={event => setUsuario(event.target.value)} placeholder="Ex.: ana.souza" />
            <small>Use de 3 a 80 letras, números, ponto, hífen ou sublinhado.</small>
          </div>
          <div className="field">
            <label htmlFor="new-password">Senha</label>
            <input id="new-password" name="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
              value={senha} onChange={event => setSenha(event.target.value)} placeholder="Mínimo de 8 caracteres" />
            <small>Use de 8 a 128 caracteres.</small>
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirmar senha</label>
            <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
              value={confirmacao} onChange={event => setConfirmacao(event.target.value)} placeholder="Repita a senha" />
          </div>
          {error && <p className="error-banner" role="alert">{error}</p>}
          {success && <p className="success-banner" role="status">{success}</p>}
          <button className="primary-button" type="submit" disabled={submitting || Boolean(initialError)}>
            {submitting ? "Salvando…" : "Cadastrar Médico"}
          </button>
        </form>
      </section>
      <section className="users-list-card" aria-labelledby="users-list-title">
        <div className="users-list-heading">
          <div>
            <h2 id="users-list-title">Médicos cadastrados</h2>
            <p>{users.length} conta(s) autorizada(s)</p>
          </div>
        </div>
        {listError && <p className="error-banner" role="alert">{listError}</p>}
        {listSuccess && <p className="success-banner" role="status">{listSuccess}</p>}
        {users.length === 0 ? <p className="users-empty">Nenhum Médico cadastrado até o momento.</p> :
          <ul className="users-list">{users.map(user => {
            const active = user.ativo !== false;
            const isSelfOrManager = user.usuario === currentUser || user.papel === "gerenciador";
            const isEditing = editingUser === user.usuario;
            return (
              <li key={user.usuario} className={isEditing ? "user-row-editing" : undefined}>
                <div className="user-row-header">
                  <div className="user-row-main">
                    <span className="user-avatar" aria-hidden="true">{(user.nome || user.usuario).slice(0, 1).toUpperCase()}</span>
                    <div className="user-info">
                      <strong>{user.nome ? `${user.nome} (${user.usuario})` : user.usuario}</strong>
                      <div className="user-meta">
                        <span className="role-badge">{roleLabel(user.papel)}</span>
                        <span className={`status-badge ${active ? "status-active" : "status-inactive"}`}>
                          {active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="user-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isSelfOrManager || togglingUser === user.usuario || savingEdit}
                      onClick={() => isEditing ? cancelEdit() : startEdit(user)}
                    >
                      {isEditing ? "Fechar" : "Editar"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isSelfOrManager || togglingUser === user.usuario || isEditing}
                      onClick={() => toggleStatus(user)}
                    >
                      {togglingUser === user.usuario ? "Atualizando…" : active ? "Desativar acesso" : "Reativar acesso"}
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <form className="user-edit-form" onSubmit={event => submitEdit(event, user)} noValidate>
                    <div className="field">
                      <label htmlFor={`edit-fullname-${user.usuario}`}>Nome completo</label>
                      <input
                        id={`edit-fullname-${user.usuario}`}
                        name="fullname"
                        autoComplete="off"
                        maxLength={100}
                        value={editNome}
                        onChange={event => setEditNome(event.target.value)}
                        placeholder="Ex.: Dra. Ana Clara Souza"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`edit-username-${user.usuario}`}>Usuário / identificador</label>
                      <input
                        id={`edit-username-${user.usuario}`}
                        name="username"
                        autoComplete="off"
                        required
                        minLength={3}
                        maxLength={80}
                        value={editNovoUsuario}
                        onChange={event => setEditNovoUsuario(event.target.value)}
                        placeholder="Ex.: ana.souza"
                      />
                      <small>Use de 3 a 80 letras, números, ponto, hífen ou sublinhado.</small>
                    </div>
                    <div className="field">
                      <label htmlFor={`edit-password-${user.usuario}`}>Nova senha</label>
                      <input
                        id={`edit-password-${user.usuario}`}
                        name="new-password"
                        type="password"
                        autoComplete="new-password"
                        maxLength={128}
                        value={editNovaSenha}
                        onChange={event => setEditNovaSenha(event.target.value)}
                        placeholder="Opcional (8 a 128 caracteres)"
                      />
                      <small>Deixe em branco para manter a senha atual.</small>
                    </div>
                    {editError && <p className="error-banner" role="alert">{editError}</p>}
                    <div className="user-edit-actions">
                      <button className="primary-button" type="submit" disabled={savingEdit}>
                        {savingEdit ? "Salvando…" : "Salvar alterações"}
                      </button>
                      <button className="secondary-button" type="button" disabled={savingEdit} onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}</ul>}
      </section>
    </div>
  </AppMainContainer>;
}
