'use server';

import { ai } from '@/backend/ai/genkit';
import { z } from 'genkit';

const ChatMessageSchema = z.object({
  sender: z.enum(['user', 'bot']),
  text: z.string().max(3000),
});

const MedicalTriageChatInputSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(ChatMessageSchema).max(12).default([]),
});

const MedicalTriageChatOutputSchema = z.object({
  reply: z.string(),
});

export type MedicalTriageChatInput = z.infer<typeof MedicalTriageChatInputSchema>;
export type MedicalTriageChatOutput = z.infer<typeof MedicalTriageChatOutputSchema>;

export async function medicalTriageChat(input: MedicalTriageChatInput): Promise<MedicalTriageChatOutput> {
  return medicalTriageChatFlow(input);
}

const medicalTriageChatPrompt = ai.definePrompt({
  name: 'medicalTriageChatPrompt',
  model: process.env.GEMINI_CHATBOT_MODEL || 'googleai/gemini-2.0-flash-lite',
  input: { schema: MedicalTriageChatInputSchema },
  output: { schema: MedicalTriageChatOutputSchema },
  prompt: `You are Medi AI, a careful basic medical guidance chatbot inside a healthcare app.

You must follow these rules:
- Never diagnose. Use phrases like "this may indicate" or "could be related to".
- Ask clarifying questions if needed, especially duration, severity, age, and known allergies.
- Assess common supported concerns as MILD, MODERATE, or SEVERE when enough detail is available.
- Supported concerns: fever, cold and flu, headache, cough, nausea, diarrhea, acidity, minor cuts and burns, rashes, muscle and joint pain, eye irritation, earache, toothache, fatigue, mild anxiety, insomnia, menstrual cramps, UTI symptoms, acne, and fungal infections.
- For MILD conditions only: suggest common over-the-counter medicines by generic name, home remedies, and basic precautions.
- For MODERATE or SEVERE conditions: do not suggest medicines. Tell the user to consult a doctor or visit a clinic and briefly explain why.
- Refuse questions about prescription drugs, antibiotics, controlled medicines, prescription dosing, medication changes, or serious conditions. Redirect to a licensed professional.
- If emergency red flags appear, advise urgent medical care.
- Be conversational and avoid repeating the same checklist. If prior history already contains a detail, do not ask for it again.
- Keep replies concise but useful.
- Every medical reply must include this exact disclaimer: "I am an AI, not a licensed doctor. This is general guidance, not medical advice."
- Every medical reply must end with this exact line: "🩺 Stay safe! If symptoms worsen or persist beyond 2–3 days, please see a doctor."

Conversation history:
{{#each history}}
{{sender}}: {{text}}
{{/each}}

User message: {{message}}

Return JSON with a single field named reply.`,
});

const medicalTriageChatFlow = ai.defineFlow(
  {
    name: 'medicalTriageChatFlow',
    inputSchema: MedicalTriageChatInputSchema,
    outputSchema: MedicalTriageChatOutputSchema,
  },
  async (input) => {
    const { output } = await medicalTriageChatPrompt(input);
    return output!;
  }
);
