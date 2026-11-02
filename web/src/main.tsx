import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { services } from "./app/container";
import { previewServices } from "./app/previewServices";
import { registrarServiceWorker } from "./infrastructure/push/web-push.gateway";
import { ServicesProvider } from "./presentation/ServicesContext";
import "./presentation/styles/global.css";

const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).has("preview");
if (!preview) registrarServiceWorker();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ServicesProvider services={preview ? previewServices : services}>
      <App />
    </ServicesProvider>
  </StrictMode>,
);
