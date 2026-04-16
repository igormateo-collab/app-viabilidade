async function handleGemini(req, res, messages, system, max_tokens) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY não configurada no Vercel. Para ler PDFs e imagens, crie sua chave no Google AI Studio.",
    });
  }

  try {
    const geminiContents = [];

    if (system) {
      geminiContents.push({
        role: "user",
        parts: [{ text: `[INSTRUÇÕES]\n${system}\n[FIM]` }],
      });

      geminiContents.push({
        role: "model",
        parts: [{ text: "Entendido. Pronto para analisar o documento." }],
      });
    }

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
          } else if (block.type === "image" && block.source && block.source.data) {
            parts.push({
              inlineData: {
                mimeType: block.source.media_type || "image/jpeg",
                data: block.source.data,
              },
            });
          } else if (block.type === "document" && block.source && block.source.data) {
            parts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: block.source.data,
              },
            });
          }
        }
      }

      if (parts.length > 0) {
        geminiContents.push({ role, parts });
      }
    }

    const cleaned = [];

    for (const cur of geminiContents) {
      const last = cleaned[cleaned.length - 1];
      if (last && last.role === cur.role) {
        last.parts = last.parts.concat(cur.parts);
      } else {
        cleaned.push({ role: cur.role, parts: cur.parts.slice() });
      }
    }

    const model = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: cleaned,
        generationConfig: {
          maxOutputTokens: max_tokens || 2500,
          temperature: 0.2,
        },
      }),
    });

    const d = await r.json();

    if (!r.ok) {
      const errMsg =
        d?.error?.message ? d.error.message : JSON.stringify(d);
      return res.status(r.status).json({ error: errMsg });
    }

    const candidates = d.candidates || [];
    const parts =
      (candidates[0] && candidates[0].content && candidates[0].content.parts) || [];
    const text = parts.filter((p) => p.text).map((p) => p.text).join("");

    return res.status(200).json({
      content: [{ type: "text", text: text || "Sem resposta da análise do arquivo." }],
      stop_reason: "end_turn",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
