export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'Missing REPLICATE_API_TOKEN env var' });
  try {
    const { image, prompt, face_strength = 0.8, control_scale = 0.6 } = req.body;
    if (!image || !prompt) return res.status(400).json({ error: 'image and prompt required' });

    // Create prediction with InstantID
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: "a07dc4d922f7ff935b9bb0efba37540f4a89044f0d92b9dcb97cf0f0f65b377e7",
        input: {
          image: image,
          prompt: prompt,
          negative_prompt: "low quality, blurry, deformed face",
          ip_adapter_scale: face_strength,
          controlnet_conditioning_scale: control_scale,
          num_inference_steps: 30,
          guidance_scale: 5
        }
      })
    });
    const pred = await createRes.json();
    if (pred.error) return res.status(500).json({ error: pred.error });
    let result = pred;
    // Poll
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { Authorization: `Token ${token}` }
      });
      result = await poll.json();
    }
    if (result.status === 'failed') return res.status(500).json({ error: result.error || 'Generation failed' });
    const out = Array.isArray(result.output) ? result.output[0] : result.output;
    return res.status(200).json({ image: out });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
