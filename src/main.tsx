import { createRoot } from "react-dom/client";
import "./lib/domMutationGuard";
import { installAuthLockGuard } from "./lib/authLockGuard";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import App from "./App.tsx";
import "./index.css";

installAuthLockGuard();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
