// ai.js - Using Hugging Face API
const EcoAI = (() => {
  const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";
  const HF_API_KEY = "YOUR_HF_API_KEY"; // get one from huggingface.co

  async function query(payload) {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    return await response.json();
  }

  async function analyze({ text = "", imageName = "", location = "" }) {
    // Example: check if product is edible
    const edibleRes = await query({
      inputs: text,
      parameters: {
        candidate_labels: ["edible", "not edible"]
      }
    });

    return {
      input: { text, imageName, location },
      edible: {
        isEdible: edibleRes.labels[0] === "edible",
        confidence: Math.round(edibleRes.scores[0] * 100),
        explain: "Prediction from AI model"
      }
    };
  }

  return { analyze };
})();
