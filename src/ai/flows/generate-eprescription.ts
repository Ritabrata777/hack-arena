'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a formatted e-prescription.
 *
 * - generateEprescription - A function that takes structured prescription data and returns a formatted text version.
 * - GenerateEprescriptionInput - The input type for the generateEprescription function.
 * - GenerateEprescriptionOutput - The return type for the generateEprescription function.
 */

import {ai} from '@/backend/ai/genkit';
import {z} from 'genkit';

const MedicationSchema = z.object({
  name: z.string().describe('The name of the medication.'),
  dosage: z.string().describe('The dosage of the medication (e.g., "500mg", "1 tablet").'),
  frequency: z.string().describe('How often to take the medication (e.g., "Twice daily", "Before meals").'),
  notes: z.string().optional().describe('Additional notes or instructions for the medication.'),
});

const GenerateEprescriptionInputSchema = z.object({
  patientId: z.string().describe("The patient's wallet address or unique ID."),
  doctorName: z.string().describe("The doctor's full name."),
  doctorWallet: z.string().describe("The doctor's wallet address."),
  doctorSpecialization: z.string().optional().describe("The doctor's specialization."),
  doctorLicenseId: z.string().optional().describe("The doctor's medical license ID."),
  consultationDate: z.string().describe('The date of the consultation in ISO format.'),
  medications: z.array(MedicationSchema).describe('A list of medications to be prescribed.'),
});
export type GenerateEprescriptionInput = z.infer<typeof GenerateEprescriptionInputSchema>;

const GenerateEprescriptionOutputSchema = z.object({
  prescriptionText: z.string().describe('A professionally formatted, human-readable e-prescription text.'),
});
export type GenerateEprescriptionOutput = z.infer<typeof GenerateEprescriptionOutputSchema>;


export async function generateEprescription(
  input: GenerateEprescriptionInput
): Promise<GenerateEprescriptionOutput> {
  return generateEprescriptionFlow(input);
}

const generateEprescriptionPrompt = ai.definePrompt({
  name: 'generateEprescriptionPrompt',
  input: {schema: GenerateEprescriptionInputSchema},
  output: {schema: GenerateEprescriptionOutputSchema},
  prompt: `You are a medical administrative assistant AI. Your task is to generate a formal and professional e-prescription document based on the provided JSON data.

  The document should be well-structured, clear, and ready to be printed or saved as a PDF.

  **Doctor Information:**
  - Name: Dr. {{doctorName}}
  - Specialization: {{#if doctorSpecialization}}{{doctorSpecialization}}{{else}}N/A{{/if}}
  - License ID: {{#if doctorLicenseId}}{{doctorLicenseId}}{{else}}N/A{{/if}}
  - Wallet: {{doctorWallet}}

  **Patient Information:**
  - Patient ID (Wallet): {{patientId}}
  - Date of Consultation: {{consultationDate}}

  **Prescription (Rx):**
  {{#each medications}}
  - **Medication:** {{name}}
    - **Dosage:** {{dosage}}
    - **Frequency:** {{frequency}}
    {{#if notes}}- **Instructions:** {{notes}}{{/if}}
  
  {{/each}}

  **Disclaimer:**
  This is a digitally generated prescription. Please consult your pharmacist if you have any questions. This prescription is valid only when presented with a verifiable record on the MediChain platform.

  ---
  End of Prescription
  ---
  
  Please format the above information into a single string for the 'prescriptionText' output field. Ensure the formatting is clean with proper line breaks.
  `,
});

const generateEprescriptionFlow = ai.defineFlow(
  {
    name: 'generateEprescriptionFlow',
    inputSchema: GenerateEprescriptionInputSchema,
    outputSchema: GenerateEprescriptionOutputSchema,
  },
  async input => {
    // Format the date for better readability in the prompt.
    const formattedInput = {
        ...input,
        consultationDate: new Date(input.consultationDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        }),
    };
    const {output} = await generateEprescriptionPrompt(formattedInput);
    return output!;
  }
);
