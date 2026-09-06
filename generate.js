module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const { image, prompt } = req.body;
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set in Vercel Settings' });
    }
    if (!image || !prompt) {
      return res.status(400).json({ error: 'image and prompt required' });
    }
    const version = "11219f80ba03ca1ce78194191ffa4fc74f7c1afeef50df95f477aa66f2f65bc5";
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: version,
        input: {
          image: image,
          prompt: prompt,
          negative_prompt: "shorts, short shorts, hot pants, revealing clothes, bikini, tattoo on thigh, distorted face, deformed face, blurry face, extra eyes, crooked eyes, stretched smile, high heels, stiletto, glitch, corrupted",
          width: 640,
          height: 960,
          num_inference_steps: 40,
          guidance_scale: 7,
          ip_adapter_scale: 1.0,
          controlnet_conditioning_scale: 1.0,
        },
      }),
    });
    let pred = await createRes.json();
    if (pred.detail || pred.error) {
      return res.status(500).json({ error: pred.detail || pred.error || JSON.stringify(pred) });
    }
    let attempts = 0;
    while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled" && attempts < 40) {
      await new Promise((r) => setTimeout(r, 2500));
      const getRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { Authorization: `Token ${token}` },
      });
      pred = await getRes.json();
      attempts++;
    }
    if (pred.status === "failed") {
      return res.status(500).json({ error: pred.error || "Generation failed" });
    }
    if (pred.status !== "succeeded") {
      return res.status(500).json({ error: "Timeout - try again" });
    }
    return res.status(200).json({ output: pred.output });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
