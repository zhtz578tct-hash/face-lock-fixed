module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { image, prompt } = req.body;
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return res.status(500).json({ error: 'No REPLICATE_API_TOKEN' });

    // Correct endpoint - use version, not /models/.../predictions
    const version = "11219f80ba03ca1ce78194191ffa4fc74f7c1afeef50df95f477aa66f2f65bc5";
    
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version: version,
        input: {
          image: image,
          prompt: prompt,
          ip_adapter_scale: 0.8,
          controlnet_conditioning_scale: 0.8
        }
      })
    });
    
    let pred = await createRes.json();
    if (pred.error || pred.detail) return res.status(500).json({ error: pred.detail || pred.error || JSON.stringify(pred) });

    // Poll until done
    while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled") {
      await new Promise(r => setTimeout(r, 2500));
      const getRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { Authorization: `Token ${token}` }
      });
      pred = await getRes.json();
    }

    if (pred.status === "failed") return res.status(500).json({ error: pred.error || "Generation failed" });
    return res.status(200).json({ output: pred.output });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
