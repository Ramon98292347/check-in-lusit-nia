import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BedDouble, ClipboardList, LockKeyhole } from "lucide-react";

const logoUrl = "/Captura%20de%20tela%202026-07-03%20124733.png";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const [publicUrl, setPublicUrl] = useState("/precadastro");

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/precadastro`);
  }, []);

  if (loading) return null;
  if (user) return <Navigate to="/painel" />;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-elegant backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <img src={logoUrl} alt="Pousada Lusitânia" className="h-20 w-auto rounded-xl bg-primary/5 p-2" />
              <div>
                <h1 className="font-serif text-4xl text-foreground">Check-in Lusitânia</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Escolha abaixo se você é hóspede e deseja preencher o pré-cadastro ou se vai acessar a área interna da pousada.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Link público do hóspede:
              <div className="mt-1 font-medium text-foreground">{publicUrl}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-6 w-6" />
              </div>
              <CardTitle className="font-serif text-2xl">Sou hóspede</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preencha o formulário público antes da chegada para agilizar seu atendimento na pousada.
              </p>
              <Button asChild className="w-full" size="lg">
                <Link to="/precadastro">Abrir formulário de pré-cadastro</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <CardTitle className="font-serif text-2xl">Área interna</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Acesso de funcionários e administradores para gestão de pré-cadastros, hospedagens, vistorias e check-out.
              </p>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link to="/auth">Entrar no sistema</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary p-6">
          <div className="flex items-start gap-3">
            <BedDouble className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-serif text-xl text-foreground">Compartilhamento simples com o hóspede</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Você pode enviar diretamente o link ` /precadastro ` para o hóspede preencher pelo celular.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
