'use client';
import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, MessageSquare, X, Send, Bot, Minimize2, Loader2, RotateCcw, Stethoscope } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Card, CardContent } from '@/frontend/components/ui/card';
import { Avatar, AvatarFallback } from '@/frontend/components/ui/avatar';

const symptomProfiles = [
  {
    key: 'cold',
    label: 'cold or flu symptoms',
    keywords: ['cold', 'flu', 'runny nose', 'sore throat', 'sneezing', 'congestion', 'body ache'],
    mildMaxDays: 7,
    otc: 'paracetamol/acetaminophen for fever or body ache, saline nasal spray for congestion, and throat lozenges for throat irritation',
    homeCare: 'Rest, drink warm fluids, use steam inhalation, and consider honey for cough if the patient is over 1 year old.',
  },
  {
    key: 'fever',
    label: 'fever',
    keywords: ['fever', 'temperature', 'chills'],
    mildMaxDays: 3,
    otc: 'paracetamol/acetaminophen as per the label dose',
    homeCare: 'Rest, drink plenty of fluids, wear light clothing, and monitor temperature.',
  },
  {
    key: 'cough',
    label: 'cough',
    keywords: ['cough', 'dry cough', 'wet cough', 'phlegm'],
    mildMaxDays: 7,
    otc: 'dextromethorphan for dry cough or guaifenesin for mucus cough, only as per the label',
    homeCare: 'Drink warm fluids, use honey if age-appropriate, avoid smoke/dust, and use steam inhalation.',
  },
  {
    key: 'headache',
    label: 'headache',
    keywords: ['headache', 'head ache', 'migraine'],
    mildMaxDays: 2,
    otc: 'paracetamol/acetaminophen; ibuprofen may be considered if it is safe for you',
    homeCare: 'Hydrate, rest in a dark quiet room, reduce screen time, and try gentle neck/shoulder stretches.',
  },
  {
    key: 'nausea',
    label: 'nausea',
    keywords: ['nausea', 'vomit', 'vomiting', 'queasy'],
    mildMaxDays: 2,
    otc: 'oral rehydration salts/electrolyte solution',
    homeCare: 'Take small sips often, eat bland foods when tolerated, avoid oily foods, and rest.',
  },
  {
    key: 'diarrhea',
    label: 'diarrhea',
    keywords: ['diarrhea', 'loose motion', 'loose stool', 'stomach upset'],
    mildMaxDays: 2,
    otc: 'oral rehydration salts/electrolyte solution; loperamide only for adults without fever or blood in stool',
    homeCare: 'Keep hydrated, eat bland foods, avoid alcohol/dairy for a short time, and watch for dehydration.',
  },
  {
    key: 'acidity',
    label: 'acidity or heartburn',
    keywords: ['acidity', 'heartburn', 'acid reflux', 'gastric', 'gas'],
    mildMaxDays: 3,
    otc: 'an antacid such as calcium carbonate, or famotidine for short-term relief as per the label',
    homeCare: 'Avoid spicy/fatty foods, eat smaller meals, do not lie down right after eating, and elevate your head during sleep.',
  },
  {
    key: 'cuts_burns',
    label: 'minor cuts or burns',
    keywords: ['cut', 'wound', 'scrape', 'minor burn', 'burn'],
    mildMaxDays: 2,
    otc: 'plain petroleum jelly for small cuts or an antiseptic solution; burn gel may help minor burns',
    homeCare: 'Rinse gently with clean water, keep the area clean, cover with a sterile dressing, and cool minor burns under running water.',
  },
  {
    key: 'rash',
    label: 'rash',
    keywords: ['rash', 'itching', 'hives', 'skin irritation'],
    mildMaxDays: 3,
    otc: 'cetirizine for itching or 1% hydrocortisone cream for a small itchy patch, as per the label',
    homeCare: 'Avoid scratching, use a cool compress, avoid new soaps/cosmetics, and keep the area dry.',
  },
  {
    key: 'muscle_joint',
    label: 'muscle or joint pain',
    keywords: ['muscle pain', 'joint pain', 'sprain', 'strain', 'back pain', 'knee pain', 'body pain'],
    mildMaxDays: 3,
    otc: 'paracetamol/acetaminophen; ibuprofen gel or tablets may help if safe for you',
    homeCare: 'Rest the area, use ice for the first day after injury, use gentle stretching later, and avoid heavy strain.',
  },
  {
    key: 'eye',
    label: 'eye irritation',
    keywords: ['eye irritation', 'red eye', 'itchy eye', 'watery eye', 'dry eye'],
    mildMaxDays: 2,
    otc: 'lubricating artificial tears',
    homeCare: 'Avoid rubbing the eye, rinse with clean water if exposed to dust, and avoid contact lenses until better.',
  },
  {
    key: 'earache',
    label: 'earache',
    keywords: ['earache', 'ear pain', 'ear hurts'],
    mildMaxDays: 1,
    otc: 'paracetamol/acetaminophen for pain as per the label',
    homeCare: 'Keep the ear dry and avoid putting drops or objects in the ear unless advised by a clinician.',
  },
  {
    key: 'toothache',
    label: 'toothache',
    keywords: ['toothache', 'tooth pain', 'gum pain', 'dental pain'],
    mildMaxDays: 1,
    otc: 'paracetamol/acetaminophen; ibuprofen may be considered if safe for you',
    homeCare: 'Rinse with warm salt water, keep the area clean, and book a dentist visit if pain continues.',
  },
  {
    key: 'fatigue',
    label: 'fatigue',
    keywords: ['fatigue', 'tired', 'weakness', 'low energy'],
    mildMaxDays: 3,
    otc: 'no specific medicine is usually needed for mild short-term fatigue',
    homeCare: 'Prioritize sleep, hydration, balanced meals, light movement, and reduce alcohol/caffeine late in the day.',
  },
  {
    key: 'anxiety',
    label: 'mild anxiety',
    keywords: ['anxiety', 'anxious', 'panic', 'stress', 'worried'],
    mildMaxDays: 2,
    otc: 'no over-the-counter medicine is recommended here without professional guidance',
    homeCare: 'Try slow breathing, grounding exercises, a short walk, journaling, and reducing caffeine.',
  },
  {
    key: 'insomnia',
    label: 'insomnia',
    keywords: ['insomnia', 'sleep problem', 'cant sleep', "can't sleep", 'sleepless'],
    mildMaxDays: 3,
    otc: 'melatonin may help short-term sleep timing issues, as per the label',
    homeCare: 'Keep a regular sleep schedule, avoid screens before bed, avoid late caffeine, and keep the room cool and dark.',
  },
  {
    key: 'menstrual_cramps',
    label: 'menstrual cramps',
    keywords: ['menstrual cramps', 'period pain', 'cramps', 'period cramps'],
    mildMaxDays: 3,
    otc: 'ibuprofen or naproxen may help cramps if safe for you; paracetamol/acetaminophen is another option',
    homeCare: 'Use a heating pad, hydrate, rest, and try gentle stretching.',
  },
  {
    key: 'uti',
    label: 'UTI symptoms',
    keywords: ['uti', 'burning urine', 'painful urination', 'urine burning', 'frequent urination'],
    mildMaxDays: 0,
    otc: '',
    homeCare: '',
    alwaysDoctor: true,
    doctorReason: 'UTI symptoms could be related to an infection that may need testing and prescription treatment.',
  },
  {
    key: 'acne',
    label: 'acne',
    keywords: ['acne', 'pimple', 'pimples', 'blackheads'],
    mildMaxDays: 14,
    otc: 'benzoyl peroxide 2.5%-5% or salicylic acid face wash, introduced slowly as per the label',
    homeCare: 'Use gentle cleanser, avoid picking, choose non-comedogenic products, and protect skin from sun irritation.',
  },
  {
    key: 'fungal',
    label: 'possible fungal skin infection',
    keywords: ['fungal', 'ringworm', 'athlete foot', "athlete's foot", 'jock itch'],
    mildMaxDays: 7,
    otc: 'clotrimazole or terbinafine cream as per the label for common superficial fungal infections',
    homeCare: 'Keep the area clean and dry, avoid sharing towels, and change sweaty clothes promptly.',
  },
];

const redFlagTerms = [
  'severe',
  'unbearable',
  'chest pain',
  'shortness of breath',
  'breathing',
  'faint',
  'confusion',
  'blood',
  'stiff neck',
  'dehydration',
  'pregnant',
  'infant',
  'baby',
  'very high',
  'persistent vomiting',
  'weakness',
  'vision',
  'stroke',
  'suicidal',
  'self harm',
  'seizure',
  'high fever',
  'pus',
  'swelling face',
];

const prescriptionTerms = [
  'antibiotic',
  'antibiotics',
  'amoxicillin',
  'azithromycin',
  'steroid',
  'prednisone',
  'insulin',
  'blood pressure medicine',
  'opioid',
  'tramadol',
  'codeine',
  'alprazolam',
  'diazepam',
  'prescription',
];

const seriousConditionTerms = [
  'heart attack',
  'stroke',
  'cancer',
  'seizure',
  'appendicitis',
  'pneumonia',
  'malaria',
  'dengue',
  'covid severe',
  'kidney failure',
  'liver failure',
  'suicide',
  'self harm',
];

const medicalFooter =
  "I am an AI, not a licensed doctor. This is general guidance, not medical advice.\n\n" +
  "🩺 Stay safe! If symptoms worsen or persist beyond 2–3 days, please see a doctor.";

const findSymptomProfile = (text) => {
  const lowerText = text.toLowerCase();
  return symptomProfiles.find((profile) =>
    profile.keywords.some((keyword) => lowerText.includes(keyword))
  );
};

const parseDurationDays = (text, inferStandalone = false) => {
  const lowerText = text.toLowerCase();
  const numberMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|day|days|week|weeks)/);
  if (numberMatch) {
    const value = Number(numberMatch[1]);
    const unit = numberMatch[2];
    if (unit.startsWith('hour') || unit === 'hr' || unit === 'hrs') return value / 24;
    if (unit.startsWith('week')) return value * 7;
    return value;
  }
  if (lowerText.includes('today') || lowerText.includes('morning') || lowerText.includes('few hours')) return 0.5;
  if (lowerText.includes('yesterday')) return 1;
  if (lowerText.includes('two days')) return 2;
  if (lowerText.includes('three days')) return 3;
  if (lowerText.includes('week')) return 7;
  if (inferStandalone && /^\d+(?:\.\d+)?$/.test(lowerText.trim())) return Number(lowerText.trim());
  return null;
};

const hasRedFlag = (text) => {
  const lowerText = text.toLowerCase();
  return redFlagTerms.some((term) => lowerText.includes(term));
};

const includesAny = (text, terms) => {
  const lowerText = text.toLowerCase();
  return terms.some((term) => lowerText.includes(term));
};

const parseSeverity = (text, inferStandalone = false) => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('severe') || lowerText.includes('very bad') || lowerText.includes('unbearable') || lowerText.includes('10/10')) return 'severe';
  if (lowerText.includes('moderate') || lowerText.includes('medium') || lowerText.includes('worse') || lowerText.includes('5/10')) return 'moderate';
  if (lowerText.includes('mild') || lowerText.includes('little') || lowerText.includes('slight') || lowerText.includes('minor')) return 'mild';
  if (inferStandalone) {
    const numeric = Number(lowerText.trim());
    if (Number.isFinite(numeric)) {
      if (numeric >= 8) return 'severe';
      if (numeric >= 4) return 'moderate';
      if (numeric >= 1) return 'mild';
    }
  }
  return null;
};

const parseAge = (text, inferStandalone = false) => {
  const lowerText = text.toLowerCase();
  const ageMatch = lowerText.match(/(?:age|aged|i am|i'm|patient is)\s*(\d{1,3})/);
  if (ageMatch) return Number(ageMatch[1]);
  if (lowerText.includes('child') || lowerText.includes('kid')) return 10;
  if (lowerText.includes('baby') || lowerText.includes('infant')) return 1;
  if (lowerText.includes('adult')) return 30;
  if (lowerText.includes('elderly') || lowerText.includes('senior')) return 70;
  if (inferStandalone && /^\d{1,3}$/.test(lowerText.trim())) return Number(lowerText.trim());
  return null;
};

const parseAllergies = (text, inferStandalone = false) => {
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes('no allergy') ||
    lowerText.includes('no known allergies') ||
    lowerText.includes('not allergic') ||
    (inferStandalone && ['no', 'none', 'nil', 'nothing'].includes(lowerText.trim()))
  ) return 'none';
  const allergyMatch = lowerText.match(/allerg(?:y|ic|ies)\s*(?:to)?\s*([a-z0-9, -]+)/);
  if (allergyMatch) return allergyMatch[1].trim();
  if (inferStandalone && lowerText.trim().length > 1) return lowerText.trim();
  return null;
};

const getNextMissingTriageField = ({ durationDays, severity, age, allergies }) => {
  if (durationDays === null) return 'duration';
  if (!severity) return 'severity';
  if (age === null) return 'age';
  if (!allergies) return 'allergies';
  return null;
};

const classifyTriage = ({ profile, durationDays, severity, age, redFlag }) => {
  if (redFlag || severity === 'severe' || age < 2 || age >= 65) return 'SEVERE';
  if (profile.alwaysDoctor || severity === 'moderate' || durationDays > profile.mildMaxDays) return 'MODERATE';
  return 'MILD';
};

const withMedicalFooter = (text) => `${text}\n\n${medicalFooter}`;

const getDoctorPrompt = (reason) =>
  withMedicalFooter(
    `${reason}\n\nAssessment: MODERATE or SEVERE.\n\nI will not suggest medicines for this. Please consult a doctor or visit a clinic because this may indicate a condition that needs proper examination, testing, or prescription treatment. If symptoms feel emergency-level, call local emergency services or go to the nearest emergency room.`
  );

const getClarifyingPrompt = (profile, field) => {
  const prompts = {
    duration: `This may be related to ${profile.label}. How long has this been happening? You can reply like "6 hours", "2 days", or "1 week".`,
    severity: `Got the duration. How would you rate the severity: mild, moderate, or severe? Mention red flags too, like chest pain, breathing trouble, blood, fainting, dehydration, high fever, eye pain, pus, or rapidly worsening symptoms.`,
    age: 'Thanks. What is the patient age? A number is enough, for example "24".',
    allergies: 'Any known allergies to medicines or foods? Reply with the allergy name, or "none".',
  };

  return withMedicalFooter(prompts[field] || prompts.duration);
};

const FloatingChatbot = ({ activeWallet, userType = 'patient', onConnectDoctor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(2); // Start from 2 since we have initial message
  const [triage, setTriage] = useState({
    stage: 'symptom',
    symptom: null,
    summary: '',
    durationDays: null,
    severity: null,
    age: null,
    allergies: null,
    pendingField: null,
  });
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm Medi AI. Describe a symptom like fever, cough, headache, nausea, rash, acidity, cramps, sleep trouble, or minor cuts. I may ask duration, severity, age, and allergies before giving basic guidance.",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const resetTriage = () => {
    setTriage({
      stage: 'symptom',
      symptom: null,
      summary: '',
      durationDays: null,
      severity: null,
      age: null,
      allergies: null,
      pendingField: null,
    });
    setMessages([
      {
        id: Date.now(),
        text: "Let's start again. What problem are you facing?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
    setMessageIdCounter(Date.now() + 1);
  };

  const buildTriageResponse = (userMessage) => {
    if (includesAny(userMessage, prescriptionTerms)) {
      setTriage({ ...triage, stage: 'done' });
      return withMedicalFooter(
        "I cannot advise on prescription drugs, antibiotic choice, controlled medicines, or prescription dosing. Please consult a licensed doctor or pharmacist, because the right medicine depends on diagnosis, age, pregnancy status, allergies, other medicines, and medical history."
      );
    }

    if (includesAny(userMessage, seriousConditionTerms)) {
      setTriage({ ...triage, stage: 'done' });
      return withMedicalFooter(
        "I cannot guide serious or potentially emergency conditions through chat. This could be related to something that needs urgent clinical assessment. Please consult a doctor, visit a clinic, or use emergency services if symptoms are severe."
      );
    }

    const incomingProfile = findSymptomProfile(userMessage);
    const isNewCheck = triage.stage === 'done' && incomingProfile;
    const activeTriage = isNewCheck
      ? {
        stage: 'symptom',
        symptom: incomingProfile,
        summary: '',
        durationDays: null,
        severity: null,
        age: null,
        allergies: null,
        pendingField: null,
      }
      : triage;
    const profile = activeTriage.symptom || incomingProfile;
    const durationDays = parseDurationDays(userMessage, activeTriage.pendingField === 'duration') ?? activeTriage.durationDays;
    const severity = parseSeverity(userMessage, activeTriage.pendingField === 'severity') || activeTriage.severity;
    const age = parseAge(userMessage, activeTriage.pendingField === 'age') ?? activeTriage.age;
    const allergies = parseAllergies(userMessage, activeTriage.pendingField === 'allergies') || activeTriage.allergies;
    const redFlag = hasRedFlag(`${activeTriage.summary} ${userMessage}`);

    if (!profile) {
      setTriage({
        stage: 'symptom',
        symptom: null,
        summary: '',
        durationDays: null,
        severity: null,
        age: null,
        allergies: null,
        pendingField: null,
      });
      return (
        "I can give basic guidance for fever, cold and flu, headache, cough, nausea, diarrhea, acidity, minor cuts and burns, rashes, muscle and joint pain, eye irritation, earache, toothache, fatigue, mild anxiety, insomnia, menstrual cramps, UTI symptoms, acne, and fungal infections.\n\n" +
        withMedicalFooter("Please describe one main symptom first. If you have chest pain, breathing trouble, fainting, heavy bleeding, confusion, or severe pain, consult a doctor urgently.")
      );
    }

    const nextMissingField = getNextMissingTriageField({ durationDays, severity, age, allergies });
    if (nextMissingField) {
      setTriage({
        stage: 'clarify',
        symptom: profile,
        summary: `${activeTriage.summary} ${userMessage}`.trim(),
        durationDays,
        severity,
        age,
        allergies,
        pendingField: nextMissingField,
      });
      return getClarifyingPrompt(profile, nextMissingField);
    }

    const assessment = classifyTriage({ profile, durationDays, severity, age, redFlag });

    setTriage({
      stage: 'done',
      symptom: profile,
      summary: `${activeTriage.summary} ${userMessage}`.trim(),
      durationDays,
      severity,
      age,
      allergies,
      pendingField: null,
    });

    if (assessment !== 'MILD') {
      if (profile.alwaysDoctor) {
        return getDoctorPrompt(profile.doctorReason);
      }
      if (redFlag) {
        return getDoctorPrompt("You mentioned a red-flag symptom.");
      }
      if (severity === 'moderate' || severity === 'severe') {
        return getDoctorPrompt(`Your symptom severity is ${severity}, so this could be more than a mild self-care issue.`);
      }
      if (age < 2 || age >= 65) {
        return getDoctorPrompt("The patient's age can increase risk, so professional review is safer.");
      }
      return getDoctorPrompt(
        `Your ${profile.label} has lasted longer than the usual mild window (${profile.mildMaxDays} day${profile.mildMaxDays === 1 ? '' : 's'}).`
      );
    }

    const allergyNote = allergies === 'none'
      ? 'You reported no known allergies.'
      : `You mentioned allergies: ${allergies}. Avoid any medicine or product you may be allergic to.`;

    return withMedicalFooter(
      `Assessment: MILD.\n\n` +
      `This may indicate a mild ${profile.label} based on short duration, mild severity, and no red flags shared.\n\n` +
      `Common over-the-counter option by generic name: ${profile.otc}.\n\n` +
      `Home remedies: ${profile.homeCare}\n\n` +
      `Basic precautions: Follow label directions, do not combine duplicate ingredients, avoid medicines unsafe for your health conditions, and stop if side effects occur. ${allergyNote}`
    );
  };

  const generateIntelligentResponse = (userMessage, conversationHistory) => {
    if (!userMessage || typeof userMessage !== 'string') {
      return "I didn't receive a valid message. Please try again.";
    }
    const lowerMessage = userMessage.toLowerCase();
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (includesAny(userMessage, prescriptionTerms) || includesAny(userMessage, seriousConditionTerms)) {
      return buildTriageResponse(userMessage);
    }
    if (
      triage.stage !== 'done' ||
      findSymptomProfile(userMessage) ||
      lowerMessage.includes('mild') ||
      lowerMessage.includes('severe') ||
      parseDurationDays(userMessage) !== null
    ) {
      return buildTriageResponse(userMessage);
    }
    // Simple symptom guidance (not medical advice)
    if (
      lowerMessage.includes('cold') ||
      lowerMessage.includes('cough') ||
      lowerMessage.includes('runny nose') ||
      lowerMessage.includes('sore throat')
    ) {
      return (
        "It sounds like a common cold. General self-care tips:\n\n" +
        "• Rest and stay hydrated (warm fluids can soothe a sore throat)\n" +
        "• Saline nasal spray or steam inhalation for congestion\n" +
        "• Honey/lozenges for throat irritation (avoid honey in children <1 year)\n" +
        "• Consider acetaminophen/paracetamol for fever or aches (follow label dosing)\n\n" +
        "Red flags (book an appointment or seek care):\n" +
        "• High fever >38.5°C (101.3°F) lasting >3 days\n" +
        "• Shortness of breath, chest pain, severe sore throat\n" +
        "• Dehydration, confusion, or symptoms not improving after ~7–10 days\n\n" +
        "Would you like me to help book an appointment or message your doctor?"
      );
    }

    if (lowerMessage.includes('headache') || lowerMessage.includes('head ache') || lowerMessage.includes('migraine')) {
      return (
        "For a mild headache, general tips:\n\n" +
        "• Hydrate and rest in a quiet, dark room\n" +
        "• Limit screen time and consider gentle neck/shoulder stretches\n" +
        "• Over-the-counter pain relief like acetaminophen/ibuprofen (if safe for you)\n\n" +
        "Seek urgent care if any red flags:\n" +
        "• Sudden 'worst headache of your life'\n" +
        "• Head injury, fainting, confusion, weakness, vision/speech changes\n" +
        "• Fever with stiff neck, persistent vomiting, or new neurological symptoms\n\n" +
        "If headaches are frequent or severe, I can help you book an appointment."
      );
    }


    // Check for follow-up questions based on conversation context
    if (lastMessage && lastMessage.sender === 'bot' && lastMessage.text) {
      const lastBotMessage = lastMessage.text.toLowerCase();

      // If last message was about appointments
      if (lastBotMessage.includes('appointment') && (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('when'))) {
        return "To book an appointment, go to the 'Book Appointment' tab in your dashboard. You'll see available time slots from our verified doctors. You can filter by specialty, date, and time. Once you select a slot, confirm your details and the appointment will be scheduled. You'll receive a confirmation and can view it in your dashboard.";
      }

      // If last message was about records
      if (lastBotMessage.includes('record') && (lowerMessage.includes('where') || lowerMessage.includes('how') || lowerMessage.includes('what'))) {
        return "Your medical records are stored securely in the 'My Records' tab. This includes consultation summaries, prescriptions, test results, and treatment plans. All data is encrypted and only accessible to you and authorized healthcare providers. You can download your records, share them with doctors, and track your health journey over time.";
      }

      // If last message was about fundraising
      if (lastBotMessage.includes('fundraising') && (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('process'))) {
        return "To request fundraising help, go to the 'Fundraising' tab and click 'Request Fundraiser'. You'll need to provide details about your medical condition, treatment costs, and financial situation. Our team will review your request and help connect you with potential donors and fundraising campaigns. This can help cover medical expenses, treatments, or medications.";
      }
    }

    // Direct queries
    if (lowerMessage.includes('appointment') || lowerMessage.includes('book') || lowerMessage.includes('schedule')) {
      if (lowerMessage.includes('how')) {
        return "To book an appointment:\n\n1. Go to 'Book Appointment' tab\n2. Choose your preferred specialty\n3. Select available date and time\n4. Review doctor's profile and ratings\n5. Confirm your details\n6. Receive confirmation\n\nYou can also filter by location, insurance, or specific doctor preferences. Need help with a specific step?";
      }
      return "I can help you book an appointment! Navigate to the 'Book Appointment' tab in your dashboard. You'll see available time slots from our verified doctors. You can filter by specialty, date, and time. What type of appointment are you looking for?";
    }

    if (lowerMessage.includes('health') || lowerMessage.includes('medical') || lowerMessage.includes('symptom')) {
      if (lowerMessage.includes('symptom') || lowerMessage.includes('pain') || lowerMessage.includes('feel')) {
        return withMedicalFooter("I can help with basic symptom triage for common mild issues. Please describe one main symptom, its duration, severity, age, and known allergies. I never diagnose; I can only say what it may indicate and when to seek professional care.");
      }
      return "Your health is important! I can help you with appointment booking, accessing your medical records, or connecting with healthcare providers. What specific health-related assistance do you need?";
    }

    if (lowerMessage.includes('record') || lowerMessage.includes('history') || lowerMessage.includes('consultation')) {
      if (lowerMessage.includes('where') || lowerMessage.includes('find')) {
        return "Your medical records are located in the 'My Records' tab. This includes all your past consultations, prescriptions, test results, and treatment plans. You can search by date, doctor, or type of record. All data is encrypted and securely stored on the blockchain for your privacy.";
      }
      return "You can view your medical records and consultation history in the 'My Records' tab. This includes all your past consultations, prescriptions, and health data. Is there something specific you're looking for?";
    }

    if (lowerMessage.includes('fundraising') || lowerMessage.includes('fund') || lowerMessage.includes('financial')) {
      if (lowerMessage.includes('how') || lowerMessage.includes('process')) {
        return "To request fundraising help:\n\n1. Go to 'Fundraising' tab\n2. Click 'Request Fundraiser'\n3. Fill out the application form\n4. Provide medical and financial details\n5. Submit for review\n6. Our team will contact you\n\nThis can help cover medical expenses, treatments, or medications. What type of financial assistance do you need?";
      }
      return "I can help you with fundraising requests! If you need financial assistance for medical treatments, you can submit a request in the 'Fundraising' tab. Would you like me to explain the process?";
    }

    if (lowerMessage.includes('wallet') || lowerMessage.includes('blockchain') || lowerMessage.includes('crypto')) {
      return "MediChain uses blockchain technology to securely store your health data. Your wallet address serves as your unique identifier and ensures data privacy. All your information is encrypted and only accessible to authorized healthcare providers. This technology provides transparency, security, and gives you full control over your health data.";
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! I'm here to help you navigate MediChain. I can assist with appointments, medical records, fundraising, and answer any questions about the platform. What would you like to know?";
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('guide')) {
      return "I'm here to help! I can assist with:\n\n• Booking appointments\n• Accessing medical records\n• Fundraising requests\n• Platform navigation\n• General questions about MediChain\n\nWhat specific help do you need?";
    }

    if (lowerMessage.includes('doctor') || lowerMessage.includes('physician') || lowerMessage.includes('specialist')) {
      if (lowerMessage.includes('find') || lowerMessage.includes('search')) {
        return "You can find and book doctors through the 'Book Appointment' tab. You'll see verified healthcare professionals with their specialties, ratings, and available time slots. You can filter by specialty, location, or availability. All our doctors are verified and licensed professionals.";
      }
      return "Our platform connects you with verified healthcare professionals. You can view doctor profiles, specialties, ratings, and book appointments directly. What type of doctor are you looking for?";
    }

    if (lowerMessage.includes('prescription') || lowerMessage.includes('medication') || lowerMessage.includes('medicine')) {
      return withMedicalFooter("I cannot advise on prescription drugs, prescription refills, controlled medicines, antibiotics, or medication changes. Please consult a licensed doctor or pharmacist. You can still view existing prescriptions in your medical records under the 'My Records' tab.");
    }

    if (lowerMessage.includes('test') || lowerMessage.includes('lab') || lowerMessage.includes('result')) {
      return "Lab test results and medical tests are stored in your 'My Records' tab. You can view test results, download reports, and share them with healthcare providers. All results are securely stored and accessible whenever you need them. Are you looking for specific test results?";
    }

    // Additional common symptoms
    if (lowerMessage.includes('fever')) {
      return (
        "For a mild fever: rest, hydrate, and consider acetaminophen/ibuprofen (if appropriate).\n" +
        "Monitor temperature and symptoms. Seek care if: fever >39°C (102.2°F), lasts >3 days, severe headache, stiff neck, shortness of breath, chest pain, confusion, or persistent vomiting.\n\n" +
        "Would you like to book an appointment?"
      );
    }
    if (lowerMessage.includes('stomach') || lowerMessage.includes('nausea') || lowerMessage.includes('vomit') || lowerMessage.includes('diarrhea')) {
      return (
        "For mild stomach upset: small sips of oral rehydration, bland foods (BRAT: bananas, rice, applesauce, toast) once tolerated, and rest.\n" +
        "Avoid dehydration; seek care if blood in stool/vomit, persistent high fever, severe abdominal pain, signs of dehydration (very little urine, dizziness), or symptoms last >2–3 days.\n\n" +
        "I can also help you book a consultation."
      );
    }

    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('critical')) {
      return "For medical emergencies, please call emergency services (911) immediately or go to the nearest emergency room. I cannot provide emergency medical assistance. For urgent but non-emergency care, you can book a same-day appointment if available, or contact your healthcare provider directly.";
    }

    if (lowerMessage.includes('insurance') || lowerMessage.includes('billing') || lowerMessage.includes('cost')) {
      return "MediChain works with various insurance providers. When booking appointments, you can see if a doctor accepts your insurance. For specific billing questions or insurance coverage, you'll need to contact the doctor's office directly. I can help you find doctors who accept your insurance type.";
    }

    if (lowerMessage.includes('family') || lowerMessage.includes('child') || lowerMessage.includes('parent')) {
      return "You can manage family accounts through your profile settings. Add family members to share medical records and coordinate care. Each family member will have their own secure profile while maintaining family connections. This is useful for managing children's health or coordinating care for elderly parents.";
    }

    if (lowerMessage.includes('privacy') || lowerMessage.includes('security') || lowerMessage.includes('data')) {
      return "Your privacy and data security are our top priorities. All health information is encrypted using blockchain technology. You control who can access your data, and all access is logged and auditable. Your information is never sold to third parties and is only shared with authorized healthcare providers you approve.";
    }

    // Default intelligent response
    return "I understand you're asking about that. As your Medi AI assistant, I'm here to help with health-related queries, appointment booking, accessing your records, and navigating the platform. Could you please rephrase your question or let me know what specific assistance you need? I can help with appointments, records, fundraising, doctor searches, prescriptions, and more.";
  };

  const handleConnectDoctor = () => {
    setIsOpen(false);
    if (typeof onConnectDoctor === 'function') {
      onConnectDoctor();
      return;
    }
    window.location.href = '/dashboard/patient';
  };

  const handleSendMessage = async () => {
    if (!newMessage || !newMessage.trim() || isLoading) return;

    // Clear any previous errors
    if (error) setError(null);

    const messageText = newMessage.trim();
    const userMessage = {
      id: messageIdCounter,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setMessageIdCounter(prev => prev + 1);
    setIsTyping(true);
    setIsLoading(true);

    try {
      // Get conversation history for context (last 10 messages)
      const conversationHistory = Array.isArray(messages) ? messages.slice(-10) : [];

      // Generate intelligent response
      const aiResponse = generateIntelligentResponse(messageText, conversationHistory);

      const botResponse = {
        id: messageIdCounter + 1,
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      setMessageIdCounter(prev => prev + 2); // Increment by 2 since we added 2 messages
    } catch (error) {
      console.error('Error generating response:', error);
      setError('Failed to generate response. Please try again.');

      // Fallback response
      const fallbackResponse = {
        id: messageIdCounter + 1,
        text: "I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment, or you can use the navigation tabs in your dashboard for assistance.",
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fallbackResponse]);
      setMessageIdCounter(prev => prev + 2);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && newMessage.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    // Ensure the chatbox is visible when opened
    if (!isOpen) {
      setTimeout(() => {
        const chatElement = document.querySelector('[data-chatbox]');
        if (chatElement) {
          chatElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
    }
  };


  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[10000]">
        <Button
          onClick={toggleChat}
          className={`h-16 w-16 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
            }`}
          size="icon"
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </Button>
      </div>

      {/* Chat Interface - Completely remodeled positioning */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
            onClick={toggleChat}
          />
          {/* Chat Container */}
          <div className="fixed inset-0 z-[9999] flex items-end justify-end p-2 sm:p-4 pointer-events-none">
            <div
              data-chatbox
              className="w-full max-w-[420px] h-[90vh] sm:h-[85vh] max-h-[700px] sm:max-h-[600px] min-h-[300px] sm:min-h-[400px] transition-all duration-300 ease-in-out transform animate-in slide-in-from-bottom-4 fade-in-0 pointer-events-auto"
            >
              <Card className="h-full shadow-2xl border-0 rounded-lg overflow-hidden">
                <CardContent className="p-0 h-full grid grid-rows-[auto_1fr_auto]">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-white/20">
                            <AvatarFallback className="bg-white/20 text-white">
                              <Bot className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                          <h3 className="font-semibold">Medi AI</h3>
                          <p className="text-xs text-primary-foreground/80">Always here to help</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleChat}
                        className="text-white hover:bg-white/20"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="p-4 h-full">
                    <div className="space-y-4 pr-4 pb-4">
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        <div className="flex gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <span>For emergencies or severe symptoms, do not wait for chatbot guidance.</span>
                        </div>
                      </div>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.sender === 'bot' && (
                            <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${message.sender === 'user'
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted border'
                              }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            <p className={`text-xs mt-1 ${message.sender === 'user'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                              }`}>
                              {message.timestamp.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {triage.stage === 'done' && (
                        <div className="flex flex-wrap gap-2 pl-10">
                          <Button size="sm" variant="secondary" onClick={handleConnectDoctor}>
                            <Stethoscope className="mr-2 h-4 w-4" />
                            Connect Doctor
                          </Button>
                          <Button size="sm" variant="outline" onClick={resetTriage}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            New Check
                          </Button>
                        </div>
                      )}
                      {isTyping && (
                        <div className="flex justify-start">
                          <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted border p-3 rounded-lg">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t bg-background">
                    {/* Error Display */}
                    {error && (
                      <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask Medi AI anything..."
                        className="flex-1"
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isLoading}
                        size="icon"
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FloatingChatbot;
