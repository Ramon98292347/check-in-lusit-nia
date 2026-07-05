import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hospedagens")({
  component: () => <Navigate to="/precadastros" />,
});
