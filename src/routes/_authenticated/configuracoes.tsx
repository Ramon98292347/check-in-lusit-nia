import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BedDouble, Link2, ShoppingBasket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const [publicUrl, setPublicUrl] = useState("/precadastro");

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/precadastro`);
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl">Configurações</h1>
        <p className="text-muted-foreground text-sm">Cadastros internos e atalhos importantes do sistema</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 shadow-soft">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BedDouble className="h-5 w-5" />
            </div>
            <CardTitle className="font-serif text-xl">Acomodações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Gerencie quartos e chalés usados nas hospedagens e no pré-cadastro público.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/acomodacoes">Abrir acomodações</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-soft">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBasket className="h-5 w-5" />
            </div>
            <CardTitle className="font-serif text-xl">Produtos de Consumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cadastre os itens usados na vistoria e no fechamento das hospedagens.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/produtos">Abrir produtos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-soft md:col-span-2">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            <CardTitle className="font-serif text-xl">Link público do pré-cadastro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use este link para enviar aos hóspedes e permitir o preenchimento do formulário público pelo celular.
            </p>
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm break-all">
              {publicUrl}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copiado");
                }}
              >
                Copiar link
              </Button>
              <Button asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">Abrir formulário</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
