// api/ai-chat.js — Passo 1: Groq funcionando + detector de arquivo
// GROQ_API_KEY = gsk_... (console.groq.com)

// Detecta se a requisição tem PDF ou imagem
function temArquivo(messages) {
  return (messages || []).some(function(msg) {
    return Array.isArray(msg.content) &&
      msg.content.some(function(b) {
        return b.type === "image" || b.type === "document";
      });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada no Vercel." });
  }

  const { messages, system, max_tokens } = req.body || {};

  // Por enquanto, avisa se houver arquivo (Passo 2 vai tratar isso)
  if (temArquivo(messages)) {
    return res.status(200).json({
      content: [{ type: "text", text: "⚙️ Suporte a PDF e imagens será ativado no próximo passo. Por enquanto use o chat de texto." }],
      stop_reason: "end_turn",
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
          .filter(function(b) { return b.type === "text"; })
          .map(function(b) { return b.text; })
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
