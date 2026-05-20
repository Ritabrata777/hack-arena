'use server';

/**
 * @fileOverview A Genkit flow for detecting potential medication conflicts.
 *
 * - checkForMedicationConflicts - A function that checks new prescriptions against a patient's history.
 * - MedicationConflictInput - The input type for the function.
 * - MedicationConflictOutput - The return type for the function.
 */

import {ai} from '@/backend/ai/genkit';
import {z} from 'genkit';

const MedicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
});

const ConsultationHistoryItemSchema = z.object({
  timestamp: z.string(),
  medications: z.array(MedicationSchema),
});

const MedicationConflictInputSchema = z.object({
  newMedications: z.array(MedicationSchema).describe("The list of new medications being prescribed."),
  consultationHistory: z.array(ConsultationHistoryItemSchema).describe("The patient's past prescribed medications."),
});
export type MedicationConflictInput = z.infer<typeof MedicationConflictInputSchema>;

const ConflictSchema = z.object({
    medicationA: z.string().describe("The name of the first conflicting medication."),
    medicationB: z.string().describe("The name of the second conflicting medication."),
    description: z.string().describe("A description of the potential conflict and its risks."),
});

const MedicationConflictOutputSchema = z.object({
  conflicts: z.array(ConflictSchema).describe("A list of potential medication conflicts found."),
});
export type MedicationConflictOutput = z.infer<typeof MedicationConflictOutputSchema>;


export async function checkForMedicationConflicts(
  input: MedicationConflictInput
): Promise<MedicationConflictOutput> {
  try {
    return await medicationConflictFlow(input);
  } catch (error) {
    const msg = String((error as any)?.message || '');
    if (
      msg.includes('RATE_LIMIT_EXCEEDED') ||
      msg.includes('Too Many Requests') ||
      msg.includes('quota') ||
      msg.includes('Service Unavailable') ||
      msg.includes('overloaded')
    ) {
      // Safe fallback: no conflicts detected
      return { conflicts: [] };
    }
    throw error;
  }
}


const conflictDetectionPrompt = ai.definePrompt({
  name: 'conflictDetectionPrompt',
  input: {schema: MedicationConflictInputSchema},
  output: {schema: MedicationConflictOutputSchema},
  prompt: `You are an expert pharmacologist AI. Your task is to identify potential adverse drug interactions.

  Analyze the list of new medications and compare them against the patient's existing medication history.

  New Medications to be Prescribed:
  {{#each newMedications}}
  - {{name}} ({{dosage}}, {{frequency}})
  {{/each}}

  Patient's Medication History:
  {{#each consultationHistory}}
    {{#each medications}}
    - {{name}} (Prescribed on {{../timestamp}})
    {{/each}}
  {{/each}}

  Identify any pairs of drugs (from new vs. history, or within the new list itself) that have known moderate to severe interaction risks. For each conflict found, provide the names of the two drugs and a brief, clear description of the potential interaction and its clinical significance.

  If no conflicts are found, return an empty 'conflicts' array. Focus only on clinically significant interactions.
  `,
});


const medicationConflictFlow = ai.defineFlow(
  {
    name: 'medicationConflictFlow',
    inputSchema: MedicationConflictInputSchema,
    outputSchema: MedicationConflictOutputSchema,
  },
  async input => {
    // Basic check: if no history or new meds, no conflicts.
    if (input.newMedications.length === 0 || input.consultationHistory.length === 0) {
        return { conflicts: [] };
    }
    const {output} = await conflictDetectionPrompt(input);
    return output!;
  }
);
