const Replicate = require("replicate");
module.exports = async (req, res) => {
  if (req.method!== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { image, prompt } = req.body;
    const token = process.env.REPLICATE_API_TOKEN;
    const replicate = new Replicate({ auth: token });
    const base64 = image.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    const output = await replicate.run("zsxkib/instant-id", { input: { image: buffer, prompt: prompt } });
    return res.status(200).json({ output: output });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
