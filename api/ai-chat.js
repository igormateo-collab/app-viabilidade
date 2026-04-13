// api/ai-chat.js — Google Gemini 1.5 Flash (gratuito, sem cartão)
// Chave em: aistudio.google.com → Get API Key
// Vercel: Settings → Environment Variables → GEMINI_API_KEY

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no Vercel." });
  }

  try {
    const { messages, system, max_tokens } = req.body;
    const geminiContents = [];

    // System prompt injetado como contexto inicial
    if (system) {
      geminiContents.push({
        role: "user",
        parts: [{ text: `[INSTRUÇÕES]\n${system}\n[FIM]\n\nEntendido. Vou seguir essas instruções.` }]
      });
      geminiContents.push({
        role: "model",
        parts: [{ text: "Entendido. Sou especialista em incorporação imobiliária na Bahia e no Brasil. Como posso ajudar?" }]
      });
    }

    // Processa histórico de mensagens
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

    // Mescla mensagens consecutivas do mesmo role (Gemini exige alternância)
    const cleaned = [];
    for (let i = 0; i < geminiContents.length; i++) {
      const cur = geminiContents[i];
      const last = cleaned[cleaned.length - 1];
      if (last && last.role === cur.role) {
        last.parts = last.parts.concat(cur.parts);
      } else {
        cleaned.push({ role: cur.role, parts: cur.parts.slice() });
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: cleaned,
        generationConfig: {
          maxOutputTokens: max_tokens || 1200,
          temperature: 0.7,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error && data.error.message ? data.error.message : JSON.stringify(data) });
    }

    // Extrai texto da resposta
    const candidates = data.candidates || [];
    const firstCandidate = candidates[0] || {};
    const contentParts = (firstCandidate.content && firstCandidate.content.parts) || [];
    const text = contentParts.filter(p => p.text).map(p => p.text).join("");

    if (!text && firstCandidate.finishReason === "SAFETY") {
      return res.status(200).json({
        content: [{ type: "text", text: "Resposta bloqueada pelo filtro do Google. Reformule a pergunta." }],
        stop_reason: "end_turn",
      });
    }

    return res.status(200).json({
      content: [{ type: "text", text: text || "Sem resposta. Tente novamente." }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
