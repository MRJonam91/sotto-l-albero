import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "./styles.css";
import "./navigation-layout.css";
import App from "./App.jsx";
import { restoreLocale } from "./i18n.js";

// A missing language chunk must never prevent access to an invitation.
restoreLocale()
  .catch(() => {})
  .then(() =>
    createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  );
