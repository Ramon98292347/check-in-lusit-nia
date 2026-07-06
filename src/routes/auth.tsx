import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
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
  const [username, setUsername] = useState("recepcao");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstAccess, setFirstAccess] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user, signIn, ensureInitialPassword, hasInternalUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/painel" });
  }, [user, navigate]);

  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
    let active = true;

    const verificar = async () => {
      setCheckingUser(true);
      try {
        const existe = await hasInternalUser(username);
        if (active) setFirstAccess(!existe);
      } catch {
        if (active) setFirstAccess(true);
      } finally {
        if (active) setCheckingUser(false);
      }
    };

    void verificar();

    return () => {
      active = false;
    };
  }, [hasInternalUser, username]);

  const submit = async () => {
    setLoading(true);
    try {
      if (firstAccess) {
        if (!password || !confirmPassword) {
          toast.error("Digite e confirme a nova senha.");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("As senhas precisam ser iguais.");
          return;
        }
        await ensureInitialPassword(username, password);
      }

      await signIn(username, password);
      toast.success(firstAccess ? "Senha criada com sucesso." : "Acesso liberado com sucesso.");
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
              {checkingUser ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Verificando acesso interno...
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <p>Escolha o usuário interno e use sua senha.</p>
                    {firstAccess ? (
                      <p className="mt-1">Crie a senha de acesso agora e depois use normalmente para entrar.</p>
                    ) : (
                      <p className="mt-1">Digite a senha do usuário selecionado para entrar no sistema.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="username">
                      Usuário
                    </label>
                    <select
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="recepcao">recepcao</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="password">
                      Senha
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={firstAccess ? "new-password" : "current-password"}
                      placeholder={firstAccess ? "Crie a senha" : "Digite a senha"}
                    />
                  </div>
                  {firstAccess && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
                        Confirmar senha
                      </label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Repita a senha"
                      />
                    </div>
                  )}
                </>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={loading || checkingUser}>
                {firstAccess ? "Criar senha e entrar" : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
