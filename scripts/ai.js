/* ai.js - Local, reliable AI simulation (works on GitHub Pages) */
const EcoAI = (() => {
  function analyze({ text = "", imageName = "", location = "" }) {
    const edible = guessEdible(text + " " + imageName);
    const result = {
      input: { text, imageName, location },
      edible: { isEdible: edible.isEdible, confidence: edible.confidence, explain: edible.explain },
      nutrition: edible.isEdible ? estimateNutrition(text) : null,
      eco: ecoAssessment(text),
      alternatives: alternatives(text),
      tips: tips(text, location),
      overallConfidence: Math.round((edible.confidence + 0.6) * 50) / 100,
      timestamp: Date.now()
    };
    return Promise.resolve(result);
  }

  function guessEdible(t){
    t = (t||"").toLowerCase();
    const edibleHints = ["apple","banana","bread","milk","oat","almond","soy","yogurt","cheese","beef","chicken","tofu","bean","lentil","rice","pasta","chocolate","cookie","cereal","egg","coffee","tea","juice","soda"];
    const hit = edibleHints.find(k=>t.includes(k));
    let confidence = hit ? 0.85 : 0.35;
    if (t.includes("pet")||t.includes("bottle")||t.includes("plastic")) confidence = Math.min(confidence, 0.3);
    return { isEdible: confidence>0.5, confidence, explain: `Heuristic signal: ${hit || "none"}` };
  }

  function estimateNutrition(text){
    const t = (text||"").toLowerCase();
    if (t.includes("beef")) return { serving:"100 g", values:{ calories:250, protein_g:26, fat_g:15, carbs_g:0, fiber_g:0, sodium_mg:72, calcium_mg:18, iron_mg:2.6 }, assumptions:"Beef profile, 100g serving" };
    if (t.includes("bean")||t.includes("lentil")) return { serving:"100 g dry", values:{ calories:347, protein_g:21, fat_g:1.2, carbs_g:63, fiber_g:16, sodium_mg:5, calcium_mg:113, iron_mg:5.1 }, assumptions:"Legume profile, 100g" };
    return { serving:"100 g/ml", values:{ calories:200, protein_g:6, fat_g:8, carbs_g:28, fiber_g:2, sodium_mg:200, calcium_mg:40, iron_mg:1 }, assumptions:"Generic profile" };
  }

  function ecoAssessment(text){
    const t = (text||"").toLowerCase();
    const eco = { materials: [], carbonTier:"Medium", recyclable:false, guidance:[] };
    if (t.includes("beef")) eco.carbonTier = "Very High";
    if (t.includes("plastic")) { eco.materials.push("plastic"); eco.carbonTier = "High"; eco.recyclable = t.includes("pet"); eco.guidance.push("Rinse; check local plastic rules."); }
    if (t.includes("bottle")) eco.guidance.push("Keep caps on; recycle where accepted.");
    if (t.includes("steel")||t.includes("aluminum")||t.includes("can")) { eco.materials.push("metal"); eco.recyclable = true; eco.guidance.push("Rinse metal cans."); }
    if (t.includes("glass")) { eco.materials.push("glass"); eco.recyclable = true; eco.guidance.push("Rinse and remove lids."); }
    if (!eco.materials.length) eco.materials.push("unknown");
    return eco;
  }

  function alternatives(text){
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

  function tips(text, location){
    const res = ["Buy only what you’ll use", "Look for third-party certifications"];
    if ((text||"").toLowerCase().includes("bottle")) res.unshift("Carry a reusable bottle");
    if (location) res.push(`Check local recycling rules for ${location}`);
    return res.slice(0,4);
  }

  function explain(result){
    const e = result.edible; const eco = result.eco || {};
    return `Edible ${e?.isEdible?"Yes":"No"} (conf ${e?.confidence}). Materials: ${eco.materials?.join(", ")||"n/a"}, Carbon ${eco.carbonTier||"n/a"}.`;
  }

  return { analyze, explain };
})();
