
'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/frontend/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Send, Loader2, ArrowLeft, MessageSquare, Plus, Search, X, User, Users } from 'lucide-react';
import { getConversations, getMessages, sendMessage, getAllDoctorProfiles, getAllPatientProfiles } from '@/backend/services/mongodb';
import { cn } from '@/frontend/lib/utils';
import { useToast } from '@/frontend/hooks/use-toast';

// Separate memoized MessageInput component to prevent re-renders
const MessageInput = React.memo(({
    newMessage,
    onMessageChange,
    onSendMessage,
    isSending,
    disabled
}) => {
    const inputRef = useRef(null);

    // Focus input when component mounts
    useEffect(() => {
        if (inputRef.current && !disabled) {
            inputRef.current.focus();
        }
    }, [disabled]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !isSending && !disabled) {
            e.preventDefault();
            onSendMessage();
        }
    }, [onSendMessage, isSending, disabled]);

    const handleChange = useCallback((e) => {
        onMessageChange(e.target.value);
    }, [onMessageChange]);

    return (
        <div className="flex items-center gap-3">
            <Input
                ref={inputRef}
                value={newMessage}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={disabled || isSending}
                className="flex-1 h-12 text-base"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
            <Button
                onClick={onSendMessage}
                disabled={isSending || !newMessage.trim() || disabled}
                size="icon"
                className="h-12 w-12 bg-primary hover:bg-primary/90"
            >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
        </div>
    );
});

MessageInput.displayName = 'MessageInput';

const normalizeWallet = (wallet) => (wallet || '').toLowerCase();
const getOtherUserType = (userType) => userType === 'doctor' ? 'patient' : 'doctor';
const getParticipantId = (role, wallet) => `${role}:${normalizeWallet(wallet)}`;
const getParticipantRole = (participantId) => participantId?.includes(':')
    ? participantId.split(':')[0]
    : null;
const getParticipantWallet = (participantId) => participantId?.includes(':')
    ? participantId.substring(participantId.indexOf(':') + 1)
    : normalizeWallet(participantId);

const Chat = ({ activeWallet, userType, initialContact }) => {
    const [conversations, setConversations] = useState([]);
    const [contacts, setContacts] = useState({});
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [activeTab, setActiveTab] = useState('conversations');
    const messagesEndRef = useRef(null);
    const { toast } = useToast();
    const normalizedWallet = normalizeWallet(activeWallet);
    const currentParticipantId = activeWallet ? getParticipantId(userType, activeWallet) : '';
    const otherUserType = getOtherUserType(userType);

    const isCurrentParticipant = useCallback((participantId) => {
        const normalizedParticipant = normalizeWallet(participantId);
        return normalizedParticipant === currentParticipantId ||
            (!normalizedParticipant.includes(':') && normalizedParticipant === normalizedWallet);
    }, [currentParticipantId, normalizedWallet]);

    const getOtherParticipantId = useCallback((participants = []) => {
        return participants.find(participant => !isCurrentParticipant(participant));
    }, [isCurrentParticipant]);

    // Helper function to get contact display info
    const getContactDisplayInfo = useCallback((contactId, contact, userType) => {
        let contactName;
        const contactWallet = contact?.walletAddress || getParticipantWallet(contactId);

        // First priority: use the contact's actual name if available
        if (contact?.name) {
            contactName = userType === 'patient' && !contact.name.toLowerCase().startsWith('dr.')
                ? `Dr. ${contact.name}`
                : contact.name;
        } else if (userType === 'patient') {
            // If patient is chatting, other participant is a doctor
            // Try to find doctor name from contacts with case-insensitive matching
            let foundDoctorName = null;
            if (contacts && contactId) {
                const lowerCaseContactId = contactId.toLowerCase();
                const lowerCaseContactWallet = contactWallet.toLowerCase();

                // Try exact match first
                if (contacts[contactId]?.name) {
                    foundDoctorName = contacts[contactId].name;
                }
                // Then try case-insensitive match
                else {
                    const foundContactKey = Object.keys(contacts).find(key =>
                        key.toLowerCase() === lowerCaseContactId ||
                        contacts[key]?.walletAddress?.toLowerCase() === lowerCaseContactWallet
                    );

                    if (foundContactKey && contacts[foundContactKey]?.name) {
                        foundDoctorName = contacts[foundContactKey].name;
                    }
                }
            }

            if (foundDoctorName) {
                contactName = foundDoctorName.toLowerCase().startsWith('dr.')
                    ? foundDoctorName
                    : `Dr. ${foundDoctorName}`;
            } else {
                contactName = `Dr. ${contactWallet?.substring(0, 6)}...`;
            }
        } else if (userType === 'doctor') {
            // If doctor is chatting, other participant is a patient
            // Try to find patient name from contacts with case-insensitive matching
            let foundPatientName = null;
            if (contacts && contactId) {
                const lowerCaseContactId = contactId.toLowerCase();
                const lowerCaseContactWallet = contactWallet.toLowerCase();

                // Try exact match first
                if (contacts[contactId]?.name) {
                    foundPatientName = contacts[contactId].name;
                }
                // Then try case-insensitive match
                else {
                    const foundContactKey = Object.keys(contacts).find(key =>
                        key.toLowerCase() === lowerCaseContactId ||
                        contacts[key]?.walletAddress?.toLowerCase() === lowerCaseContactWallet
                    );

                    if (foundContactKey && contacts[foundContactKey].name) {
                        foundPatientName = contacts[foundContactKey].name;
                    }
                }
            }

            if (foundPatientName) {
                contactName = foundPatientName;
            } else {
                contactName = `Patient ${contactWallet?.substring(0, 6)}...`;
            }
        } else {
            // Fallback for other user types
            contactName = `${contactWallet?.substring(0, 6)}...`;
        }

        const profilePhoto = contact?.profilePhoto || contact?.documents?.photo;

        return { contactName, profilePhoto };
    }, [contacts]);

    // Memoize expensive operations to prevent unnecessary re-renders
    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim() || !contacts) return {};

        const query = searchQuery.toLowerCase();
        const filtered = {};

        Object.entries(contacts).forEach(([contactId, contact]) => {
            const contactName = contact.name || '';
            const walletAddress = contact.walletAddress || getParticipantWallet(contactId);

            if (contactName.toLowerCase().includes(query) ||
                walletAddress.toLowerCase().includes(query) ||
                walletAddress.toLowerCase().startsWith(query) ||
                walletAddress.toLowerCase().endsWith(query)) {
                filtered[contactId] = contact;
            }
        });

        return filtered;
    }, [searchQuery, contacts]);

    const isWalletAddress = useMemo(() => {
        const query = searchQuery.trim();
        return query.startsWith('0x') && query.length >= 42;
    }, [searchQuery]);

    const getWalletSuggestions = useMemo(() => {
        if (!searchQuery.trim() || !contacts) return [];

        const query = searchQuery.toLowerCase();
        const suggestions = [];

        Object.entries(contacts).forEach(([contactId, contact]) => {
            const walletAddress = contact.walletAddress || getParticipantWallet(contactId);
            if (walletAddress.toLowerCase().includes(query) &&
                walletAddress.toLowerCase().startsWith('0x')) {
                suggestions.push(walletAddress);
            }
        });

        return [...new Set(suggestions)].slice(0, 5);
    }, [searchQuery, contacts]);

    const conversationData = useMemo(() => {
        return conversations.map(convo => {
            const otherParticipantId = getOtherParticipantId(convo.participants);
            const otherParticipantWallet = getParticipantWallet(otherParticipantId);

            // Try to find the contact in multiple ways
            let foundContact = null;
            let foundContactKey = null;

            // First, try exact match
            if (contacts?.[otherParticipantId]) {
                foundContact = contacts[otherParticipantId];
                foundContactKey = otherParticipantId;
            }
            // Then, try case-insensitive match
            else if (contacts && otherParticipantId) {
                const lowerCaseOtherId = otherParticipantId.toLowerCase();
                foundContactKey = Object.keys(contacts).find(key =>
                    key.toLowerCase() === lowerCaseOtherId ||
                    contacts[key]?.walletAddress?.toLowerCase() === otherParticipantWallet
                );
                if (foundContactKey) {
                    foundContact = contacts[foundContactKey];
                }
            }

            // If no contact found, create a fallback
            if (!foundContact) {
                foundContact = { walletAddress: otherParticipantWallet };
            }

            // Use helper function to get contact display info
            const { contactName, profilePhoto } = getContactDisplayInfo(otherParticipantId, foundContact, userType);

            const lastMessage = convo.lastMessageText || 'No messages yet';
            const lastMessageTime = convo.lastMessageTimestamp ?
                new Date(convo.lastMessageTimestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '';

            return {
                ...convo,
                otherParticipantId,
                contact: { ...foundContact, profilePhoto },
                contactName,
                lastMessage,
                lastMessageTime
            };
        });
    }, [conversations, contacts, userType, getContactDisplayInfo, getOtherParticipantId]);

    // Memoize fetch functions
    const fetchChatData = useCallback(async () => {
        if (!activeWallet) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const [convos, contactProfiles] = await Promise.all([
                getConversations(activeWallet, userType),
                userType === 'doctor' ? getAllPatientProfiles() : getAllDoctorProfiles()
            ]);

            // Ensure proper serialization for conversations
            const serializedConversations = (convos || []).map(conv => ({
                id: conv.id,
                participants: conv.participants || [],
                participantWallets: conv.participantWallets || [],
                participantRoles: conv.participantRoles || {},
                lastMessageTimestamp: conv.lastMessageTimestamp,
                lastMessageText: conv.lastMessageText,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt
            }));

            setConversations(serializedConversations);

            // Create proper contacts map with serialized data
            const contactsMap = {};
            const profileList = Array.isArray(contactProfiles)
                ? contactProfiles
                : Object.values(contactProfiles || {});

            if (profileList.length > 0) {
                profileList.forEach(profile => {
                    if (profile.walletAddress) {
                        const contactWallet = profile.walletAddress.toLowerCase();
                        const contactParticipantId = getParticipantId(otherUserType, contactWallet);
                        contactsMap[contactParticipantId] = {
                            id: profile.id,
                            participantId: contactParticipantId,
                            walletAddress: contactWallet,
                            name: profile.name || (userType === 'doctor' ? 'Unknown Patient' : 'Unknown Doctor'),
                            specialty: profile.specialty || profile.specialization || null,
                            age: profile.age || null,
                            profilePhoto: profile.profilePhoto || profile.documents?.photo || null,
                            documents: profile.documents || null,
                        };
                    }
                });
            }
            setContacts(contactsMap);
        } catch (err) {
            console.error('Error fetching chat data:', err);
            setError('Failed to load conversations');
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load conversations. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [activeWallet, userType, otherUserType, toast]);

    const fetchMessages = useCallback(async (conversationId) => {
        if (!conversationId) return;

        try {
            const msgs = await getMessages(conversationId);

            // Ensure proper serialization for messages
            const serializedMessages = (msgs || []).map(msg => ({
                id: msg.id,
                conversationId: msg.conversationId,
                senderId: msg.senderId,
                receiverId: msg.receiverId,
                senderWallet: msg.senderWallet,
                receiverWallet: msg.receiverWallet,
                senderRole: msg.senderRole,
                receiverRole: msg.receiverRole,
                text: msg.text,
                timestamp: msg.timestamp,
                read: msg.read || false
            }));

            setMessages(serializedMessages);
        } catch (err) {
            console.error('Error fetching messages:', err);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load messages. Please try again.'
            });
        }
    }, [toast]);

    // Stable effect dependencies
    useEffect(() => {
        if (activeWallet) {
            fetchChatData();
            const interval = setInterval(fetchChatData, 15000); // Poll conversations every 15 seconds
            return () => clearInterval(interval);
        }
    }, [activeWallet, fetchChatData]);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id);
            const interval = setInterval(() => fetchMessages(selectedConversation.id), 15000); // Poll messages every 15 seconds
            return () => clearInterval(interval);
        }
    }, [selectedConversation, fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (initialContact && conversations.length > 0) {
            const initialContactParticipantId = getParticipantId(otherUserType, initialContact);
            const convo = conversations.find(c =>
                c.participants.includes(initialContactParticipantId) ||
                c.participants.includes(initialContact.toLowerCase())
            );
            if (convo) {
                setSelectedConversation(convo);
            }
        }
    }, [initialContact, conversations, otherUserType]);

    // Memoize handlers
    const handleSelectConversation = useCallback((convo) => {
        setSelectedConversation(convo);
        setMessages([]);
        setActiveTab('conversations');
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        setIsSending(true);
        try {
            const receiverParticipantId = selectedConversation.otherParticipantId ||
                getOtherParticipantId(selectedConversation.participants);
            const receiverWallet = selectedConversation.contact?.walletAddress ||
                getParticipantWallet(receiverParticipantId);
            const receiverRole = getParticipantRole(receiverParticipantId) || otherUserType;

            await sendMessage({
                conversationId: selectedConversation.id,
                senderId: activeWallet,
                receiverId: receiverWallet,
                senderRole: userType,
                receiverRole,
                text: newMessage,
            });

            setNewMessage('');
            await fetchMessages(selectedConversation.id);
            await fetchChatData(); // Re-fetch all chat data to get latest lastMessage

        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not send message. Please try again.'
            });
        } finally {
            setIsSending(false);
        }
    }, [newMessage, selectedConversation, activeWallet, userType, otherUserType, getOtherParticipantId, fetchMessages, fetchChatData, toast]);

    const createNewConversation = useCallback(async (contactId) => {
        if (!activeWallet || !contactId) return;

        try {
            setIsSending(true);
            const receiverWallet = getParticipantWallet(contactId);
            const receiverRole = getParticipantRole(contactId) || otherUserType;

            await sendMessage({
                conversationId: null,
                senderId: activeWallet,
                receiverId: receiverWallet,
                senderRole: userType,
                receiverRole,
                text: 'Hello! I would like to start a conversation.',
            });

            await fetchChatData();
            setSearchQuery('');
            setShowSearchResults(false);
            setActiveTab('conversations');

            toast({
                title: 'Conversation Started',
                description: 'New conversation created successfully.'
            });
        } catch (error) {
            console.error('Error creating conversation:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not create conversation. Please try again.'
            });
        } finally {
            setIsSending(false);
        }
    }, [activeWallet, userType, otherUserType, fetchChatData, toast]);

    const handleSearch = useCallback((e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setShowSearchResults(true);
        }
    }, [searchQuery]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setShowSearchResults(false);
    }, []);

    const handleMessageChange = useCallback((value) => {
        setNewMessage(value);
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-muted-foreground">Loading conversations...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-destructive/50" />
                    <p className="text-destructive mb-2 font-medium">{error}</p>
                    <p className="text-sm text-muted-foreground mb-4">Unable to load your conversations</p>
                    <Button onClick={fetchChatData} variant="outline" className="gap-2">
                        <Loader2 className="h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    // Render ConversationList
    const renderConversationList = () => (
        <div className="h-full flex flex-col">
            <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Messages</h2>
                        <p className="text-sm text-muted-foreground">
                            {userType === 'patient' ? 'Chat with your doctors' : 'Chat with your patients'}
                        </p>
                    </div>
                    <Button
                        onClick={() => setActiveTab('new-chat')}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                    </Button>
                </div>

                <div className="flex space-x-1 bg-muted/50 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('conversations')}
                        className={cn(
                            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            activeTab === 'conversations'
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Users className="h-4 w-4 inline mr-2" />
                        Conversations
                    </button>
                    <button
                        onClick={() => setActiveTab('new-chat')}
                        className={cn(
                            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            activeTab === 'new-chat'
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Plus className="h-4 w-4 inline mr-2" />
                        New Chat
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'conversations' ? (
                    <ScrollArea className="h-full">
                        <div className="p-4">
                            {conversationData.length > 0 ? (
                                <div className="space-y-3">
                                    {conversationData.map(convo => (
                                        <button
                                            key={convo.id}
                                            onClick={() => handleSelectConversation(convo)}
                                            className={cn(
                                                "w-full p-4 rounded-xl border transition-all duration-200 text-left hover:shadow-md",
                                                selectedConversation?.id === convo.id
                                                    ? "border-primary bg-primary/5 shadow-md"
                                                    : "border-border hover:border-primary/30"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-12 w-12 border-2 border-primary/20">
                                                    <AvatarImage src={convo.contact.profilePhoto || convo.contact.documents?.photo} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                        {convo.contactName.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="font-semibold text-foreground truncate">
                                                            {convo.contactName}
                                                        </h3>
                                                        {convo.lastMessageTime && (
                                                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                                                {convo.lastMessageTime}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {convo.lastMessage}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-4">
                                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                                    <h3 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h3>
                                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                        {userType === 'patient'
                                            ? 'Start chatting with your doctors to discuss your health concerns'
                                            : 'Connect with your patients to provide medical guidance'
                                        }
                                    </p>
                                    <Button
                                        onClick={() => setActiveTab('new-chat')}
                                        className="bg-primary hover:bg-primary/90 gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Start New Chat
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    renderNewChatSection()
                )}
            </div>
        </div>
    );

    // Render NewChatSection
    const renderNewChatSection = () => (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <div className="flex items-center gap-3 mb-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveTab('conversations')}
                        className="md:hidden"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h3 className="font-semibold text-lg">Start New Chat</h3>
                        <p className="text-sm text-muted-foreground">
                            Find and connect with {userType === 'patient' ? 'doctors' : 'patients'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${userType === 'patient' ? 'doctors' : 'patients'} by name or wallet...`}
                            className="pl-10 pr-4 h-11"
                        />
                        {searchQuery && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={clearSearch}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </form>

                <div className="mb-4 p-4 border rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Chat with Any Wallet
                    </h4>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter wallet address (0x...)"
                            className="flex-1 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button
                            size="sm"
                            onClick={() => {
                                if (searchQuery.trim() && isWalletAddress) {
                                    createNewConversation(searchQuery.trim());
                                } else {
                                    toast({
                                        variant: 'destructive',
                                        title: 'Invalid Address',
                                        description: 'Please enter a valid wallet address starting with 0x and at least 42 characters'
                                    });
                                }
                            }}
                            disabled={!searchQuery.trim() || !isWalletAddress}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Start Chat
                        </Button>
                    </div>

                    {searchQuery.trim() && searchQuery.startsWith('0x') && getWalletSuggestions.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions:</p>
                            <div className="space-y-1">
                                {getWalletSuggestions.map(wallet => (
                                    <button
                                        key={wallet}
                                        onClick={() => {
                                            setSearchQuery(wallet);
                                            createNewConversation(wallet);
                                        }}
                                        className="w-full text-left text-xs p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-between transition-colors"
                                    >
                                        <span className="font-mono text-blue-700 dark:text-blue-300">{wallet}</span>
                                        <span className="text-blue-600 dark:text-blue-400">Click to start chat</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {showSearchResults && searchQuery.trim() && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">
                                Search Results for "{searchQuery}"
                            </h4>
                            <Button variant="ghost" size="sm" onClick={clearSearch}>
                                Clear
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Object.keys(filteredContacts).length > 0 ? (
                                Object.entries(filteredContacts).map(([contactId, contact]) => {
                                    const hasConversation = conversations.some(c =>
                                        c.participants.includes(contactId.toLowerCase())
                                    );

                                    // Use helper function to get contact display info
                                    const { contactName, profilePhoto } = getContactDisplayInfo(contactId, contact, userType);

                                    const contactWallet = contact.walletAddress || getParticipantWallet(contactId);
                                    const walletDisplay = `${contactWallet.substring(0, 6)}...${contactWallet.substring(contactWallet.length - 4)}`;

                                    return (
                                        <div key={contactId} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={profilePhoto} />
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {contactName.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{contactName}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">{walletDisplay}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => createNewConversation(contactId)}
                                                disabled={hasConversation}
                                                variant={hasConversation ? "outline" : "default"}
                                                className={hasConversation ? "opacity-50" : ""}
                                            >
                                                {hasConversation ? 'Chat Exists' : 'Start Chat'}
                                            </Button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No {userType === 'patient' ? 'doctors' : 'patients'} found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!showSearchResults && contacts && Object.keys(contacts).length > 0 && (
                    <div>
                        <h4 className="font-medium text-sm mb-3">Quick Start</h4>
                        <div className="space-y-2">
                            {Object.entries(contacts).slice(0, 5).map(([contactId, contact]) => {
                                const hasConversation = conversations.some(c =>
                                    c.participants.includes(contactId.toLowerCase())
                                );

                                if (hasConversation) return null;

                                // Use helper function to get contact display info
                                const { contactName, profilePhoto } = getContactDisplayInfo(contactId, contact, userType);

                                return (
                                    <button
                                        key={contactId}
                                        onClick={() => createNewConversation(contactId)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={profilePhoto} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {contactName.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{contactName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {userType === 'patient' ? 'Doctor' : 'Patient'}
                                            </p>
                                        </div>
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Render MessageView
    const renderMessageView = () => {
        if (!selectedConversation) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/5 to-primary/10">
                    <MessageSquare className="h-20 w-20 mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Welcome to MediChain Chat</h3>
                    <p className="text-center max-w-md">
                        Select a conversation from the left to start messaging, or create a new chat to connect with {userType === 'patient' ? 'doctors' : 'patients'}.
                    </p>
                </div>
            );
        }

        const otherParticipantId = selectedConversation.otherParticipantId ||
            getOtherParticipantId(selectedConversation.participants);
        const otherParticipantWallet = getParticipantWallet(otherParticipantId);

        // Try to find the contact in multiple ways
        let contact = null;
        let foundContactKey = null;

        // First, try exact match
        if (contacts?.[otherParticipantId]) {
            contact = contacts[otherParticipantId];
            foundContactKey = otherParticipantId;
        }
        // Then, try case-insensitive match
        else if (contacts && otherParticipantId) {
            const lowerCaseOtherId = otherParticipantId.toLowerCase();
            foundContactKey = Object.keys(contacts).find(key =>
                key.toLowerCase() === lowerCaseOtherId ||
                contacts[key]?.walletAddress?.toLowerCase() === otherParticipantWallet
            );
            if (foundContactKey) {
                contact = contacts[foundContactKey];
            }
        }

        // If no contact found, create a fallback
        if (!contact) {
            contact = { walletAddress: otherParticipantWallet };
        }

        // Use helper function to get contact display info
        const { contactName, profilePhoto } = getContactDisplayInfo(otherParticipantId, contact, userType);

        return (
            <div className="flex flex-col h-full">
                <header className="flex items-center gap-4 p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={profilePhoto} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {contactName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <h2 className="font-semibold text-lg">{contactName}</h2>
                        <p className="text-sm text-muted-foreground">
                            {userType === 'patient' ? 'Doctor' : 'Patient'} • {userType === 'patient' ? 'Verified Professional' : 'Patient'}
                        </p>
                    </div>
                </header>

                <div className="flex-1 p-4 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="space-y-6 pr-4">
                            {messages.length > 0 ? messages.map((msg, index) => {
                                // Determine if this is the current user's message
                                const isOwnMessage = isCurrentParticipant(msg.senderId) ||
                                    (msg.senderWallet?.toLowerCase() === normalizedWallet && msg.senderRole === userType);

                                return (
                                    <div key={msg.id} className={cn(
                                        "flex items-end gap-3",
                                        isOwnMessage ? "justify-end" : "justify-start"
                                    )}>
                                        {!isOwnMessage && (
                                            <div className="flex items-end gap-2">
                                                <Avatar className="h-8 w-8 flex-shrink-0 border-2 border-primary/20">
                                                    <AvatarImage src={profilePhoto} />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                                        {contactName.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md bg-muted border border-border/50">
                                                    <p className="text-sm text-foreground font-medium">{msg.text}</p>
                                                    <p className="text-xs mt-1 text-muted-foreground text-right">
                                                        {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {isOwnMessage && (
                                            <div className="flex items-end gap-2">
                                                <div className="max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md bg-primary text-primary-foreground border border-primary/50">
                                                    <p className="text-sm font-medium">{msg.text}</p>
                                                    <p className="text-xs mt-1 text-primary-foreground/70 text-right">
                                                        {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-lg font-medium">No messages yet</p>
                                    <p className="text-sm">Start the conversation!</p>
                                </div>
                            )}
                        </div>
                        <div ref={messagesEndRef} />
                    </ScrollArea>
                </div>

                <footer className="p-4 border-t bg-background flex-shrink-0">
                    <MessageInput
                        newMessage={newMessage}
                        onMessageChange={handleMessageChange}
                        onSendMessage={handleSendMessage}
                        isSending={isSending}
                        disabled={false}
                    />
                </footer>
            </div>
        );
    };

    return (
        <Card className="h-[calc(100vh-8rem)] overflow-hidden border-0 shadow-lg rounded-lg">
            <CardContent className="p-0 h-full">
                <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                    <div className={cn(
                        "border-r border-border/50 h-full md:flex flex-col bg-muted/20",
                        selectedConversation ? "hidden" : "flex"
                    )}>
                        {renderConversationList()}
                    </div>
                    <div className={cn(
                        "md:col-span-2 h-full md:flex flex-col bg-background",
                        selectedConversation ? "flex" : "hidden"
                    )}>
                        {renderMessageView()}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default Chat;
