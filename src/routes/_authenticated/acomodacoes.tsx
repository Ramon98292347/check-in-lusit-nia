import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/acomodacoes")({
  component: () => <Navigate to="/precadastros" />,
});
