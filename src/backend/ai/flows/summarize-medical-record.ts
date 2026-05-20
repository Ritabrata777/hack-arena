'use server';

import { ai } from '@/backend/ai/genkit';
import { z } from 'genkit';
import { aiRateLimiter } from '@/backend/ai/rate-limiter';

const SummarizeMedicalRecordInputSchema = z.object({
  recordName: z.string().describe('The name or title of the medical record.'),
  category: z.string().optional().describe('The medical record category.'),
  recordDate: z.string().optional().describe('The date of the record, if known.'),
  notes: z.string().optional().describe('Patient-provided notes or metadata.'),
  text: z.string().optional().describe('Extracted text from the record when available.'),
});
export type SummarizeMedicalRecordInput = z.infer<typeof SummarizeMedicalRecordInputSchema>;

const SummarizeMedicalRecordOutputSchema = z.object({
  summary: z.string().describe('Doctor-friendly clinical summary.'),
  keyFindings: z.array(z.string()).describe('Important findings or values.'),
  followUps: z.array(z.string()).describe('Suggested follow-up questions or checks.'),
  cautions: z.array(z.string()).describe('Potential cautions or safety notes.'),
});
export type SummarizeMedicalRecordOutput = z.infer<typeof SummarizeMedicalRecordOutputSchema>;

const compact = (value?: string) => (value || '').replace(/\s+/g, ' ').trim();

function fallbackSummary(input: SummarizeMedicalRecordInput): SummarizeMedicalRecordOutput {
  const sourceText = compact(input.text || input.notes || '');
  const excerpt = sourceText ? sourceText.slice(0, 700) : 'No readable document text was available; summary is based on record metadata.';
  const category = input.category || 'Medical record';

  return {
    summary: `${category}: ${input.recordName}. ${excerpt}`,
    keyFindings: [
      input.recordDate ? `Record date: ${input.recordDate}` : 'Record date not specified',
      input.notes ? `Patient note: ${compact(input.notes).slice(0, 180)}` : 'No patient note provided',
    ],
    followUps: [
      'Confirm the clinical context with the patient.',
      'Review the original document before making treatment decisions.',
    ],
    cautions: [
      'AI summary may omit details from scanned PDFs or images.',
    ],
  };
}

export async function summarizeMedicalRecord(
  input: SummarizeMedicalRecordInput
): Promise<SummarizeMedicalRecordOutput> {
  const safeInput = {
    ...input,
    text: input.text ? input.text.slice(0, 12000) : '',
  };

  try {
    return await aiRateLimiter.executeWithRateLimit(
      () => summarizeMedicalRecordFlow(safeInput),
      'medical record summarization'
    );
  } catch (error) {
    console.error('AI service error in medical record summarization:', error);
    return fallbackSummary(safeInput);
  }
}

const summarizeMedicalRecordPrompt = ai.definePrompt({
  name: 'summarizeMedicalRecordPrompt',
  input: { schema: SummarizeMedicalRecordInputSchema },
  output: { schema: SummarizeMedicalRecordOutputSchema },
  prompt: `You are helping a verified doctor quickly review a patient medical record.

Create a concise, doctor-friendly summary. Keep it clinically useful and cautious.
Do not invent facts. If text is missing, state that the summary is metadata-based.

Record name: {{recordName}}
Category: {{#if category}}{{category}}{{else}}Unknown{{/if}}
Record date: {{#if recordDate}}{{recordDate}}{{else}}Unknown{{/if}}
Patient notes: {{#if notes}}{{notes}}{{else}}None{{/if}}

Readable record text:
{{#if text}}{{text}}{{else}}No extracted text available.{{/if}}`,
});

const summarizeMedicalRecordFlow = ai.defineFlow(
  {
    name: 'summarizeMedicalRecordFlow',
    inputSchema: SummarizeMedicalRecordInputSchema,
    outputSchema: SummarizeMedicalRecordOutputSchema,
  },
  async input => {
    const { output } = await summarizeMedicalRecordPrompt(input);
    return output || fallbackSummary(input);
  }
);
