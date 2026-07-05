import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: () => <Navigate to="/precadastros" />,
});
