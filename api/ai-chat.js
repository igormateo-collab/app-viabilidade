// api/ai-chat.js — Proxy híbrido
// Chat de texto → Groq  (GROQ_API_KEY)
// PDF / Imagens  → Gemini 1.5 Flash (GEMINI_API_KEY)

function temArquivo(messages) {
  return (messages || []).some(function (msg) {
    return Array.isArray(msg.content) &&
      msg.content.some(function (b) {
        return b.type === "image" || b.type === "document";
      });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system, max_tokens } = req.body || {};

  if (temArquivo(messages)) {
    return handleGemini(res, messages, system, max_tokens);
  }
  return handleGroq(res, messages, system, max_tokens);
}

// ── GROQ — chat de texto ──────────────────────────────────────
async function handleGroq(res, messages, system, max_tokens) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada no Vercel." });
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
          .filter(function (b) { return b.type === "text"; })
          .map(function (b) { return b.text; })
          .join("\n");
      }
      if (content.trim()) groqMessages.push({ role: msg.role, content: content });
    }
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
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
      content: [{ type: "text", text: text }],
      stop_reason: "end_turn",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── GEMINI — PDF e imagens ────────────────────────────────────
async function handleGemini(res, messages, system, max_tokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no Vercel." });
  }
  try {
    const contents = [];

    // System como contexto inicial
    if (system) {
      contents.push({ role: "user", parts: [{ text: "[INSTRUCOES]\n" + system + "\n[FIM]" }] });
      contents.push({ role: "model", parts: [{ text: "Entendido. Pronto para analisar." }] });
    }

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
            parts.push({ inlineData: { mimeType: block.source.media_type || "image/jpeg", data: block.source.data } });
          } else if (block.type === "document" && block.source && block.source.data) {
            parts.push({ inlineData: { mimeType: "application/pdf", data: block.source.data } });
          }
        }
      }
      if (parts.length > 0) contents.push({ role: role, parts: parts });
    }

    // Mescla mensagens consecutivas do mesmo role
    const cleaned = [];
    for (const cur of contents) {
      const last = cleaned[cleaned.length - 1];
      if (last && last.role === cur.role) {
        last.parts = last.parts.concat(cur.parts);
      } else {
        cleaned.push({ role: cur.role, parts: cur.parts.slice() });
      }
    }

    const url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: cleaned,
        generationConfig: {
          maxOutputTokens: max_tokens || 2500,
          temperature: 0.3,
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
      const msg = d.error && d.error.message ? d.error.message : JSON.stringify(d);
      return res.status(r.status).json({ error: msg });
    }

    const candidates = d.candidates || [];
    const parts = (candidates[0] && candidates[0].content && candidates[0].content.parts) || [];
    const text = parts.filter(function (p) { return p.text; }).map(function (p) { return p.text; }).join("");

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
