import { AuthForm } from "../presentation/components/AuthForm/AuthForm";
import { useAuth } from "../presentation/hooks/useAuth";
import { CalendarPage } from "../presentation/pages/CalendarPage";

export function App() {
  const { loading, loggedIn } = useAuth();
  if (loading) return <p className="muted pad">Cargando…</p>;
  if (!loggedIn) return <main className="pad"><AuthForm /></main>;
  return <CalendarPage />;
}
