import axios from "axios";

const CATEGORIES = [
  "road_damage", "garbage", "streetlight", "water_supply",
  "drainage", "noise", "property_damage", "animal_control",
  "public_safety", "vegetation", "other"
];

const CATEGORY_LABELS = {
  road_damage: "Road Damage / Pothole",
  garbage: "Garbage / Waste Management",
  streetlight: "Streetlight Issue",
  water_supply: "Water Supply Problem",
  drainage: "Drainage / Sewage",
  noise: "Noise Complaint",
  property_damage: "Property Damage",
  animal_control: "Animal Control",
  public_safety: "Public Safety Hazard",
  vegetation: "Vegetation / Tree Issue",
  other: "Other",
};

export async function classifyComplaint(title, description, imageUrls = []) {
  const textPart = `Title: ${title}\nDescription: ${description}`;

  const content = [
    {
      type: "text",
      text: `You are a municipal complaint classifier for an Indian city government. Analyze the following complaint and return a JSON object with exactly these fields:
- "category": one of [${CATEGORIES.join(", ")}]
- "confidence": a number between 0 and 1
- "priority_suggestion": one of [low, medium, high, critical]
- "department": the best department to handle this (e.g., "Roads & Infrastructure", "Sanitation", "Electrical", "Water Department", "Police", "Fire Department", "Parks & Gardens", "General")
- "summary": a one-line summary of the issue

Return ONLY valid JSON, no markdown, no explanation.

Complaint:
${textPart}`,
    },
  ];

  for (const url of imageUrls) {
    content.push({
      type: "image_url",
      image_url: { url },
    });
  }

  try {
    const model = imageUrls.length > 0 ? "llama-3.3-70b-versatile" : "llama-3.3-70b-versatile";
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content }],
        max_tokens: 300,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = response.data.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return getDefaultClassification();

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "other",
      confidence: Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5)),
      priority_suggestion: ["low", "medium", "high", "critical"].includes(parsed.priority_suggestion)
        ? parsed.priority_suggestion : "medium",
      department: parsed.department || "General",
      summary: parsed.summary || "",
    };
  } catch (err) {
    console.error("AI classification failed:", err.message);
    return getDefaultClassification();
  }
}

function getDefaultClassification() {
  return {
    category: "other",
    confidence: 0,
    priority_suggestion: "medium",
    department: "General",
    summary: "Classification unavailable",
  };
}

export { CATEGORY_LABELS, CATEGORIES };
