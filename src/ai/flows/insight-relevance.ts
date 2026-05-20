// src/ai/flows/insight-relevance.ts
'use server';
/**
 * @fileOverview This file contains a Genkit flow for filtering relevant consultation insights.
 *
 * - filterRelevantInsights - A function that filters consultation insights based on relevance and confidence.
 * - FilterRelevantInsightsInput - The input type for the filterRelevantInsights function.
 * - FilterRelevantInsightsOutput - The return type for the filterRelevantInsights function.
 */

import {ai} from '@/backend/ai/genkit';
import {z} from 'genkit';

const FilterRelevantInsightsInputSchema = z.object({
  insight: z.string().describe('A single insight extracted from the consultation notes.'),
  consultationSummary: z.string().describe('The full consultation summary text.'),
});
export type FilterRelevantInsightsInput = z.infer<
  typeof FilterRelevantInsightsInputSchema
>;

const FilterRelevantInsightsOutputSchema = z.object({
  relevant: z
    .boolean()
    .describe(
      'Whether the insight is relevant to the consultation summary and should be included.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A confidence score between 0 and 1 indicating the relevance of the insight.'
    ),
  reason: z
    .string()
    .optional()
    .describe(
      'Reasoning behind the relevance decision.  Optional, but encouraged for debugging.'
    ),
});
export type FilterRelevantInsightsOutput = z.infer<
  typeof FilterRelevantInsightsOutputSchema
>;

export async function filterRelevantInsights(
  input: FilterRelevantInsightsInput
): Promise<FilterRelevantInsightsOutput> {
  return filterRelevantInsightsFlow(input);
}

const insightRelevancePrompt = ai.definePrompt({
  name: 'insightRelevancePrompt',
  input: {schema: FilterRelevantInsightsInputSchema},
  output: {schema: FilterRelevantInsightsOutputSchema},
  prompt: `You are an AI assistant helping doctors filter consultation insights.

  Given a consultation summary and a single extracted insight, determine if the insight is relevant to the consultation summary.
  Return a confidence score between 0 and 1 indicating how sure you are of the relevance.

  Consultation Summary: "{{consultationSummary}}"

  Insight: "{{insight}}"

  Return a JSON object with 'relevant' set to true if the insight is relevant, and 'false' otherwise.
  Include a confidence score and a brief reason for your decision.`,
});

const filterRelevantInsightsFlow = ai.defineFlow(
  {
    name: 'filterRelevantInsightsFlow',
    inputSchema: FilterRelevantInsightsInputSchema,
    outputSchema: FilterRelevantInsightsOutputSchema,
  },
  async input => {
    const {output} = await insightRelevancePrompt(input);
    return output!;
  }
);
