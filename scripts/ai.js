/* ai.js - Tokenless fallback + robust error handling for GitHub Pages */
const EcoAI = (() => {
  // Public, no-token text-generation Space with CORS (TinyLlama via text endpoint)
  // If this ever rate-limits, replace MODEL_URL with another Space's /api/predict or /proxy/openai route.
  const MODEL_URL = "https://hf.space/embed/ysharma/Explore-LLMs/+/api/predict"; // Gradio text-gen demo

  async function analyze({ text = "", imageName = "", location = "" }) {
    try {
      const prompt = buildPrompt(text, location);
      const out = await callFreeModel(prompt);
      const parsed = safeParse(out);

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
    } catch (err) {
      console.error("AI analyze error:", err);
      // Fallback: purely local heuristic so UI still updates
      const edible = guessEdible(text + " " + imageName);
      return {
        input: { text, imageName, location },
        edible: { isEdible: edible.isEdible, confidence: edible.confidence, explain: edible.explain + " (fallback)" },
        nutrition: edible.isEdible ? quickNutrition(text) : null,
        eco: quickEco(text),
        alternatives: quickAlts(text),
        tips: quickTips(text, location),
        overallConfidence: Math.round((edible.confidence + 0.5) * 50) / 100,
        timestamp: Date.now()
      };
    }
  }

  function buildPrompt(text, location){
    return `
Return strict JSON only with keys: nutrition, eco, alternatives, tips.
Analyze: "${text}"
Location: "${location || 'N/A'}"
Schema:
{
 "nutrition": {"serving":"100 g/ml","values":{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"calcium_mg":0,"iron_mg":0},"assumptions":"..."} | null,
 "eco":{"materials":["string"],"carbonTier":"Very High|High|Medium|Low","recyclable":true,"guidance":["string"]},
 "alternatives":[{"item":"string","why":"string"}],
 "tips":["string"]
}
`.trim();
  }

  async function callFreeModel(prompt){
    // Gradio Space: expects { data: [prompt] }
    const res = await fetch(MODEL_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ data: [prompt] })
    });
    if (!res.ok) throw new Error(`Model HTTP ${res.status}`);
    const data = await res.json();
    // Common shape: { data: [ "...text..." ] } or nested arrays
    let text = "";
    if (Array.isArray(data?.data)) {
      text = flattenToText(data.data);
    }
    const json = extractJson(text);
    if (!json) throw new Error("No JSON in model output");
    return json;
  }

  function flattenToText(arr){
    // Gradio sometimes returns nested arrays/objects; stringify anything not string
    const first = arr[0];
    if (typeof first === "string") return first;
    try { return JSON.stringify(first); } catch { return String(first); }
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

  // Heuristic fallbacks
  function guessEdible(t){
    t = (t||"").toLowerCase();
    const edibleHints = ["apple","banana","bread","milk","oat","almond","soy","yogurt","cheese","beef","chicken","tofu","bean","lentil","rice","pasta","chocolate","cookie","cereal","egg","coffee","tea","juice","soda"];
    const hit = edibleHints.find(k=>t.includes(k));
    let confidence = hit ? 0.85 : 0.35;
    if (t.includes("pet")||t.includes("bottle")||t.includes("plastic")) confidence = Math.min(confidence, 0.3);
    return { isEdible: confidence>0.5, confidence, explain: `Heuristic signal: ${hit || "none"}` };
  }

  function quickNutrition(text){
    const t = (text||"").toLowerCase();
    const base = {
      serving: "100 g/ml",
      values: { calories: 200, protein_g: 6, fat_g: 8, carbs_g: 28, fiber_g: 2, sodium_mg: 200, calcium_mg: 40, iron_mg: 1 },
      assumptions: "Heuristic fallback profile"
    };
    if (t.includes("beef")) return { serving:"100 g", values:{ calories:250, protein_g:26, fat_g:15, carbs_g:0, fiber_g:0, sodium_mg:72, calcium_mg:18, iron_mg:2.6 }, assumptions:"Beef fallback" };
    if (t.includes("beans")||t.includes("lentil")) return { serving:"100 g dry", values:{ calories:347, protein_g:21, fat_g:1.2, carbs_g:63, fiber_g:16, sodium_mg:5, calcium_mg:113, iron_mg:5.1 }, assumptions:"Legume fallback" };
    return base;
  }

  function quickEco(text){
    const t = (text||"").toLowerCase();
    const eco = { materials: [], carbonTier:"Medium", recyclable:false, guidance:[] };
    if (t.includes("beef")) eco.carbonTier = "Very High";
    if (t.includes("plastic")) { eco.materials.push("plastic"); eco.carbonTier = "High"; eco.recyclable = t.includes("pet"); eco.guidance.push("Rinse and check local plastic rules."); }
    if (t.includes("bottle")) eco.guidance.push("Keep caps on; recycle where accepted.");
    if (t.includes("steel")||t.includes("aluminum")||t.includes("can")) { eco.materials.push("metal"); eco.recyclable = true; eco.guidance.push("Rinse metal cans."); }
    if (t.includes("glass")) { eco.materials.push("glass"); eco.recyclable = true; eco.guidance.push("Rinse and remove lids."); }
    if (!eco.materials.length) eco.materials.push("unknown");
    return eco;
  }

  function quickAlts(text){
    const t = (text||"").toLowerCase();
    if (t.includes("plastic") && t.includes("bottle")) return [
      { item:"Stainless steel bottle", why:"Durable and fully recyclable" },
      { item:"Glass bottle", why:"Inert and recyclable where accepted" }
    ];
    if (t.includes("beef")) return [
      { item:"Lentils/beans", why:"Much lower emissions, high protein" },
      { item:"Tofu/tempeh", why:"Low-impact plant protein" }
    ];
    return [{ item:"Recycled-content option", why:"Reduces virgin material use" }];
  }

  function quickTips(text, location){
    const tips = ["Buy only what you’ll use", "Look for third-party certifications"];
    if (text.toLowerCase().includes("bottle")) tips.unshift("Carry a reusable bottle");
    if (location) tips.push(`Check local recycling rules for ${location}`);
    return tips.slice(0,4);
  }

  function explain(result){
    const e = result.edible;
    const eco = result.eco || {};
    return `Edible ${e?.isEdible?"Yes":"No"} (conf ${e?.confidence}). Materials: ${eco.materials?.join(", ")||"n/a"}, Carbon ${eco.carbonTier||"n/a"}.`;
  }

  return { analyze, explain };
})();
