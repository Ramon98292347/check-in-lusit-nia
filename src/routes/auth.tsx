import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const logoUrl = "/logo.png";
const loginHeroUrl = "/imagem-tela-longi.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signInLocal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/painel" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInLocal({ username, password: senha });
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
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuario"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Acessos internos liberados:</p>
                <p className="mt-2">Recepcao: usuario `recepcao` e senha `recepcao123`</p>
                <p>Vistoria: usuario `vistoria` e senha `vistoria123`</p>
              </div>
              <div className="pt-2 text-center">
                <Link to="/precadastro" className="text-xs text-muted-foreground hover:text-primary">
                  Sou hóspede — quero fazer o pré-cadastro
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
