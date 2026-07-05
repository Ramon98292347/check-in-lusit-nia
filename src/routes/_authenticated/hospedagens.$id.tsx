import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hospedagens/$id")({
  component: () => <Navigate to="/precadastros" />,
});
