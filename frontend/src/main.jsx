import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App.jsx";
import "./assets/fonts/font-face.css";
import "./index.css";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
        <Toaster
            richColors
            className="flex justify-center"
            position="bottom-center"
            duration="7000"
            theme="dark"
        />
    </StrictMode>
);
