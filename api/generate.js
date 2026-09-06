module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  try {
    const { image, prompt } = req.body;
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return res.status(500).json({error:'No token'});
    
    const r = await fetch("https://api.replicate.com/v1/models/zsxkib/instant-id/predictions", {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { image: image, prompt: prompt, ip_adapter_scale: 0.8 } })
    });
    let pred = await r.json();
    if (pred.error) return res.status(500).json({error: pred.error});
    
    while (pred.status !== "succeeded" && pred.status !== "failed") {
      await new Promise(x=>setTimeout(x,3000));
      const pr = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, { headers: { Authorization: `Token ${token}` } });
      pred = await pr.json();
    }
    if (pred.status === "failed") return res.status(500).json({error: pred.error});
    return res.status(200).json({output: pred.output});
  } catch(e) { return res.status(500).json({error:e.message}); }
}
