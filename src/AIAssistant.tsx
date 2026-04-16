import { useMemo, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const T = {
  bg: "#030b1a",
  surf: "#061020",
  card: "#091428",
  border: "#0f1f3d",
  bBright: "#1a3560",
  gold: "#c9a227",
  goldL: "#f0c040",
  text: "#e2e8f0",
  sub: "#94a3b8",
  muted: "#64748b",
};

export default function AIAssistant() {
  const project = useProject();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Sou seu assistente de viabilidade. Posso analisar o projeto atual, responder dúvidas e ajudar com cenários.",
    },
  ]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            height: 560,
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
                Viabilidade imobiliária
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
                Pensando...
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
                placeholder="Pergunte algo sobre o projeto..."
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
