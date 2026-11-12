import { AuthForm } from "../presentation/components/AuthForm/AuthForm";
import { useAuth } from "../presentation/hooks/useAuth";
import { CalendarPage } from "../presentation/pages/CalendarPage";

export function App() {
  const { loading, loggedIn } = useAuth();
  if (loading) return <main className="auth-page"><p className="muted">Cargando CalendarAppio…</p></main>;
  if (!loggedIn) return <main className="auth-page"><AuthForm /></main>;
  return <CalendarPage />;
}
