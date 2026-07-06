import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const logoUrl = "/logo.png";
const loginHeroUrl = "/imagem-tela-longi.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [loading, setLoading] = useState(false);
  const { user, signInLocal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/painel" });
  }, [user, navigate]);

  const submit = async () => {
    setLoading(true);
    try {
      await signInLocal();
      toast.success("Acesso liberado com sucesso.");
      navigate({ to: "/painel" });
    } catch (e: any) {
      toast.error(e.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
        <img src={loginHeroUrl} alt="Pousada Lusitânia" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero opacity-70" />
        <div className="relative z-10 flex flex-col justify-between h-full p-10 text-primary-foreground">
          <div />
          <div>
            <h1 className="font-serif text-5xl leading-tight">
              A tranquilidade das montanhas,<br />o conforto do lar.
            </h1>
            <p className="mt-4 text-white/85 max-w-md">
              Sistema de gestão de hospedagens — pré-cadastro, check-in, vistoria e fechamento em poucos toques.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-elegant border-border/60">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-56 overflow-hidden rounded-xl bg-primary/5">
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <CardTitle className="font-serif text-2xl">Entrar no sistema</CardTitle>
            <p className="text-sm text-muted-foreground">Acesso interno da Pousada Lusitânia</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p>Toque em entrar para acessar o sistema.</p>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
