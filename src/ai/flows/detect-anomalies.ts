
'use server';
/**
 * @fileOverview A Genkit flow for detecting anomalies in consultation logs.
 *
 * - detectAnomalies - A function that scans consultation logs for suspicious patterns.
 * - DetectAnomaliesInput - The input type for the detectAnomalies function.
 * - DetectAnomaliesOutput - The return type for the detectAnomalies function.
 */

import {ai} from '@/backend/ai/genkit';
import {z} from 'genkit';

const ConsultationSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorWallet: z.string(),
  timestamp: z.string(),
  encryptedSummary: z.string(),
  summaryHash: z.string(),
  txHash: z.string().optional(),
  rating: z.number().optional(),
  pdfDataUri: z.string().optional().describe("A Base64 encoded data URI of the attached PDF file."),
  pdfFileName: z.string().optional().describe("The name of the attached PDF file."),
});

const DetectAnomaliesInputSchema = z.object({
  consultations: z.array(ConsultationSchema),
});
export type DetectAnomaliesInput = z.infer<typeof DetectAnomaliesInputSchema>;

const AnomalySchema = z.object({
  consultation: ConsultationSchema,
  reason: z.string().describe('The reason why this consultation is flagged as an anomaly.'),
});

const DetectAnomaliesOutputSchema = z.object({
  anomalies: z.array(AnomalySchema),
});
export type DetectAnomaliesOutput = z.infer<typeof DetectAnomaliesOutputSchema>;

export async function detectAnomalies(
  input: DetectAnomaliesInput
): Promise<DetectAnomaliesOutput> {
  return detectAnomaliesFlow(input);
}

const AnomalyDetectionPromptInputSchema = z.object({
  consultationsJson: z.string().describe('A JSON string of consultation logs.'),
});

const anomalyDetectionPrompt = ai.definePrompt({
  name: 'anomalyDetectionPrompt',
  input: {schema: AnomalyDetectionPromptInputSchema},
  output: {schema: DetectAnomaliesOutputSchema},
  prompt: `You are an AI auditor for a medical records system. Your task is to identify suspicious or anomalous consultation logs from the provided JSON data.

  Analyze the following list of consultation logs:
  {{{consultationsJson}}}

  Look for patterns that could indicate misuse or error, such as:
  1.  A single doctor creating an unusually high number of consultations in a very short time frame (e.g., more than 5 in an hour).
  2.  Multiple consultations for the same patient from the same doctor within a short period (e.g., less than an hour apart).
  3.  Consultation summaries that are extremely short or seem like placeholder text (you will have to infer this from the encrypted data length, assuming longer is more detailed).

  Return a JSON object with an 'anomalies' array. Each object in the array should contain the full consultation object that you've identified as an anomaly and a 'reason' field explaining why it was flagged. If no anomalies are found, return an empty 'anomalies' array.`,
});

const detectAnomaliesFlow = ai.defineFlow(
  {
    name: 'detectAnomaliesFlow',
    inputSchema: DetectAnomaliesInputSchema,
    outputSchema: DetectAnomaliesOutputSchema,
  },
  async input => {
    // The AI can't see the encrypted summary, so we add a hint.
    const consultationsWithHints = input.consultations.map(c => ({
        ...c,
        summaryLength: c.encryptedSummary.length,
        hasPdf: !!c.pdfDataUri // Add a hint if a PDF is attached
    }));

    const consultationsJson = JSON.stringify(consultationsWithHints, null, 2);

    const {output} = await anomalyDetectionPrompt({ consultationsJson });
    return output!;
  }
);
