/* ai.js
   Lightweight, explainable “AI model” simulaion.
   Replace functions with real API calls later.
*/

const EcoAI = (() => {
  // Simple dictionaries and heuristics to simulate model behavior.
  const edibleHints = [
    "apple","banana","bread","milk","oat","almond","soy","yogurt","cheese",
    "beef","chicken","tofu","bean","lentil","rice","pasta","chocolate",
    "cookie","snack","cereal","oats","egg","coffee","tea","juice","soda","can of","canned"
  ];

  const materialKeywords = {
    plastic: ["pet","hdpe","plastic","polyethylene","polypropylene","bottle","wrapper","straw"],
    metal: ["steel","aluminum","aluminium","tin","can","metal"],
    glass: ["glass","jar","bottle glass"],
    paper: ["paper","cardboard","carton","kraft","box"],
    textile: ["cotton","polyester","nylon","fabric","textile","shirt","towel"],
    electronics: ["battery","lithium","phone","charger","cable","headphones","electronic"]
  };

  const nutritionBase = {
    // approximate per 100g/ml
    default: { kcal: 200, protein: 6, fat: 8, carbs: 28, fiber: 2, sodium: 200, calcium: 40, iron: 1 },
    apple:   { kcal: 52, protein: 0.3, fat: 0.2, carbs: 14, fiber: 2.4, sodium: 1, calcium: 6, iron: 0.1 },
    milk:    { kcal: 60, protein: 3.2, fat: 3.2, carbs: 5,  fiber: 0,  sodium: 44, calcium: 120, iron: 0 },
    oats:    { kcal: 389,protein: 17,  fat: 7,   carbs: 66, fiber: 10, sodium: 2,  calcium: 54,  iron: 4.7 },
    beans:   { kcal: 347,protein: 21,  fat: 1.2, carbs: 63, fiber: 16, sodium: 5,  calcium: 113, iron: 5.1 },
    beef:    { kcal: 250,protein: 26,  fat: 15,  carbs: 0,  fiber: 0,  sodium: 72, calcium: 18,  iron: 2.6 },
    chocolate:{kcal: 546,protein: 4.9, fat: 31,  carbs: 61, fiber: 7,  sodium: 24, calcium: 56,  iron: 8 }
  };

  function normalize(text){
    return (text || "").toLowerCase();
  }

  function guessEdible(inputText, imageName){
    const t = normalize(inputText + " " + imageName);
    let hit = edibleHints.find(k => t.includes(k));
    let confidence = hit ? 0.85 : 0.35;
    if (t.includes("pet") || t.includes("bottle") || t.includes("plastic")) confidence = Math.min(confidence, 0.2);
    return { edible: confidence > 0.5, confidence, signal: hit || null, explain: `Signal: ${hit || 'none'}` };
  }

  function detectMaterials(inputText){
    const t = normalize(inputText);
    const found = [];
    for (const [mat, keys] of Object.entries(materialKeywords)){
      if (keys.some(k => t.includes(k))) found.push(mat);
    }
    if (!found.length) found.push("plastic"); // default conservative fallback
    return found;
  }

  function estimateNutrition(inputText){
    const t = normalize(inputText);
    let key = "default";
    if (t.includes("apple")) key = "apple";
    if (t.includes("milk") || t.includes("oat milk")) key = "milk";
    if (t.includes("oat") || t.includes("oats")) key = "oats";
    if (t.includes("bean") || t.includes("lentil")) key = "beans";
    if (t.includes("beef")) key = "beef";
    if (t.includes("chocolate")) key = "chocolate";

    const per100 = nutritionBase[key];
    // Assume 100g/100ml serving unless size hint present
    let serving = 100;
    const sizeMatch = t.match(/(\d+)\s?(g|ml|oz)/);
    if (sizeMatch){
      let val = parseInt(sizeMatch[1],10);
      let unit = sizeMatch[2];
      if (unit === "oz") val = Math.round(val * 28.35);
      serving = Math.min(Math.max(val, 50), 500);
    }
    const factor = serving/100;
    const round = n => Math.round(n*10)/10;

    return {
      serving: serving + " g/ml",
      values: {
        calories: round(per100.kcal * factor),
        protein_g: round(per100.protein * factor),
        fat_g: round(per100.fat * factor),
        carbs_g: round(per100.carbs * factor),
        fiber_g: round(per100.fiber * factor),
        sodium_mg: Math.round(per100.sodium * factor),
        calcium_mg: Math.round(per100.calcium * factor),
        iron_mg: round(per100.iron * factor)
      },
      assumptions: `Based on ${key} profile, ${serving}g/ml assumed serving.`
    };
  }

  function ecoAssessment(inputText){
    const mats = detectMaterials(inputText);
    // Carbon tier heuristic
    let carbonTier = "Medium";
    if (mats.includes("plastic")) carbonTier = "High";
    if (mats.includes("paper") || mats.includes("glass")) carbonTier = "Low";
    if (normalize(inputText).includes("beef")) carbonTier = "Very High";
    // Recyclability guess
    const recyclable = mats.includes("glass") || mats.includes("metal") || mats.includes("paper") || normalize(inputText).includes("pet");
    const guidance = [];
    if (mats.includes("plastic")) guidance.push("Check local rules for plastics #1–#2; keep caps on bottles.");
    if (mats.includes("paper")) guidance.push("Remove plastic windows; flatten boxes.");
    if (mats.includes("glass")) guidance.push("Rinse and remove lids; color sorting may apply.");
    if (mats.includes("metal")) guidance.push("Rinse cans; avoid food residue.");
    if (mats.includes("electronics")) guidance.push("Use e-waste drop-off sites; never trash batteries.");

    return {
      materials: mats,
      carbonTier,
      recyclable,
      guidance
    };
  }

  function alternatives(inputText){
    const t = normalize(inputText);
    const alts = [];
    if (t.includes("bottle") && t.includes("plastic")){
      alts.push({ item: "Stainless steel bottle", why: "Durable, long-life, fully recyclable." });
      alts.push({ item: "Glass bottle", why: "Inert material; recyclable where accepted." });
    } else if (t.includes("paper towel")){
      alts.push({ item: "Reusable cloth towels", why: "Cuts single-use waste." });
      alts.push({ item: "Bamboo towels", why: "Rapidly renewable resource." });
    } else if (t.includes("beef")){
      alts.push({ item: "Lentils or beans", why: "Much lower emissions, high protein." });
      alts.push({ item: "Tofu/tempeh", why: "Low impact plant protein." });
    } else {
      alts.push({ item: "Higher recycled-content option", why: "Reduces virgin material demand." });
      alts.push({ item: "Repairable/refillable version", why: "Extends product lifetime." });
    }
    return alts;
  }

  function personalizedTips(inputText, location){
    const tips = [];
    const t = normalize(inputText);
    if (t.includes("bottle")) tips.push("Carry a reusable bottle to avoid single-use purchases.");
    if (t.includes("carton") || t.includes("paper")) tips.push("Flatten cartons and keep them dry.");
    if (location) tips.push(`Search local recycling rules for ${location}; they vary by municipality.`);
    tips.push("Buy only what you’ll use to cut waste.");
    tips.push("Look for third-party certifications (B Corp, Fairtrade, FSC) where relevant.");
    return tips.slice(0,4);
  }

  function confidenceScore(isEdibleConfidence, hasImage){
    let base = 0.6 + (hasImage ? 0.1 : 0);
    base = Math.min(0.95, Math.max(0.4, (base + isEdibleConfidence)/2));
    return Math.round(base*100)/100;
  }

  function analyze({ text, imageName, location }){
    const edibleGuess = guessEdible(text || "", imageName || "");
    const isEdible = edibleGuess.edible;
    const eco = ecoAssessment(text || (imageName || ""));
    const alt = alternatives(text || "");
    const tips = personalizedTips(text || "", location || "");
    const conf = confidenceScore(edibleGuess.confidence, !!imageName);
    const result = {
      input: { text, imageName, location },
      edible: { isEdible, confidence: edibleGuess.confidence, explain: edibleGuess.explain },
      nutrition: isEdible ? estimateNutrition(text || "") : null,
      eco,
      alternatives: alt,
      tips,
      overallConfidence: conf,
      timestamp: Date.now()
    };
    return result;
  }

  function explain(result){
    const parts = [];
    parts.push(`Edible: ${result.edible.isEdible ? "Yes" : "No"} (conf ${result.edible.confidence}) – ${result.edible.explain}`);
    parts.push(`Materials: ${result.eco.materials.join(", ")}. Carbon tier: ${result.eco.carbonTier}.`);
    parts.push(`Recyclable: ${result.eco.recyclable ? "Likely" : "Uncertain"}.`);
    return parts.join(" ");
  }

  return { analyze, explain };
})();
