import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vistorias/$id")({
  component: () => <Navigate to="/precadastros" />,
});
