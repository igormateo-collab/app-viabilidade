import { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useProject } from "@/contexts/ProjectContext";
import type { Enterprise } from "@/data/mockData";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ExtractedField<T = string | number | null> = {
  value: T;
  page?: number | null;
  confidence?: number | null;
  sourceText?: string | null;
};

type ExtractedPayload = {
  documentType?: string;
  fields?: {
    address?: ExtractedField<string>;
    addressNumber?: ExtractedField<string>;
    neighborhood?: ExtractedField<string>;
    city?: ExtractedField<string>;
    state?: ExtractedField<string>;
    zipCode?: ExtractedField<string>;
    landArea?: ExtractedField<number>;
    builtArea?: ExtractedField<number>;
    privateArea?: ExtractedField<number>;
    commonArea?: ExtractedField<number>;
    sellableArea?: ExtractedField<number>;
    type?: ExtractedField<string>;
    process?: ExtractedField<string>;
    use?: ExtractedField<string>;
    useGroup?: ExtractedField<string>;
    zone?: ExtractedField<string>;
  };
  notes?: string[];
};

type ExtractionRow = {
  label: string;
  value: string;
  page: string;
  confidence: string;
  sourceText: string;
};

const T = {
  bg: "#030b1a",
  surf: "#061020",
  card: "#091428",
  border: "#0f1f3d",
  bBright: "#1a3560",
  gold: "#c9a227",
  goldL: "#f0c040",
  green: "#22c55e",
  text: "#e2e8f0",
  sub: "#94a3b8",
  muted: "#64748b",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler o arquivo"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () =>
      reject(new Error("Falha ao converter arquivo em base64"));
    reader.readAsDataURL(file);
  });
}

function extractJsonFromText(text: string): ExtractedPayload | null {
  if (!text) return null;

  const fenced =
    text.match(/```json\s*([\s\S]*?)```/i) ||
    text.match(/```\s*([\s\S]*?)```/i);

  const candidate = fenced?.[1] || text;

  try {
    return JSON.parse(candidate) as ExtractedPayload;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as ExtractedPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value)
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function inferEnterpriseType(raw: string): string | null {
  const text = raw.toLowerCase();
  if (!text) return null;

  if (
    text.includes("habitacional vertical") ||
    text.includes("edifício de apartamentos") ||
    text.includes("edificio de apartamentos")
  ) {
    return "Residencial Vertical";
  }
  if (text.includes("horizontal")) return "Residencial Horizontal";
  if (text.includes("comercial")) return "Comercial";
  if (text.includes("misto")) return "Misto";

  return null;
}

function buildAutofillPrompt(context: unknown, fileName: string) {
  return [
    "Você é um extrator técnico de documentos urbanísticos e imobiliários do Brasil.",
    "Analise o PDF enviado e retorne somente JSON válido.",
    "Nunca invente, nunca estime, nunca complete lacunas por suposição.",
    "Se um campo não estiver explícito no documento, retorne null.",
    "Se houver conflito entre fontes no próprio documento, use a informação mais explícita e específica.",
    "Se houver CEP, você pode extraí-lo; o aplicativo poderá complementar cidade e UF depois.",
    "Documento recebido:",
    fileName,
    "",
    "Contexto atual do projeto no app:",
    JSON.stringify(context, null, 2),
    "",
    "Retorne exatamente neste formato:",
    JSON.stringify(
      {
        documentType: "AOP",
        fields: {
          address: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          addressNumber: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          neighborhood: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          city: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          state: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          zipCode: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          landArea: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          builtArea: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          privateArea: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          commonArea: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          sellableArea: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          type: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          process: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          use: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          useGroup: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
          zone: {
            value: null,
            page: null,
            confidence: null,
            sourceText: null,
          },
        },
        notes: [],
      },
      null,
      2,
    ),
    "",
    "Regras:",
    "1) Não devolva texto fora do JSON.",
    "2) Não transforme área do terreno em área construída.",
    "3) Não preencha área privativa, comum ou construída se isso não estiver explícito.",
    "4) Para endereço, separe logradouro e número quando o número estiver explícito.",
    "5) Para campo 'type', use o enquadramento do uso para sugerir apenas categorias do app como 'Residencial Vertical', 'Residencial Horizontal', 'Comercial' ou 'Misto'. Se não der, retorne null.",
  ].join("\n");
}

export default function AIAssistant() {
  const project = useProject();
  const { updateEnterprise } = project;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastExtraction, setLastExtraction] =
    useState<ExtractedPayload | null>(null);

  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Sou seu assistente de viabilidade. Posso conversar sobre o projeto e também ler AOP em PDF para preencher automaticamente os campos do empreendimento sem inventar dados ausentes.",
    },
  ]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const context = useMemo(() => {
    const enterprise = (project as any)?.enterprise || {};
    const land = (project as any)?.land || {};
    const indicators = (project as any)?.indicators || {};
    const settings = (project as any)?.settings || {};
    const unitTypes = (project as any)?.unitTypes || [];

    return {
      enterprise,
      land,
      indicators,
      settings,
      unitTypes,
    };
  }, [project]);

  async function enrichByCep(cep: string): Promise<Partial<Enterprise>> {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return {};

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (data?.erro) return {};

      return {
        address: data.logradouro || undefined,
        neighborhood: data.bairro || undefined,
        city: data.localidade || undefined,
        state: data.uf || undefined,
      };
    } catch {
      return {};
    }
  }

  async function applyExtraction(payload: ExtractedPayload) {
    const fields = payload.fields || {};
    const patch: Partial<Enterprise> = {};
    const updated: string[] = [];
    const missing: string[] = [];

    const zip = normalizeString(fields.zipCode?.value);
    const cepData = zip ? await enrichByCep(zip) : {};

    const address =
      normalizeString(fields.address?.value) ||
      normalizeString(cepData.address);
    const addressNumber = normalizeString(fields.addressNumber?.value);
    const neighborhood =
      normalizeString(fields.neighborhood?.value) ||
      normalizeString(cepData.neighborhood);
    const city =
      normalizeString(fields.city?.value) || normalizeString(cepData.city);
    const state =
      normalizeString(fields.state?.value) || normalizeString(cepData.state);

    const landArea = normalizeNumber(fields.landArea?.value);
    const builtArea = normalizeNumber(fields.builtArea?.value);
    const privateArea = normalizeNumber(fields.privateArea?.value);
    const commonArea = normalizeNumber(fields.commonArea?.value);
    const sellableArea = normalizeNumber(fields.sellableArea?.value);

    const explicitType = normalizeString(fields.type?.value);
    const inferredType = inferEnterpriseType(
      explicitType || normalizeString(fields.use?.value),
    );

    const applyString = (
      label: string,
      key: keyof Enterprise,
      value: string,
    ) => {
      if (!value) {
        missing.push(label);
        return;
      }
      patch[key] = value as never;
      updated.push(label);
    };

    const applyNumber = (
      label: string,
      key: keyof Enterprise,
      value: number | null,
    ) => {
      if (value == null) {
        missing.push(label);
        return;
      }
      patch[key] = value as never;
      updated.push(label);
    };

    applyString("logradouro", "address", address);
    applyString("número", "addressNumber", addressNumber);
    applyString("bairro", "neighborhood", neighborhood);
    applyString("cidade", "city", city);
    applyString("UF", "state", state);

    applyNumber("área do terreno", "landArea", landArea);
    applyNumber("área construída", "builtArea", builtArea);
    applyNumber("área privativa", "privateArea", privateArea);
    applyNumber("área comum", "commonArea", commonArea);
    applyNumber("área vendável", "sellableArea", sellableArea);

    if (inferredType) {
      patch.type = inferredType;
      updated.push("tipo de empreendimento");
    }

    updateEnterprise(patch);

    const summary = [
      updated.length
        ? `Campos atualizados: ${updated.join(", ")}.`
        : "Nenhum campo foi atualizado.",
      missing.length
        ? `Campos não encontrados no PDF: ${missing.join(", ")}.`
        : "Todos os campos mapeados foram encontrados.",
      zip ? `CEP extraído: ${zip}.` : "CEP não encontrado no PDF.",
    ].join("\n");

    setMsgs((prev) => [
      ...prev,
      { role: "assistant", content: summary },
    ]);

    toast.success(
      updated.length
        ? "PDF lido e dados aplicados no app"
        : "PDF lido, mas sem dados novos para aplicar",
    );
  }

  async function analyzePdfAndAutofill() {
    if (!selectedFile) {
      toast.error("Anexe um PDF primeiro");
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Neste fluxo, envie um PDF");
      return;
    }

    setLoading(true);
    setMsgs((prev) => [
      ...prev,
      {
        role: "user",
        content: `Analisar PDF e preencher app: ${selectedFile.name}`,
      },
    ]);

    try {
      const base64 = await fileToBase64(selectedFile);

      const resp = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system:
            "Você é um especialista sênior em incorporação imobiliária, leitura documental e extração estruturada. Responda em português do Brasil.",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: buildAutofillPrompt(context, selectedFile.name),
                },
                {
                  type: "document",
                  source: {
                    media_type: "application/pdf",
                    data: base64,
                  },
                },
              ],
            },
          ],
          max_tokens: 2500,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || `Erro HTTP ${resp.status}`);
      }

      const answer = Array.isArray(data?.content)
        ? data.content
            .filter((item: any) => item?.type === "text")
            .map((item: any) => item?.text || "")
            .join("\n")
            .trim()
        : "";

      const parsed = extractJsonFromText(answer);

      if (!parsed?.fields) {
        throw new Error("A IA não retornou um JSON válido de extração");
      }

      setLastExtraction(parsed);
      await applyExtraction(parsed);
    } catch (err: any) {
      const message = err?.message || "falha inesperada";
      setMsgs((prev) => [
        ...prev,
        { role: "assistant", content: `Erro ao analisar PDF: ${message}` },
      ]);
      toast.error(`Erro ao analisar PDF: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMsgs: ChatMessage[] = [...msgs, { role: "user", content: text }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system: [
            "Você é um especialista sênior em incorporação imobiliária e viabilidade.",
            "Responda em português do Brasil.",
            "Seja objetivo, técnico e útil.",
            "Considere o contexto do projeto atual enviado no system prompt.",
            "Quando faltar dado documental, diga explicitamente que o documento não traz a informação.",
            "",
            "CONTEXTO DO PROJETO:",
            JSON.stringify(context, null, 2),
          ].join("\n"),
          messages: nextMsgs.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 1200,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || `Erro HTTP ${resp.status}`);
      }

      let answer = "Sem resposta.";

      if (Array.isArray(data?.content)) {
        answer =
          data.content
            .filter((item: any) => item?.type === "text")
            .map((item: any) => item?.text || "")
            .join("\n")
            .trim() || "Sem resposta.";
      }

      setMsgs((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err: any) {
      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Erro ao consultar a IA: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const extractedSummary = useMemo(() => {
    if (!lastExtraction?.fields) return [] as string[];

    const f = lastExtraction.fields;

    return [
      f.address?.value ? `Logradouro: ${f.address.value}` : "",
      f.addressNumber?.value ? `Número: ${f.addressNumber.value}` : "",
      f.neighborhood?.value ? `Bairro: ${f.neighborhood.value}` : "",
      f.city?.value ? `Cidade: ${f.city.value}` : "",
      f.state?.value ? `UF: ${f.state.value}` : "",
      f.zipCode?.value ? `CEP: ${f.zipCode.value}` : "",
      f.landArea?.value != null ? `Área do terreno: ${f.landArea.value}` : "",
      f.builtArea?.value != null
        ? `Área construída: ${f.builtArea.value}`
        : "",
      f.privateArea?.value != null
        ? `Área privativa: ${f.privateArea.value}`
        : "",
      f.commonArea?.value != null ? `Área comum: ${f.commonArea.value}` : "",
    ].filter(Boolean);
  }, [lastExtraction]);

  const extractionRows = useMemo(() => {
    if (!lastExtraction?.fields) return [] as ExtractionRow[];

    const entries: Array<[string, ExtractedField<any> | undefined]> = [
      ["Logradouro", lastExtraction.fields.address],
      ["Número", lastExtraction.fields.addressNumber],
      ["Bairro", lastExtraction.fields.neighborhood],
      ["Cidade", lastExtraction.fields.city],
      ["UF", lastExtraction.fields.state],
      ["CEP", lastExtraction.fields.zipCode],
      ["Área do terreno", lastExtraction.fields.landArea],
      ["Área construída", lastExtraction.fields.builtArea],
      ["Área privativa", lastExtraction.fields.privateArea],
      ["Área comum", lastExtraction.fields.commonArea],
      ["Área vendável", lastExtraction.fields.sellableArea],
      ["Tipo", lastExtraction.fields.type],
      ["Processo", lastExtraction.fields.process],
      ["Uso", lastExtraction.fields.use],
      ["Grupo de uso", lastExtraction.fields.useGroup],
      ["Zona", lastExtraction.fields.zone],
    ];

    return entries
      .filter(
        ([, field]) =>
          field && field.value != null && String(field.value).trim() !== "",
      )
      .map(([label, field]) => ({
        label,
        value: String(field?.value ?? ""),
        page: field?.page != null ? String(field.page) : "-",
        confidence:
          field?.confidence != null &&
          Number.isFinite(Number(field.confidence))
            ? `${Math.round(Number(field.confidence) * 100)}%`
            : "-",
        sourceText: String(field?.sourceText ?? "").trim(),
      }));
  }, [lastExtraction]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 9999,
            width: 60,
            height: 60,
            borderRadius: "999px",
            border: `1px solid ${T.bBright}`,
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldL})`,
            color: "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,.35)",
            cursor: "pointer",
          }}
          aria-label="Abrir assistente de IA"
          title="Abrir assistente de IA"
        >
          <Sparkles size={24} />
        </button>
      )}

      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 9999,
            width: 420,
            maxWidth: "calc(100vw - 24px)",
            height: 640,
            maxHeight: "calc(100vh - 24px)",
            background: T.card,
            border: `1px solid ${T.bBright}`,
            borderRadius: 18,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 60px rgba(0,0,0,.45)",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${T.border}`,
              background: `linear-gradient(135deg, #091428, #0d1c38)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>
                Assistente de IA
              </div>
              <div style={{ color: T.sub, fontSize: 11 }}>
                Chat + leitura de AOP em PDF
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: T.muted,
                cursor: "pointer",
              }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              padding: 12,
              borderBottom: `1px solid ${T.border}`,
              background: T.surf,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
              }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: `1px solid ${T.bBright}`,
                  background: "#0b1730",
                  color: T.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Upload size={15} />
                Anexar PDF
              </button>

              <button
                onClick={analyzePdfAndAutofill}
                disabled={loading || !selectedFile}
                style={{
                  flex: 1.2,
                  height: 38,
                  borderRadius: 10,
                  border: `1px solid ${T.bBright}`,
                  background: loading || !selectedFile ? "#334155" : T.gold,
                  color: "#111827",
                  cursor:
                    loading || !selectedFile ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileText size={15} />
                )}
                Ler PDF e preencher
              </button>
            </div>

            {selectedFile && (
              <div
                style={{
                  color: T.sub,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={14} color={T.green} />
                {selectedFile.name}
              </div>
            )}

            {extractedSummary.length > 0 && (
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  background: "#0b1730",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>
                  Última extração
                </div>
                {extractedSummary.slice(0, 6).map((line) => (
                  <div key={line} style={{ color: T.sub, fontSize: 11 }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>

          {extractionRows.length > 0 && (
            <div
              style={{
                padding: 12,
                borderBottom: `1px solid ${T.border}`,
                background: "#081120",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              <div style={{ color: T.text, fontSize: 12, fontWeight: 700 }}>
                Origem dos campos aplicados
              </div>

              {extractionRows.map((row) => (
                <div
                  key={`${row.label}-${row.value}`}
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: 8,
                    background: "#0b1730",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{ color: T.text, fontSize: 11, fontWeight: 700 }}
                  >
                    {row.label}
                  </div>
                  <div style={{ color: T.sub, fontSize: 11 }}>{row.value}</div>
                  <div style={{ color: T.muted, fontSize: 10 }}>
                    Página: {row.page} • Confiança: {row.confidence}
                  </div>
                  {row.sourceText && (
                    <div
                      style={{
                        color: T.muted,
                        fontSize: 10,
                        lineHeight: 1.35,
                      }}
                    >
                      Trecho-fonte: {row.sourceText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: T.bg,
            }}
          >
            {msgs.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: T.text,
                  background: msg.role === "user" ? "#1e293b" : "#0b1730",
                  border: `1px solid ${T.border}`,
                }}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: T.sub,
                  fontSize: 13,
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                Processando...
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              padding: 12,
              background: T.surf,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Pergunte algo sobre o projeto ou sobre o PDF..."
                rows={2}
                style={{
                  flex: 1,
                  resize: "none",
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: "#0b1730",
                  color: T.text,
                  padding: 10,
                  outline: "none",
                  fontSize: 13,
                }}
              />

              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 46,
                  minWidth: 46,
                  borderRadius: 12,
                  border: `1px solid ${T.bBright}`,
                  background: loading ? "#334155" : T.gold,
                  color: "#111827",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Enviar"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
