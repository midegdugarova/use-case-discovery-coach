export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
  }

  const { messages, system, maxTokens = 1000 } = req.body || {};

  if (!Array.isArray(messages) || typeof system !== "string") {
    return res.status(400).json({ error: "Expected messages array and system string" });
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return res.status(upstream.status).json({
      error: data.error?.message || "OpenAI request failed",
    });
  }

  return res.status(200).json({
    text: data.choices?.[0]?.message?.content || "",
  });
}
