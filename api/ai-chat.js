// api/ai-chat.js — Google Gemini 1.5 Flash (gratuito, sem cartão)
// Chave em: aistudio.google.com → Get API Key
// Vercel: Settings → Environment Variables → GEMINI_API_KEY

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY não configurada no Vercel."
    });
  }

  try {
    const { messages, system, max_tokens } = req.body;

    const geminiContents = [];

    // Injeta o system prompt como primeira mensagem do usuário
    // (API v1 não tem systemInstruction — colocamos no início do contexto)
    if (system) {
      geminiContents.push({
        role: "user",
        parts: [{ text: `[INSTRUÇÕES DO SISTEMA]\n${system}\n[FIM DAS INSTRUÇÕES]\n\nEntendido. Vou seguir essas instruções.` }]
      });
      geminiContents.push({
        role: "model",
        parts: [{ text: "Entendido. Sou um especialista em incorporação imobiliária na Bahia e no Brasil. Como posso ajudar?" }]
      });
    }

    // Processa as mensagens do histórico
    for (const msg of messages || []) {
      const role = msg.role === "assistant" ? "model" : "user";
      const parts = [];

      if (typeof msg.content === "string") {
        if (msg.content.trim()) {
          parts.push({ text: msg.content });
        }
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            parts.push({ text: block.text });
          } else if (block.type === "image" && block.source?.data) {
            parts.push({
              inlineData: {
                mimeType: block.source.media_type || "image/jpeg",
                data: block.source.data,
              }
            });
          } else if (block.type === "document" && block.source?.data) {
            parts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: block.source.data,
              }
            });
          }
        }
      }

      if (parts.length > 0) {
        geminiContents.push({ role, parts });
      }
    }

    // Garante que a última mensagem seja do usuário
    // (Gemini exige que o histórico alterne user/model)
    const cleaned = [];
    for (let i = 0; i < geminiContents.length; i++) {
      const cur = geminiContents[i];
      const last = cleaned[cleaned.length - 1];
      if (last && last.role === cur.role) {
        // Mescla partes se mesmo role em sequência
        last.parts = [...last.parts, ...cur.parts];
      } else {
        cleaned.push({ ...cur, parts: [...cur.parts] });
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
      const errMsg = data.error?.message || JSON.stringify(data);
      return res.status(response.status).json({ error: errMsg });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      ?.map((p: any) => p.text)
      ?.join("") || "";

    // Safety block
    if (!text && data.candidates?.[0]?.finishReason === "SAFETY") {
      return res.status(200).json({
        content: [{ type: "text", text: "Resposta bloqueada pelo filtro do Google. Reformule a pergunta." }],
        stop_reason: "end_turn",
      });
    }

    return res.status(200).json({
      content: [{ type: "text", text: text || "Sem resposta. Tente novamente." }],
      stop_reason: "end_turn",
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
