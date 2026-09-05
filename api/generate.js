export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  try {
    const { image, prompt } = req.body;
    const token = process.env.REPLICATE_API_TOKEN;
    
    const response = await fetch("https://api.replicate.com/v1/models/zsxkib/instant-id/predictions", {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          image: image,
          prompt: prompt,
          ip_adapter_scale: 0.8,
          controlnet_conditioning_scale: 0.8
        }
      })
    });
    
    let prediction = await response.json();
    if (prediction.error) return res.status(500).json({error: prediction.error});

    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise(r => setTimeout(r, 2500));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${token}` }
      });
      prediction = await pollRes.json();
    }

    if (prediction.status === "failed") return res.status(500).json({error: prediction.error});
    return res.status(200).json({ output: prediction.output });

  } catch (e) {
    return res.status(500).json({error: e.message});
  }
}
