import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: () => <Navigate to="/precadastros" />,
});
