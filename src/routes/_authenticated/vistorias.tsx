import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vistorias")({
  component: () => <Navigate to="/precadastros" />,
});
