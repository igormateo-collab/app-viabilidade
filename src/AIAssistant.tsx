// api/ai-chat.js — Proxy Híbrido
// Chat de texto → Groq (grátis, rápido)
// PDF / Imagens  → Gemini 1.5 Flash (grátis, lê arquivos)
//
// Variáveis no Vercel (Settings → Environment Variables):
//   GROQ_API_KEY   = gsk_...   (console.groq.com)
//   GEMINI_API_KEY = AIza...   (aistudio.google.com)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system, max_tokens } = req.body || {};

  // Detecta se há arquivo (imagem ou PDF) em qualquer mensagem
  const hasFile = (messages || []).some(msg =>
    Array.isArray(msg.content) &&
    msg.content.some(b => b.type === "image" || b.type === "document")
  );

  if (hasFile) {
    // ── GEMINI — leitura de arquivos ─────────────────────────
    return handleGemini(req, res, messages, system, max_tokens);
  } else {
    // ── GROQ — chat de texto ──────────────────────────────────
    return handleGroq(req, res, messages, system, max_tokens);
  }
}

// ─────────────────────────────────────────────────────────────
// GROQ — chat texto
// ─────────────────────────────────────────────────────────────
async function handleGroq(req, res, messages, system, max_tokens) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY não configurada no Vercel. Acesse console.groq.com e crie sua chave grátis."
    });
  }

  try {
    const groqMessages = [];
    if (system) groqMessages.push({ role: "system", content: system });

    for (const msg of messages || []) {
      let content = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join("\n");
      }
      if (content.trim()) groqMessages.push({ role: msg.role, content });
    }

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: max_tokens || 1200,
        temperature: 0.7,
      }),
    });

    const d = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({
        error: d.error && d.error.message ? d.error.message : JSON.stringify(d)
      });
    }

    const text = d.choices && d.choices[0] && d.choices[0].message
      ? d.choices[0].message.content
      : "Sem resposta.";

    return res.status(200).json({
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GEMINI — leitura de PDF e imagens
// ─────────────────────────────────────────────────────────────
async function handleGemini(req, res, messages, system, max_tokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY não configurada no Vercel. Para ler PDFs e imagens, acesse aistudio.google.com e crie sua chave grátis."
    });
  }

  try {
    const geminiContents = [];

    // System como contexto inicial
    if (system) {
      geminiContents.push({
        role: "user",
        parts: [{ text: `[INSTRUÇÕES]\n${system}\n[FIM]` }]
      });
      geminiContents.push({
        role: "model",
        parts: [{ text: "Entendido. Pronto para analisar o documento." }]
      });
    }

    // Processa mensagens
    for (const msg of messages || []) {
      const role = msg.role === "assistant" ? "model" : "user";
      const parts = [];

      if (typeof msg.content === "string") {
        if (msg.content.trim()) parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            parts.push({ text: block.text });
          } else if (block.type === "image" && block.source && block.source.data) {
            parts.push({
              inlineData: {
                mimeType: block.source.media_type || "image/jpeg",
                data: block.source.data,
              }
            });
          } else if (block.type === "document" && block.source && block.source.data) {
            parts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: block.source.data,
              }
            });
          }
        }
      }

      if (parts.length > 0) geminiContents.push({ role, parts });
    }

    // Mescla mensagens consecutivas do mesmo role
    const cleaned = [];
    for (const cur of geminiContents) {
      const last = cleaned[cleaned.length - 1];
      if (last && last.role === cur.role) {
        last.parts = last.parts.concat(cur.parts);
      } else {
        cleaned.push({ role: cur.role, parts: cur.parts.slice() });
      }
    }

    // Gemini 1.5 Flash — suporta PDF e imagens gratuitamente
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: cleaned,
        generationConfig: {
          maxOutputTokens: max_tokens || 2500,
          temperature: 0.3, // mais preciso para extração
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    const d = await r.json();

    if (!r.ok) {
      const errMsg = d.error && d.error.message ? d.error.message : JSON.stringify(d);
      return res.status(r.status).json({ error: errMsg });
    }

    const candidates = d.candidates || [];
    const parts = (candidates[0] && candidates[0].content && candidates[0].content.parts) || [];
    const text = parts.filter(p => p.text).map(p => p.text).join("");

    if (!text && candidates[0] && candidates[0].finishReason === "SAFETY") {
      return res.status(200).json({
        content: [{ type: "text", text: "Conteúdo bloqueado pelo filtro do Google." }],
        stop_reason: "end_turn",
      });
    }

    return res.status(200).json({
      content: [{ type: "text", text: text || "Sem resposta da análise do arquivo." }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
