'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Minimize2, Loader2 } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Card, CardContent } from '@/frontend/components/ui/card';
import { Avatar, AvatarFallback } from '@/frontend/components/ui/avatar';

const FloatingChatbot = ({ activeWallet, userType = 'patient' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(2); // Start from 2 since we have initial message
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm Medi AI, your intelligent health assistant. I can help you with appointments, medical records, health questions, and navigating MediChain. How can I assist you today?",
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

  const generateIntelligentResponse = (userMessage, conversationHistory) => {
    if (!userMessage || typeof userMessage !== 'string') {
      return "I didn't receive a valid message. Please try again.";
    }
    const lowerMessage = userMessage.toLowerCase();
    const lastMessage = conversationHistory[conversationHistory.length - 1];
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
        return "I understand you're experiencing health concerns. While I can provide general information, it's important to consult with a healthcare professional for proper diagnosis and treatment. I can help you book an appointment with a doctor who can properly assess your symptoms. What specific symptoms are you experiencing?";
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
      return "Your prescriptions and medications are stored in your medical records under the 'My Records' tab. You can view current and past prescriptions, refill requests, and medication history. For new prescriptions, you'll need to book an appointment with a doctor. Is there something specific about your medications?";
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
