import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

hydrateRoot(
  rootElement,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>
);
