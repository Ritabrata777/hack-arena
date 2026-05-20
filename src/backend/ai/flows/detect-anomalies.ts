
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
  try {
    return await detectAnomaliesFlow(input);
  } catch (error) {
    console.error('AI service error in anomaly detection:', error);
    
    const msg = String((error as any)?.message || '');
    // Handle Google AI service unavailability and rate limits gracefully
    if (
      msg.includes('503 Service Unavailable') ||
      msg.includes('model is overloaded') ||
      msg.includes('RATE_LIMIT_EXCEEDED') ||
      msg.includes('Too Many Requests') ||
      msg.includes('quota')
    ) {
      console.log('AI service busy/over quota, falling back to heuristic detection');
      // Heuristic, rule-based fallback
      try {
        const anomalies: DetectAnomaliesOutput['anomalies'] = [];
        const byDoctor: Record<string, { ts: number }[]> = {};
        const byDoctorPatient: Record<string, number[]> = {};
        for (const c of input.consultations) {
          const ts = Date.parse(c.timestamp || '') || 0;
          const doctor = (c.doctorWallet || '').toLowerCase();
          const patient = (c.patientId || '').toLowerCase();
          byDoctor[doctor] ||= [];
          byDoctor[doctor].push({ ts });
          const key = doctor + '|' + patient;
          byDoctorPatient[key] ||= [];
          byDoctorPatient[key].push(ts);
        }
        // Rule 1: >5 in an hour by same doctor
        for (const [doctor, arr] of Object.entries(byDoctor)) {
          const times = arr.map(a => a.ts).sort((a,b)=>a-b);
          let windowStart = 0;
          for (let i=0;i<times.length;i++) {
            while (times[i] - times[windowStart] > 60*60*1000) windowStart++;
            if (i - windowStart + 1 >= 6) {
              // Flag the last one in burst
              const c = input.consultations.find(x => Date.parse(x.timestamp||'')===times[i] && x.doctorWallet?.toLowerCase()===doctor);
              if (c) anomalies.push({ consultation: c as any, reason: 'High frequency: >5 consultations by the same doctor within 1 hour' });
              break;
            }
          }
        }
        // Rule 2: same doctor-patient within <1h multiple times
        for (const [key, arr] of Object.entries(byDoctorPatient)) {
          const times = arr.sort((a,b)=>a-b);
          for (let i=1;i<times.length;i++) {
            if (times[i] - times[i-1] < 60*60*1000) {
              const ts = times[i];
              const [doctor, patient] = key.split('|');
              const c = input.consultations.find(x => Date.parse(x.timestamp||'')===ts && x.doctorWallet?.toLowerCase()===doctor && x.patientId?.toLowerCase()===patient);
              if (c) anomalies.push({ consultation: c as any, reason: 'Repeated consultation for the same patient within 1 hour' });
            }
          }
        }
        return { anomalies };
      } catch {
        return { anomalies: [] };
      }
    }
    
    // For other errors, re-throw with more context
    throw new Error(`Failed to detect anomalies: ${(error as any)?.message || 'Unknown error'}`);
  }
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
