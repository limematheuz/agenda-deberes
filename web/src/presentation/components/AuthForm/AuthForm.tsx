import { useState, type FormEvent } from "react";
import { useServices } from "../../ServicesContext";
import "./AuthForm.css";

export function AuthForm() {
  const { auth } = useServices();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const run = async (crear: boolean): Promise<void> => {
    try {
      setMsg("");
      if (!crear) await auth.signIn(email.trim(), password);
      else if (!(await auth.signUp(email.trim(), password))) setMsg("Revisa tu correo para confirmar la cuenta y vuelve a entrar.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error desconocido");
    }
  };
  const onSubmit = (e: FormEvent): void => { e.preventDefault(); void run(false); };

  return (
    <form className="card auth" onSubmit={onSubmit}>
      <h2>Entra en tu agenda</h2>
      <p className="muted">Tus deberes se guardan en tu cuenta y los ves en todos tus dispositivos.</p>
      <input type="email" placeholder="Correo" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Contraseña (mínimo 6 caracteres)" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {msg && <p role="status">{msg}</p>}
      <div className="row">
        <button type="submit" className="primary">Entrar</button>
        <button type="button" className="btn" onClick={() => void run(true)}>Crear cuenta</button>
      </div>
    </form>
  );
}
