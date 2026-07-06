import { createFileRoute } from "@tanstack/react-router";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { enqueueOfflinePrecCadastro, getOfflinePrecCadastroCount, notifyBrowser, removeOfflinePrecCadastro, submitPrecCadastroOnline } from "@/utils/offlinePrecCadastro";
import { payloadEventoHospedagem } from "@/utils/payloads";
import { enviarEventoHospedagem } from "@/services/webhooksService";

const logoUrl = "/logo.png";
const cadastroHeroUrl = "/fundo-cadstro.png";

export const Route = createFileRoute("/precadastro")({
  component: PreCadastroPublico,
});

const schema = z.object({
  acomodacao_texto: z.string().trim().min(2, "Acomodação obrigatória").max(120),
  checkin: z.string().min(1, "Data de check-in obrigatória"),
  checkout: z.string().min(1, "Data de check-out obrigatória"),
  adultos: z.number().min(1, "Mínimo 1 adulto"),
  criancas: z.number().min(0),
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  cpf: z.string().trim().min(11, "CPF obrigatório").max(14),
  nascimento: z.string().optional(),
  telefone: z.string().trim().min(8, "Telefone obrigatório").max(20),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  cep: z.string().trim().min(8, "CEP obrigatório").max(9),
  endereco: z.string().max(200).optional(),
  cidade: z.string().max(100).optional(),
  uf: z.string().max(2).optional(),
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

type EnvioInfo =
  | {
      tipo: "online";
      hospedagemId: string;
      hospedeId: string;
      payload: Omit<Form, "aceite">;
      acomodacaoNome: string;
      qtd: number;
      valorDiaria: number;
    }
  | {
      tipo: "offline";
      queueId: string;
      payload: Omit<Form, "aceite">;
    };

function PreCadastroPublico() {
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [offlinePendentes, setOfflinePendentes] = useState(0);
  const [envioInfo, setEnvioInfo] = useState<EnvioInfo | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { acomodacao_texto: "", adultos: 1, criancas: 0, acompanhantes: [], aceite: false as any },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "acompanhantes" });

  useEffect(() => {
    setOfflinePendentes(getOfflinePrecCadastroCount());
  }, []);

  const formatCpfInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})?/, (_, a, b, c, d) =>
      `${a}.${b}.${c}${d ? `-${d}` : ""}`,
    );
  };

  const formatCepInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d{1,3})?/, (_, a, b) => `${a}${b ? `-${b}` : ""}`);
  };

  const handleNomeChange = (value: string) => value.toUpperCase();

  const fetchCep = async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error("Não foi possível buscar o CEP");
      const data = await response.json();
      if (data.erro) throw new Error("CEP não encontrado");

      setValue("endereco", data.logradouro || "");
      setValue("cidade", data.localidade || "");
      setValue("uf", (data.uf || "").toUpperCase());
    } catch (error: any) {
      toast.error(error.message || "CEP inválido ou não encontrado");
    } finally {
      setCepLoading(false);
    }
  };

  const onSubmit = async (values: Form) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        acompanhantes: values.acompanhantes || [],
      };

      if (!navigator.onLine) {
        const item = enqueueOfflinePrecCadastro(payload);
        setOfflinePendentes(getOfflinePrecCadastroCount());
        notifyBrowser("Pré-cadastro salvo offline", "Os dados serão enviados assim que a internet voltar.");
        toast.success("Pré-cadastro salvo offline", {
          description: "Assim que a internet voltar, o sistema vai enviar automaticamente.",
        });
        setEnvioInfo({
          tipo: "offline",
          queueId: item.id,
          payload,
        });
      } else {
        const result = await submitPrecCadastroOnline(payload);
        setEnvioInfo({
          tipo: "online",
          hospedagemId: result.hospedagemId,
          hospedeId: result.hospedeId,
          payload,
          acomodacaoNome: result.acomodacao_texto,
          qtd: result.qtd,
          valorDiaria: Number(result.valor_diaria || 0),
        });
      }

      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar pré-cadastro");
    } finally {
      setLoading(false);
    }
  };

  const cancelarPreCadastro = async () => {
    if (!envioInfo) return;

    setCancelando(true);
    try {
      if (envioInfo.tipo === "offline") {
        const removed = removeOfflinePrecCadastro(envioInfo.queueId);
        if (!removed) {
          throw new Error("Não foi possível localizar o pré-cadastro offline para cancelar.");
        }
        setOfflinePendentes(getOfflinePrecCadastroCount());
      } else {
        const { error } = await supabase
          .from("hospedagens")
          .update({ status: "cancelado" })
          .eq("id", envioInfo.hospedagemId);

        if (error) throw error;

        await enviarEventoHospedagem({
          hospedagem_id: envioInfo.hospedagemId,
          evento: "mudanca_status",
          status: "cancelado",
          payload: payloadEventoHospedagem({
            evento: "mudanca_status",
            status: "cancelado",
            hospedagem: {
              id: envioInfo.hospedagemId,
              hospede_id: envioInfo.hospedeId,
              acomodacao_id: null,
              acomodacao_nome: envioInfo.payload.acomodacao_texto || envioInfo.acomodacaoNome,
              checkin: envioInfo.payload.checkin,
              checkout: envioInfo.payload.checkout,
              adultos: envioInfo.payload.adultos,
              criancas: envioInfo.payload.criancas,
              qtd_diarias: envioInfo.qtd,
              valor_diaria: envioInfo.valorDiaria,
              valor_hospedagem: envioInfo.qtd * envioInfo.valorDiaria,
              valor_total: envioInfo.qtd * envioInfo.valorDiaria,
              origem: "pre_cadastro",
              observacoes: envioInfo.payload.observacoes || "",
              hospede_nome: envioInfo.payload.nome,
              hospede_cpf: envioInfo.payload.cpf,
              hospede_nascimento: envioInfo.payload.nascimento || null,
              hospede_telefone: envioInfo.payload.telefone,
              hospede_email: envioInfo.payload.email || "",
              hospede_endereco: envioInfo.payload.endereco || "",
              hospede_cidade: envioInfo.payload.cidade || "",
              hospede_uf: envioInfo.payload.uf?.toUpperCase() || "",
              hospede_cep: envioInfo.payload.cep || "",
              hospede_placa_veiculo: envioInfo.payload.placa_veiculo || "",
            },
            acompanhantes: envioInfo.payload.acompanhantes || [],
            extras: {
              status_anterior: "pre_cadastro",
              status_novo: "cancelado",
              origem_acao: "precadastro_publico",
            },
          }),
        });
      }

      toast.success("Pré-cadastro cancelado com sucesso.");
      setEnvioInfo(null);
      setEnviado(false);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível cancelar o pré-cadastro.");
    } finally {
      setCancelando(false);
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
              {envioInfo?.tipo === "offline"
                ? "Seu pré-cadastro foi guardado neste aparelho e será enviado quando a internet voltar."
                : "A pousada recebeu seus dados e fará a confirmação. Nos vemos em breve!"}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button type="button" variant="outline" onClick={cancelarPreCadastro} disabled={cancelando}>
                {cancelando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancelar pré-cadastro
              </Button>
              <Button type="button" onClick={() => window.location.reload()}>
                Enviar novo formulário
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-56 md:h-64 overflow-hidden">
        <img src={cadastroHeroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero opacity-75" />
        <div className="relative z-10 h-full max-w-3xl mx-auto px-6 flex items-center gap-4">
          <div className="h-16 w-44 overflow-hidden rounded-xl bg-white/8 backdrop-blur-sm">
            <img src={logoUrl} alt="Pousada Lusitânia" className="h-full w-full object-cover" />
          </div>
          <div className="text-primary-foreground">
            <h1 className="font-serif text-2xl md:text-3xl">Ficha de Hóspede</h1>
            <p className="text-sm text-white/85">Preencha seu pré-cadastro antes da chegada</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto p-6 space-y-6 -mt-8">
        {offlinePendentes > 0 && (
          <Card className="border-dashed border-primary/40 bg-primary/5">
            <CardContent className="pt-6 text-sm">
              Existem <b>{offlinePendentes}</b> pré-cadastro(s) salvos offline aguardando sincronização.
            </CardContent>
          </Card>
        )}
        <Card className="shadow-elegant">
          <CardHeader><CardTitle className="font-serif">Sua estadia</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Acomodação *</Label>
              <Input {...register("acomodacao_texto")} placeholder="Digite a acomodação desejada" />
              {errors.acomodacao_texto && <p className="text-xs text-destructive">{errors.acomodacao_texto.message}</p>}
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
              <Input
                {...register("nome", {
                  onChange: (e) => {
                    const value = handleNomeChange((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = value;
                    setValue("nome", value);
                  },
                })}
              />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CPF *</Label>
              <Input
                maxLength={14}
                {...register("cpf", {
                  onChange: (e) => {
                    const value = formatCpfInput((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = value;
                    setValue("cpf", value);
                  },
                })}
                placeholder="000.000.000-00"
              />
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
            <div className="space-y-1.5">
              <Label>CEP *</Label>
              <Input
                maxLength={9}
                {...register("cep", {
                  onChange: (e) => {
                    const value = formatCepInput((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = value;
                    setValue("cep", value);
                  },
                  onBlur: (e) => fetchCep((e.target as HTMLInputElement).value),
                })}
                placeholder="00000-000"
              />
              {errors.cep && <p className="text-xs text-destructive">{errors.cep.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input maxLength={2} {...register("uf")} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input {...register("cidade")} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Endereço</Label>
              <Input {...register("endereco")} />
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
