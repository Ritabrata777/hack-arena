
import { config } from 'dotenv';
config();

import '@/backend/ai/flows/insight-relevance.ts';
import '@/backend/ai/flows/detect-anomalies.ts';
import '@/backend/ai/flows/generate-eprescription.ts';
import '@/backend/ai/flows/medication-conflict.ts';
