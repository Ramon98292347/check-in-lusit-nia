import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/lusitania-logo.png.asset.json";
import hero from "@/assets/pousada-hero.jpg";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/painel" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        toast.success("Bem-vindo(a) de volta!");
        navigate({ to: "/painel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome },
            emailRedirectTo: `${window.location.origin}/painel`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Verifique seu e-mail para confirmar.");
        setModo("login");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
        <img src={hero} alt="Pousada Lusitânia" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero opacity-70" />
        <div className="relative z-10 flex flex-col justify-between h-full p-10 text-primary-foreground">
          <img src={logo.url} alt="Pousada Lusitânia" className="h-16 w-16 rounded-lg bg-white/10 p-1" />
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
            <div className="mx-auto mb-3 h-14 w-14 rounded-lg bg-primary/5 grid place-items-center">
              <img src={logo.url} alt="" className="h-12 w-12 object-contain" />
            </div>
            <CardTitle className="font-serif text-2xl">
              {modo === "login" ? "Entrar no sistema" : "Criar conta"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Check-in Lusitânia · Pousada Lusitânia</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {modo === "cadastro" && (
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {modo === "login" ? "Entrar" : "Criar conta"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                {modo === "login" ? (
                  <>Não tem conta? <button type="button" onClick={() => setModo("cadastro")} className="text-primary font-medium hover:underline">Cadastre-se</button></>
                ) : (
                  <>Já tem conta? <button type="button" onClick={() => setModo("login")} className="text-primary font-medium hover:underline">Entrar</button></>
                )}
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
