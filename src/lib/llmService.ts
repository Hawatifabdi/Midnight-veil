export interface ClinicalAnalysis {
  summary: string;
  potentialDifferentials: string[];
  recommendedWorkup: string[];
}

export async function analyzeClinicalPayload(sanitizedText: string): Promise<ClinicalAnalysis> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (apiKey && !apiKey.includes('YOUR_ACTUAL_API_KEY')) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5173', // Optional for OpenRouter rankings
          'X-Title': 'Midnight Veil',              // Optional project title
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini', // Target OpenAI model via OpenRouter
          messages: [
            {
              role: 'system',
              content: `You are an assistive clinical triage copilot. Analyze the provided de-identified medical text. 
Return your response ONLY as valid JSON in this exact structure:
{
  "summary": "Brief 1-2 sentence clinical summary",
  "potentialDifferentials": ["Differential 1", "Differential 2", "Differential 3"],
  "recommendedWorkup": ["Workup step 1", "Workup step 2", "Workup step 3"]
}`,
            },
            {
              role: 'user',
              content: sanitizedText,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Clean JSON output in case markdown fences are returned
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        summary: parsed.summary || 'Analysis complete.',
        potentialDifferentials: parsed.potentialDifferentials || ['Standard clinical evaluation advised.'],
        recommendedWorkup: parsed.recommendedWorkup || ['Review standard lab results.'],
      };
    } catch (err) {
      console.warn('OpenRouter call encountered an error, falling back to local simulation:', err);
    }
  }

  // Fallback if no valid key is provided
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    summary: 'Clinical intake evaluated successfully (Offline Simulation).',
    potentialDifferentials: [
      'Vestibular Migraine / Tension Cephalea',
      'Benign Paroxysmal Positional Vertigo (BPPV)',
      'Underlying Metabolic / Cervicogenic Component',
    ],
    recommendedWorkup: [
      'Dix-Hallpike diagnostic positioning maneuver',
      'Comprehensive Metabolic Panel (CMP) & CBC',
      'Neurological cranial nerve screening',
    ],
  };
}
