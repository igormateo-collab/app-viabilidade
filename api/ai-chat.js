// api/ai-chat.js — Groq (gratuito, sem cartão)
// 1. Acesse console.groq.com → crie conta → API Keys → Create API Key
// 2. Copie a chave (começa com gsk_...)
// 3. Vercel → Settings → Environment Variables → GROQ_API_KEY = gsk_...
// 4. Redeploy

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada no Vercel." });
  }

  try {
    const { messages, system, max_tokens } = req.body;

    // Monta mensagens no formato Groq/OpenAI
    const groqMessages = [];

    // System prompt
    if (system) {
      groqMessages.push({ role: "system", content: system });
    }

    // Histórico — Groq só aceita string como content
    for (const msg of messages || []) {
      let content = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Extrai só o texto (Groq não processa imagens)
        content = msg.content
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join("\n");
      }
      if (content.trim()) {
        groqMessages.push({ role: msg.role, content });
      }
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error && data.error.message ? data.error.message : JSON.stringify(data)
      });
    }

    const text = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";

    // Retorna no formato que o AIAssistant espera
    return res.status(200).json({
      content: [{ type: "text", text: text || "Sem resposta. Tente novamente." }],
      stop_reason: "end_turn",
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
