import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import hero from "@/assets/pousada-hero.jpg";
import { calcQtdDiarias } from "@/utils/calculations";
import { enviarEventoHospedagem } from "@/services/webhooksService";
import { payloadEventoHospedagem } from "@/utils/payloads";

const logoUrl = "/Captura%20de%20tela%202026-07-03%20124733.png";

export const Route = createFileRoute("/precadastro")({
  component: PreCadastroPublico,
});

const schema = z.object({
  acomodacao_id: z.string().min(1, "Selecione a acomodação"),
  checkin: z.string().min(1, "Data de check-in obrigatória"),
  checkout: z.string().min(1, "Data de check-out obrigatória"),
  adultos: z.number().min(1, "Mínimo 1 adulto"),
  criancas: z.number().min(0),
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  cpf: z.string().trim().min(11, "CPF obrigatório").max(20),
  nascimento: z.string().optional(),
  telefone: z.string().trim().min(8, "Telefone obrigatório").max(20),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().max(200).optional(),
  cidade: z.string().max(100).optional(),
  uf: z.string().max(2).optional(),
  cep: z.string().max(15).optional(),
  placa_veiculo: z.string().max(15).optional(),
  observacoes: z.string().max(500).optional(),
  aceite: z.literal(true, { errorMap: () => ({ message: "Aceite obrigatório" }) }),
  acompanhantes: z.array(z.object({
    nome: z.string().max(120).optional(),
    cpf: z.string().max(20).optional(),
    nascimento: z.string().optional(),
  })).max(3),
});

type Form = z.infer<typeof schema>;

function PreCadastroPublico() {
  const [acomodacoes, setAcomodacoes] = useState<any[]>([]);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { adultos: 1, criancas: 0, acompanhantes: [], aceite: false as any },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "acompanhantes" });

  useEffect(() => {
    supabase.from("acomodacoes").select("id, nome, valor_diaria").eq("ativo", true).order("nome")
      .then(({ data }) => setAcomodacoes(data || []));
  }, []);

  const onSubmit = async (values: Form) => {
    setLoading(true);
    try {
      const hospedeId = crypto.randomUUID();
      const hospedagemId = crypto.randomUUID();

      const { error: e1 } = await supabase.from("hospedes").insert({
        id: hospedeId,
        nome: values.nome,
        cpf: values.cpf,
        nascimento: values.nascimento || null,
        telefone: values.telefone,
        email: values.email || null,
        endereco: values.endereco || null,
        cidade: values.cidade || null,
        uf: values.uf?.toUpperCase() || null,
        cep: values.cep || null,
        placa_veiculo: values.placa_veiculo || null,
      });
      if (e1) throw e1;

      const acom = acomodacoes.find((a) => a.id === values.acomodacao_id);
      const qtd = calcQtdDiarias(values.checkin, values.checkout);
      const valor_diaria = Number(acom?.valor_diaria || 0);

      const { error: e2 } = await supabase.from("hospedagens").insert({
        id: hospedagemId,
        hospede_id: hospedeId,
        acomodacao_id: values.acomodacao_id,
        checkin: values.checkin,
        checkout: values.checkout,
        adultos: values.adultos,
        criancas: values.criancas,
        qtd_diarias: qtd,
        valor_diaria,
        valor_hospedagem: qtd * valor_diaria,
        valor_total: qtd * valor_diaria,
        status: "pre_cadastro",
        origem: "pre_cadastro",
        observacoes: values.observacoes || null,
      });
      if (e2) throw e2;

      const acomp = values.acompanhantes.filter((a) => a.nome?.trim());
      if (acomp.length > 0) {
        await supabase.from("acompanhantes").insert(
          acomp.map((a) => ({
            id: crypto.randomUUID(),
            hospedagem_id: hospedagemId,
            nome: a.nome,
            cpf: a.cpf || null,
            nascimento: a.nascimento || null,
          })),
        );
      }

      await enviarEventoHospedagem({
        hospedagem_id: hospedagemId,
        evento: "novo_precadastro",
        status: "pre_cadastro",
        payload: payloadEventoHospedagem({
          evento: "novo_precadastro",
          status: "pre_cadastro",
          hospedagem: {
            id: hospedagemId,
            hospede_id: hospedeId,
            acomodacao_id: values.acomodacao_id,
            acomodacao_nome: acom?.nome ?? "",
            checkin: values.checkin,
            checkout: values.checkout,
            adultos: values.adultos,
            criancas: values.criancas,
            qtd_diarias: qtd,
            valor_diaria,
            valor_hospedagem: qtd * valor_diaria,
            valor_total: qtd * valor_diaria,
            origem: "pre_cadastro",
            observacoes: values.observacoes || "",
            hospede_nome: values.nome,
            hospede_cpf: values.cpf,
            hospede_nascimento: values.nascimento || null,
            hospede_telefone: values.telefone,
            hospede_email: values.email || "",
            hospede_endereco: values.endereco || "",
            hospede_cidade: values.cidade || "",
            hospede_uf: values.uf?.toUpperCase() || "",
            hospede_cep: values.cep || "",
            hospede_placa_veiculo: values.placa_veiculo || "",
          },
          acompanhantes: acomp,
        }),
      });

      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar pré-cadastro");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <Card className="max-w-lg w-full shadow-elegant text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary mb-4" />
            <h1 className="font-serif text-2xl mb-2">Pré-cadastro enviado com sucesso</h1>
            <p className="text-muted-foreground">
              A pousada recebeu seus dados e fará a confirmação. Nos vemos em breve!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-56 md:h-64 overflow-hidden">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero opacity-75" />
        <div className="relative z-10 h-full max-w-3xl mx-auto px-6 flex items-center gap-4">
          <img src={logoUrl} alt="Pousada Lusitânia" className="h-16 w-auto rounded-xl bg-white/8 p-2 backdrop-blur-sm" />
          <div className="text-primary-foreground">
            <h1 className="font-serif text-2xl md:text-3xl">Ficha de Hóspede</h1>
            <p className="text-sm text-white/85">Preencha seu pré-cadastro antes da chegada</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto p-6 space-y-6 -mt-8">
        <div className="flex justify-start">
          <Button asChild type="button" variant="outline">
            <Link to="/">Voltar</Link>
          </Button>
        </div>
        <Card className="shadow-elegant">
          <CardHeader><CardTitle className="font-serif">Sua estadia</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Acomodação *</Label>
              <Select onValueChange={(v) => setValue("acomodacao_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a acomodação" /></SelectTrigger>
                <SelectContent>
                  {acomodacoes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.acomodacao_id && <p className="text-xs text-destructive">{errors.acomodacao_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Check-in *</Label>
              <Input type="date" {...register("checkin")} />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out *</Label>
              <Input type="date" {...register("checkout")} />
            </div>
            <div className="space-y-1.5">
              <Label>Nº de adultos *</Label>
              <Input type="number" min={1} {...register("adultos", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nº de crianças</Label>
              <Input type="number" min={0} {...register("criancas", { valueAsNumber: true })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif">Seus dados</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Nome completo *</Label>
              <Input {...register("nome")} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CPF *</Label>
              <Input {...register("cpf")} placeholder="000.000.000-00" />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Data de nascimento</Label>
              <Input type="date" {...register("nascimento")} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input {...register("telefone")} placeholder="(00) 00000-0000" />
              {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" {...register("email")} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Endereço</Label>
              <Input {...register("endereco")} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input {...register("cidade")} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Input maxLength={2} {...register("uf")} />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input {...register("cep")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Placa do veículo</Label>
              <Input {...register("placa_veiculo")} placeholder="ABC1D23" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif">Acompanhantes</CardTitle>
            {fields.length < 3 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ nome: "", cpf: "", nascimento: "" })}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 && <p className="text-sm text-muted-foreground">Nenhum acompanhante adicionado.</p>}
            {fields.map((f, i) => (
              <div key={f.id} className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-3 rounded-lg bg-muted/40">
                <div className="space-y-1"><Label className="text-xs">Nome</Label><Input {...register(`acompanhantes.${i}.nome` as const)} /></div>
                <div className="space-y-1"><Label className="text-xs">CPF</Label><Input {...register(`acompanhantes.${i}.cpf` as const)} /></div>
                <div className="space-y-1"><Label className="text-xs">Nascimento</Label><Input type="date" {...register(`acompanhantes.${i}.nascimento` as const)} /></div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={3} {...register("observacoes")} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={watch("aceite") as any} onCheckedChange={(v) => setValue("aceite", v as any)} />
              <span>Declaro que os dados informados são verdadeiros e aceito os termos de hospedagem da pousada.</span>
            </label>
            {errors.aceite && <p className="text-xs text-destructive">{errors.aceite.message}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar pré-cadastro
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
