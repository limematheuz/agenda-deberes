import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useServices } from "../../ServicesContext";
import { Icon } from "../Icon/Icon";
import "./AuthForm.css";

/** Campo de contraseña con botón integrado dentro del input para mostrar/ocultar mientras escribes. */
function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input-wrap">
      <input
        {...props}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        <Icon name={visible ? "eye-off" : "eye"} size={18} />
      </button>
    </div>
  );
}

export function AuthForm() {
  const { auth } = useServices();
  const [mode, setMode] = useState<"entrar" | "crear">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [tocado, setTocado] = useState(false);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordSegura = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const coincide = password === confirmacion && confirmacion.length > 0;
  const creando = mode === "crear";
  const formularioValido = emailValido && password.length >= 6 && (!creando || (passwordSegura && coincide));

  const cambiarModo = (siguiente: "entrar" | "crear"): void => {
    setMode(siguiente);
    setMsg("");
    setTocado(false);
  };

  const run = async (): Promise<void> => {
    setTocado(true);
    if (!formularioValido) {
      setMsg(
        !emailValido
          ? "Introduce un correo con formato válido."
          : creando
            ? "Usa 8 caracteres o más, con una letra, un número y la misma confirmación."
            : "La contraseña debe tener al menos 6 caracteres.",
      );
      return;
    }
    try {
      setMsg("");
      setEnviando(true);
      if (!creando) await auth.signIn(email.trim(), password);
      else if (!(await auth.signUp(email.trim(), password))) {
        setMsg("Te hemos enviado un enlace de confirmación a tu correo. Ábrelo y vuelve para entrar.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  };
  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    void run();
  };

  return (
    <section className="auth-layout" aria-label="Acceso a CalendarAppio">
      <div className="auth-intro">
        <div className="auth-brand">
          <img src="/brand/calendarappio-logo.svg?v=3" alt="" />
          <span>CalendarAppio</span>
        </div>
        <span className="auth-kicker">Todo en su sitio</span>
        <h1>Tu semana,<br />bajo control.</h1>
        <p>
          Planifica tu trabajo, proyectos personales, horarios y notas en un único espacio sincronizado en todos tus dispositivos.
        </p>
        <div className="auth-benefits">
          <span><Icon name="calendar" size={16} /> Calendario y horario</span>
          <span><Icon name="bell" size={16} /> Recordatorios y avisos</span>
          <span><Icon name="note" size={16} /> Bloc de notas</span>
        </div>
      </div>

      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="auth-card-heading">
          <h2>{creando ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2>
          <p>{creando ? "Empieza a organizar tu día a día en unos segundos." : "Accede para ver tu planificación y tus notas."}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Acceso">
          <button
            type="button"
            role="tab"
            aria-selected={!creando}
            className={!creando ? "on" : ""}
            onClick={() => cambiarModo("entrar")}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={creando}
            className={creando ? "on" : ""}
            onClick={() => cambiarModo("crear")}
          >
            Crear cuenta
          </button>
        </div>

        <label className={`auth-field${tocado && !emailValido ? " invalid" : ""}`}>
          <span>Correo electrónico</span>
          <input
            type="email"
            placeholder="nombre@correo.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTocado(true)}
            aria-invalid={tocado && !emailValido}
          />
        </label>

        <div className={`auth-field${tocado && password.length < 6 ? " invalid" : ""}`}>
          <label htmlFor="auth-password-input">Contraseña</label>
          <PasswordInput
            id="auth-password-input"
            placeholder={creando ? "Mínimo 8 caracteres" : "Tu contraseña"}
            autoComplete={creando ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTocado(true)}
            aria-invalid={tocado && password.length < 6}
          />
        </div>

        {creando && (
          <>
            <div className="password-checks" aria-live="polite">
              <span className={password.length >= 8 ? "valid" : ""}>8 caracteres o más</span>
              <span className={/[A-Za-z]/.test(password) && /\d/.test(password) ? "valid" : ""}>Una letra y un número</span>
            </div>
            <div className={`auth-field${tocado && !coincide ? " invalid" : ""}`}>
              <label htmlFor="auth-confirm-input">Confirma la contraseña</label>
              <PasswordInput
                id="auth-confirm-input"
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                onBlur={() => setTocado(true)}
                aria-invalid={tocado && !coincide}
              />
            </div>
          </>
        )}

        {msg && (
          <p className={msg.startsWith("Te hemos") ? "auth-message success" : "auth-message"} role="status">
            {msg}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={enviando}>
          <span>{enviando ? "Un momento…" : creando ? "Crear cuenta" : "Entrar a CalendarAppio"}</span>
          <Icon name="chevron-right" size={16} />
        </button>

        {creando && (
          <p className="auth-note">Al crearla te enviaremos un enlace para confirmar que el correo es tuyo.</p>
        )}
      </form>
    </section>
  );
}
