export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'})
  try {
    const { image, prompt, face_strength=0.8, control_scale=0.6 } = req.body
    if (!image || !prompt) return res.status(400).json({error:'Missing image or prompt'})
    
    const token = process.env.REPLICATE_API_TOKEN
    if (!token) return res.status(500).json({error:'Token not set on Vercel'})

    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "2e2a2728124ff05ba1bf863cc4d5f1d5c9d5f8d9b9a9a0e0e0e0e0e0e0e0e0e",
        input: {
          image: image,
          prompt: prompt + ", photorealistic, natural lighting",
          face_strength: face_strength,
          control_scale: control_scale
        }
      })
    })
    const data = await replicateRes.json()
    if (data.error) return res.status(500).json({error: data.error})
    
    // Poll for result
    let result = data
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise(r=>setTimeout(r,2000))
      const poll = await fetch(result.urls.get, {
        headers: {Authorization:`Token ${token}`}
      })
      result = await poll.json()
    }
    if (result.status === "failed") return res.status(500).json({error: result.error})
    return res.status(200).json({output: result.output})
  } catch(e) {
    return res.status(500).json({error: e.message})
  }
}
