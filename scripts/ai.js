/* ai.js - Free, tokenless model via Hugging Face public inference widget endpoints.
   Note: Public widgets throttle and may rate-limit. For production, use your own HF Space.
*/

const EcoAI = (() => {
  const MODEL_URL = "https://hf.space/embed/mteb/CFGPT/+/api/predict"; 
  // If this endpoint ever changes or rate-limits, fork any HF Space with a text-gen model
  // and replace MODEL_URL with its /api/predict endpoint.

  async function analyze({ text = "", imageName = "", location = "" }) {
    const prompt = buildPrompt(text, location);
    const out = await callFreeModel(prompt);
    const parsed = safeParse(out);

    // Minimal edible guess client-side (no token, keeps it free)
    const edible = guessEdible(text + " " + imageName);

    return {
      input: { text, imageName, location },
      edible: { isEdible: edible.isEdible, confidence: edible.confidence, explain: edible.explain },
      nutrition: edible.isEdible ? (parsed.nutrition || null) : null,
      eco: parsed.eco || { materials: [], carbonTier: "Unknown", recyclable: false, guidance: [] },
      alternatives: parsed.alternatives || [],
      tips: parsed.tips || [],
      overallConfidence: Math.round((edible.confidence + 0.6) * 50) / 100,
      timestamp: Date.now()
    };
  }

  function buildPrompt(text, location){
    return `
Return strict JSON only (no prose) with keys:
nutrition (object or null), eco (object), alternatives (array), tips (array).
Analyze: "${text}"
Location: "${location || 'N/A'}"
JSON schema:
{
 "nutrition": {"serving": "100 g/ml", "values":{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"calcium_mg":0,"iron_mg":0}, "assumptions":"..."} | null,
 "eco":{"materials":["string"],"carbonTier":"Very High|High|Medium|Low","recyclable":true,"guidance":["string"]},
 "alternatives":[{"item":"string","why":"string"}],
 "tips":["string"]
}
`.trim();
  }

  async function callFreeModel(prompt){
    // HF Spaces gradio API format
    const res = await fetch(MODEL_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ data: [prompt] })
    });
    const data = await res.json();
    // Many Spaces return { data: [ "...text..." ] }
    const text = Array.isArray(data?.data) ? String(data.data[0] || "") : "";
    const json = extractJson(text);
    return json || text;
  }

  function extractJson(s){
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) return s.slice(start, end+1);
    return "";
  }

  function safeParse(s){
    try {
      const o = JSON.parse(s);
      if (!o || typeof o !== "object") return {};
      if (o.nutrition && typeof o.nutrition !== "object") o.nutrition = null;
      if (!o.eco) o.eco = { materials: [], carbonTier: "Unknown", recyclable: false, guidance: [] };
      if (!Array.isArray(o.alternatives)) o.alternatives = [];
      if (!Array.isArray(o.tips)) o.tips = [];
      return o;
    } catch { return {}; }
  }

  function guessEdible(t){
    t = (t||"").toLowerCase();
    const edibleHints = ["apple","banana","bread","milk","oat","almond","soy","yogurt","cheese","beef","chicken","tofu","bean","lentil","rice","pasta","chocolate","cookie","cereal","egg","coffee","tea","juice","soda"];
    const hit = edibleHints.find(k=>t.includes(k));
    let confidence = hit ? 0.85 : 0.35;
    if (t.includes("pet")||t.includes("bottle")||t.includes("plastic")) confidence = Math.min(confidence, 0.3);
    return { isEdible: confidence>0.5, confidence, explain: `Heuristic signal: ${hit || "none"}` };
  }

  function explain(result){
    const e = result.edible;
    const eco = result.eco || {};
    return `Edible ${e?.isEdible?"Yes":"No"} (conf ${e?.confidence}). Materials: ${eco.materials?.join(", ")||"n/a"}, Carbon ${eco.carbonTier||"n/a"}.`;
  }

  return { analyze, explain };
})();
