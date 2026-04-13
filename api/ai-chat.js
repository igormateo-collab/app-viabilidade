// api/ai-chat.js — Proxy Vercel usando Google Gemini (gratuito)
// Chave grátis em: aistudio.google.com → "Get API Key" → "Create API Key"
// Coloque no Vercel: Settings → Environment Variables → GEMINI_API_KEY
//
// Suporta: texto, imagens (PNG/JPG/WEBP), PDF
// Modelo: gemini-2.0-flash — rápido, gratuito e com visão computacional

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY não configurada no Vercel. Acesse aistudio.google.com, crie sua chave grátis e adicione em Settings → Environment Variables."
    });
  }

  try {
    const { messages, system, max_tokens } = req.body;

    // Monta partes do conteúdo para o Gemini
    const geminiContents = [];

    // Processa cada mensagem
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
            // Imagem base64 — Gemini suporta diretamente
            parts.push({
              inlineData: {
                mimeType: block.source.media_type || "image/jpeg",
                data: block.source.data,
              }
            });
          } else if (block.type === "document" && block.source?.data) {
            // PDF — Gemini 2.0 suporta PDF via inlineData
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

    // System instruction separada (Gemini tem campo próprio)
    const systemInstruction = system
      ? { parts: [{ text: system }] }
      : undefined;

    const requestBody = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: max_tokens || 1200,
        temperature: 0.7,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction;
    }

    // Gemini 1.5 Flash — gratuito com visão e PDF
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || JSON.stringify(data);
      return res.status(response.status).json({ error: errMsg });
    }

    // Extrai texto da resposta Gemini
    const text = data.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join("") || "";

    if (!text) {
      // Verifica se foi bloqueado por safety
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === "SAFETY") {
        return res.status(200).json({
          content: [{ type: "text", text: "Resposta bloqueada por filtro de segurança do Google. Reformule a pergunta." }],
          stop_reason: "end_turn",
        });
      }
    }

    // Retorna no formato que o AIAssistant espera
    return res.status(200).json({
      content: [{ type: "text", text: text || "Sem resposta. Tente novamente." }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
