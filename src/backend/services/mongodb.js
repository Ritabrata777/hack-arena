

'use server';
import clientPromise from '@/backend/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
// Note: Blockchain functions are now handled by client-side services
import { decryptData } from '@/backend/lib/crypto';

// Utility function to serialize MongoDB objects to plain objects
const serializeMongoObject = (obj) => {
    if (!obj) return obj;
    // A more robust way to serialize without losing data
    const newObj = JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value && value._bsontype === 'ObjectID') {
            return value.toString();
        }
        return value;
    }));
    if (obj._id && typeof obj._id.toString === 'function') {
        newObj._id = obj._id.toString();
    }
    return newObj;
};

const getDb = async () => {
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME;
    if (!dbName || dbName.includes('<') || dbName.includes('>')) {
        throw new Error("Please define the MONGODB_DB_NAME environment variable inside .env and ensure it does not contain placeholder values like '<database-name>'.");
    }
    return client.db(dbName);
}

// Consultations

export const addConsultation = async (consultationData) => {
    const db = await getDb();
    // MongoDB by default adds an `_id` field. We don't need to manually handle it.
    await db.collection('consultations').insertOne(consultationData);
};

export const updateConsultationRatingAndReview = async (consultationId, rating, reviewText) => {
    const db = await getDb();
    const updateDoc = { $set: {} };
    if (rating !== undefined) updateDoc.$set.rating = rating;
    if (reviewText !== undefined) updateDoc.$set.reviewText = reviewText;

    await db.collection('consultations').updateOne(
        { id: consultationId }, // Filter by our custom uuid
        updateDoc
    );
}

export const getAllConsultations = async () => {
    const db = await getDb();
    // Sort by timestamp descending to get the latest first
    const consultations = await db.collection('consultations').find({}).sort({ timestamp: -1 }).toArray();
    
    // Properly serialize MongoDB objects to plain objects
    return consultations.map(c => serializeMongoObject(c));
};

export const getRecentConsultations = async (count = 6) => {
    const db = await getDb();
    const consultations = await db.collection('consultations').find({}).sort({ timestamp: -1 }).limit(count).toArray();
    
    // Properly serialize MongoDB objects to plain objects
    return consultations.map(c => serializeMongoObject(c));
};

// Doctor Profiles

export const getDoctorProfile = async (walletAddress) => {
    if (!walletAddress) return null;
    const db = await getDb();
    // Always query with lowercase address for consistency
    const profile = await db.collection('doctorProfiles').findOne({ walletAddress: walletAddress.toLowerCase() });
    return serializeMongoObject(profile);
};

export const updateDoctorProfile = async (walletAddress, profileData) => {
    const db = await getDb();
    
    // Remove _id from profileData if it exists to avoid MongoDB errors
    const { _id, ...cleanProfileData } = profileData;
    
    // Use walletAddress as the unique identifier and ensure it's lowercase
    const filter = { walletAddress: walletAddress.toLowerCase() };
    const update = { 
        $set: { 
            ...cleanProfileData, 
            walletAddress: walletAddress.toLowerCase(),
            updatedAt: new Date()
        } 
    };
    const options = { upsert: true }; // This will create the document if it doesn't exist
    
    try {
        await db.collection('doctorProfiles').updateOne(filter, update, options);
        console.log(`Doctor profile updated successfully for wallet: ${walletAddress}`);
    } catch (error) {
        console.error(`Error updating doctor profile for wallet ${walletAddress}:`, error);
        throw new Error(`Failed to update doctor profile: ${error.message}`);
    }
};

export const getAllDoctorProfiles = async () => {
    const db = await getDb();
    const profilesArray = await db.collection('doctorProfiles').find({}).toArray();
    const profiles = {};
    
    profilesArray.forEach(doc => {
        const lowerCaseWallet = doc.walletAddress.toLowerCase();
        // Ensure both the key and the walletAddress property in the object are lowercase
        const serializedProfile = serializeMongoObject(doc);
        profiles[lowerCaseWallet] = { 
            ...serializedProfile, 
            walletAddress: lowerCaseWallet 
        };
    });
    
    return profiles;
};

export const getDoctorProfilesByIds = async (walletAddresses) => {
    if (!walletAddresses || walletAddresses.length === 0) return {};
    
    const db = await getDb();
    
    // Only fetch essential fields to reduce data transfer
    const projection = {
        name: 1,
        specialization: 1,
        licenseId: 1,
        walletAddress: 1,
        verified: 1,
        profilePhoto: 1 // Include profilePhoto for display in consultations
    };
    
    const profilesArray = await db.collection('doctorProfiles')
        .find({ walletAddress: { $in: walletAddresses } })
        .project(projection)
        .toArray();
    
    const profiles = {};
    profilesArray.forEach(doc => {
        const lowerCaseWallet = doc.walletAddress.toLowerCase();
        const serializedProfile = serializeMongoObject(doc);
        profiles[lowerCaseWallet] = { 
            ...serializedProfile, 
            walletAddress: lowerCaseWallet 
        };
    });
    
    return profiles;
};

// Patient Profiles

export const getPatientProfile = async (walletAddress) => {
    if (!walletAddress) return null;
    const db = await getDb();
    const profile = await db.collection('patientProfiles').findOne({ walletAddress: walletAddress.toLowerCase() });
    return serializeMongoObject(profile);
};

export const updatePatientProfile = async (walletAddress, profileData) => {
    const db = await getDb();
    
    // Remove _id from profileData if it exists to avoid MongoDB errors
    const { _id, ...cleanProfileData } = profileData;
    
    const filter = { walletAddress: walletAddress.toLowerCase() };

    // Separate dependent logic from main profile update
    const { dependents, ...mainProfileData } = cleanProfileData;

    const update = { 
        $set: { 
            ...mainProfileData, 
            walletAddress: walletAddress.toLowerCase(),
            updatedAt: new Date()
        } 
    };
    
    // Handle dependents array
    if (dependents !== undefined) {
        update.$set.dependents = dependents;
    }

    const options = { upsert: true };
    
    try {
        await db.collection('patientProfiles').updateOne(filter, update, options);
        console.log(`Patient profile updated successfully for wallet: ${walletAddress}`);
    } catch (error) {
        console.error(`Error updating patient profile for wallet ${walletAddress}:`, error);
        throw new Error(`Failed to update patient profile: ${error.message}`);
    }
};

export const getAllPatientProfiles = async () => {
    const db = await getDb();
    const profilesArray = await db.collection('patientProfiles').find({}).toArray();
    const profiles = {};
    
    profilesArray.forEach(doc => {
        const lowerCaseWallet = doc.walletAddress.toLowerCase();
        // Ensure both the key and the walletAddress property in the object are lowercase
        const serializedProfile = serializeMongoObject(doc);
        profiles[lowerCaseWallet] = { 
            ...serializedProfile, 
            walletAddress: lowerCaseWallet 
        };
    });
    
    return profiles;
};

// ===== Access Requests (Doctor <-> Patient) =====
export const createAccessRequest = async ({ doctorId, patientId, documentIds = [], durationHours = 24 }) => {
    const db = await getDb();
    const request = {
        id: uuidv4(),
        doctorId: (doctorId || '').toLowerCase(),
        patientId: (patientId || '').toLowerCase(),
        documentIds,
        durationHours: Number(durationHours) || 24,
        status: 'pending', // pending, approved, denied
        requestDate: new Date().toISOString(),
    };
    await db.collection('accessRequests').insertOne(request);
    return serializeMongoObject(request);
};

export const getAccessRequestsByDoctor = async (doctorId) => {
    const db = await getDb();
    const rows = await db.collection('accessRequests').find({ doctorId: (doctorId || '').toLowerCase() }).sort({ requestDate: -1 }).toArray();
    return rows.map(serializeMongoObject);
};

export const getAccessRequestsByPatient = async (patientId) => {
    const db = await getDb();
    const rows = await db.collection('accessRequests').find({ patientId: (patientId || '').toLowerCase() }).sort({ requestDate: -1 }).toArray();
    // Convert all ObjectIds to strings for Client Components
    return rows.map(serializeMongoObject);
};

export const updateAccessRequestStatus = async (requestId, status) => {
    const db = await getDb();
    await db.collection('accessRequests').updateOne({ id: requestId }, { $set: { status } });
};

// ===== Audit Logs =====
export const addAuditLog = async ({ actor, action, subject, details = {} }) => {
    const db = await getDb();
    const log = {
        id: uuidv4(),
        actor: (actor || '').toLowerCase(),
        action,
        subject: (subject || '').toLowerCase(),
        details,
        timestamp: new Date().toISOString(),
    };
    await db.collection('auditLogs').insertOne(log);
    return serializeMongoObject(log);
};

export const getAuditLogsForPatient = async (patientId) => {
    const db = await getDb();
    const rows = await db.collection('auditLogs').find({ subject: (patientId || '').toLowerCase() }).sort({ timestamp: -1 }).toArray();
    return rows.map(serializeMongoObject);
};


// Prescription Renewals
export const createRenewalRequest = async ({ patientId, consultationId, doctorWallet }) => {
    const db = await getDb();
    const renewalRequest = {
        id: uuidv4(),
        patientId: patientId.toLowerCase(),
        doctorWallet: doctorWallet.toLowerCase(),
        consultationId,
        status: 'pending', // pending, approved, denied
        requestDate: new Date().toISOString(),
    };
    await db.collection('renewalRequests').insertOne(renewalRequest);
    return serializeMongoObject(renewalRequest);
}

export const getRenewalRequests = async (doctorWallet) => {
    const db = await getDb();
    const requests = await db.collection('renewalRequests').find({ doctorWallet: doctorWallet.toLowerCase() }).sort({ requestDate: -1 }).toArray();
    return requests.map(serializeMongoObject);
}

export const updateRenewalRequestStatus = async (requestId, status) => {
    const db = await getDb();
    await db.collection('renewalRequests').updateOne({ id: requestId }, { $set: { status } });
}

// Doctor Time Slots
export const createTimeSlot = async ({ doctorId, date, startTime, endTime, maxPatients = 1 }) => {
    const db = await getDb();
    const timeSlot = {
        id: uuidv4(),
        doctorId: doctorId.toLowerCase(),
        date,
        startTime,
        endTime,
        maxPatients,
        currentPatients: 0,
        status: 'available', // available, full, cancelled
        createdAt: new Date().toISOString(),
    };
    const result = await db.collection('timeSlots').insertOne(timeSlot);
    return serializeMongoObject(timeSlot);
};

export const getTimeSlotsForDoctor = async (doctorId) => {
    const db = await getDb();
    const slots = await db.collection('timeSlots')
        .find({ doctorId: doctorId.toLowerCase() })
        .sort({ date: 1, startTime: 1 })
        .toArray();
    return slots.map(serializeMongoObject);
};

export const getAvailableTimeSlots = async (doctorId, date = null) => {
    const db = await getDb();
    const filter = { 
        doctorId: doctorId.toLowerCase(),
        status: 'available'
    };
    
    if (date) {
        filter.date = date;
    }
    
    const slots = await db.collection('timeSlots')
        .find(filter)
        .sort({ date: 1, startTime: 1 })
        .toArray();
    
    const availableSlots = slots
        .filter(slot => slot.currentPatients < slot.maxPatients)
        .map(serializeMongoObject);
    
    return availableSlots;
};

export const updateTimeSlotPatients = async (timeSlotId, increment = true) => {
    const db = await getDb();
    const update = increment 
        ? { $inc: { currentPatients: 1 } }
        : { $inc: { currentPatients: -1 } };
    
    await db.collection('timeSlots').updateOne(
        { id: timeSlotId },
        update
    );
};

// Appointments
export const createAppointment = async ({ patientId, doctorId, timeSlotId, notes }) => {
    const db = await getDb();
    const timeSlot = await db.collection('timeSlots').findOne({id: timeSlotId});
    if (!timeSlot) throw new Error("Time slot not found");

    const appointment = {
        id: uuidv4(),
        patientId: patientId.toLowerCase(),
        doctorId: doctorId.toLowerCase(),
        timeSlotId,
        appointmentTime: `${timeSlot.date}T${timeSlot.startTime}`,
        notes,
        status: 'pending', // pending, confirmed, denied, completed
        requestDate: new Date().toISOString(),
    };
    await db.collection('appointments').insertOne(appointment);
    await updateTimeSlotPatients(timeSlotId, true);
    
    return serializeMongoObject(appointment);
};

export const getAppointmentsForDoctor = async (doctorId) => {
    const db = await getDb();
    const appointments = await db.collection('appointments').find({ doctorId: doctorId.toLowerCase() }).sort({ requestDate: -1 }).toArray();
    return appointments.map(serializeMongoObject);
};

export const getAppointmentsForPatient = async (patientId) => {
    const db = await getDb();
    const appointments = await db.collection('appointments').find({ patientId: patientId.toLowerCase() }).sort({ requestDate: -1 }).toArray();
    return appointments.map(serializeMongoObject);
};

export const updateAppointmentStatus = async (appointmentId, status) => {
    const db = await getDb();
    await db.collection('appointments').updateOne({ id: appointmentId }, { $set: { status } });
};


// Chat / Messaging
export const getConversations = async (walletAddress) => {
    try {
        const db = await getDb();
        const lowerCaseWallet = walletAddress.toLowerCase();
        
        const conversations = await db.collection('conversations')
            .find({ participants: lowerCaseWallet })
            .sort({ lastMessageTimestamp: -1 })
            .toArray();
            
        return conversations.map(c => serializeMongoObject(c));
    } catch (error) {
        console.error('Error in getConversations:', error);
        throw new Error(`Failed to get conversations: ${error.message}`);
    }
}

export const getMessages = async (conversationId) => {
    try {
        const db = await getDb();
        
        const messages = await db.collection('messages')
            .find({ conversationId })
            .sort({ timestamp: 1 })
            .toArray();
            
        return messages.map(m => serializeMongoObject(m));
    } catch (error) {
        console.error('Error in getMessages:', error);
        throw new Error(`Failed to get messages: ${error.message}`);
    }
}

export const sendMessage = async ({ conversationId, senderId, receiverId, text }) => {
    try {
        const db = await getDb();
        const lowerSender = senderId.toLowerCase();
        const lowerReceiver = receiverId.toLowerCase();
        
        let convId = conversationId;
        
        if (!convId) {
            const existingConversation = await db.collection('conversations').findOne({
                participants: { $all: [lowerSender, lowerReceiver] }
            });
            
            if (existingConversation) {
                convId = existingConversation.id;
            } else {
                convId = uuidv4();
                const newConversation = {
                    id: convId,
                    participants: [lowerSender, lowerReceiver],
                    lastMessageTimestamp: new Date().toISOString(),
                    lastMessageText: text,
                    createdAt: new Date().toISOString(),
                };
                await db.collection('conversations').insertOne(newConversation);
            }
        }

        const message = {
            id: uuidv4(),
            conversationId: convId,
            senderId: lowerSender,
            receiverId: lowerReceiver,
            text,
            timestamp: new Date().toISOString(),
            read: false,
        };

        const result = await db.collection('messages').insertOne(message);

        await db.collection('conversations').updateOne(
            { id: convId },
            { 
                $set: { 
                    lastMessageTimestamp: message.timestamp, 
                    lastMessageText: text,
                    updatedAt: new Date().toISOString()
                } 
            }
        );

        return serializeMongoObject(message);
    } catch (error) {
        console.error('Error in sendMessage:', error);
        throw new Error(`Failed to send message: ${error.message}`);
    }
}

// Fundraising Campaigns

export const getFundraiserRequests = async (filter = {}) => {
    const db = await getDb();
    const requests = await db.collection('fundraisingRequests').find(filter).sort({ requestDate: -1 }).toArray();
    return requests.map(serializeMongoObject);
}

export const getFundraiserRequestForPatient = async (patientId) => {
    return getFundraiserRequests({ patientId: patientId.toLowerCase() });
}

export const getFundraiserRequestForDoctor = async (doctorId) => {
    return getFundraiserRequests({ doctorId: doctorId.toLowerCase() });
}

export const createFundraiserRequest = async (requestData) => {
    const db = await getDb();
    const request = {
        id: uuidv4(),
        ...requestData,
        patientId: requestData.patientId.toLowerCase(),
        doctorId: requestData.doctorId.toLowerCase(),
        status: 'pending', // pending, pending_admin_approval, approved, denied
        requestDate: new Date().toISOString()
    };
    await db.collection('fundraisingRequests').insertOne(request);
    return serializeMongoObject(request);
}

export const updateFundraiserRequestStatus = async (requestId, status, campaignId = null) => {
    const db = await getDb();
    const update = { $set: { status } };
    if (campaignId) {
        update.$set.campaignId = campaignId;
    }
    await db.collection('fundraisingRequests').updateOne({ id: requestId }, update);
}

// Server-side function that only updates the database
export const approveFundraiserRequest = async (requestId, campaignId) => {
    await updateFundraiserRequestStatus(requestId, 'approved', campaignId);
    return { success: true, campaignId };
};

// Note: Client-side blockchain functions have been moved to src/frontend/services/blockchain.js


// Used for the backup feature
export const getDatabaseData = async () => {
    const db = await getDb();
    const collectionsToBackup = [
        'consultations', 
        'doctorProfiles', 
        'patientProfiles', 
        'renewalRequests', 
        'conversations', 
        'messages', 
        'appointments', 
        'fundraisingRequests',
        'directDonations',
        'healthVaultCodes',
        'accessRequests',
        'auditLogs',
    ];
    
    const backupData = {};
    for(const collectionName of collectionsToBackup) {
        const data = await db.collection(collectionName).find({}).toArray();
        backupData[collectionName] = data.map(serializeMongoObject);
    }

    return backupData;
}

// ===== Direct Donation Tracking (off-chain) =====

export const addDirectDonation = async ({ campaignId, donor, amount, txHash }) => {
    const db = await getDb();
    const record = {
        id: uuidv4(),
        campaignId: typeof campaignId === 'string' ? campaignId : String(campaignId),
        donor: donor && donor.trim() !== '' ? donor.toLowerCase() : null,
        amount: Number(amount) || 0,
        txHash,
        timestamp: new Date().toISOString(),
    };
    await db.collection('directDonations').insertOne(record);
    return serializeMongoObject(record);
};

export const getDirectDonationsTotal = async (campaignId) => {
    const db = await getDb();
    const id = typeof campaignId === 'string' ? campaignId : String(campaignId);
    const cursor = await db.collection('directDonations').find({ campaignId: id });
    const all = await cursor.toArray();
    const total = all.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    return total; // in APT
};

export const getDirectDonationsForCampaign = async (campaignId) => {
    const db = await getDb();
    const id = typeof campaignId === 'string' ? campaignId : String(campaignId);
    console.log(`getDirectDonationsForCampaign: Fetching donations for campaign ID: ${id}`);
    const docs = await db.collection('directDonations').find({ campaignId: id }).sort({ timestamp: -1 }).toArray();
    console.log(`getDirectDonationsForCampaign: Found ${docs.length} donations for campaign ${id}:`, docs);
    return docs.map(serializeMongoObject);
};

export const getAllDirectDonations = async () => {
    const db = await getDb();
    const docs = await db.collection('directDonations').find({}).sort({ timestamp: -1 }).toArray();
    return docs.map(serializeMongoObject);
};

// Emergency Health Vault

const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const generateEmergencyCode = async (patientId) => {
    const db = await getDb();
    const collection = db.collection('healthVaultCodes');
    
    await collection.updateMany(
        { patientId: patientId.toLowerCase() },
        { $set: { status: 'revoked' } }
    );

    const code = generateRandomCode();
    const createdAt = new Date();

    const newCode = {
        code,
        patientId: patientId.toLowerCase(),
        createdAt,
        status: 'active'
    };

    await collection.insertOne(newCode);
    return serializeMongoObject(newCode);
};

export const getActiveEmergencyCode = async (patientId) => {
    const db = await getDb();
    const collection = db.collection('healthVaultCodes');
    
    const code = await collection.findOne({
        patientId: patientId.toLowerCase(),
        status: 'active',
    });
    
    return code ? serializeMongoObject(code) : null;
};

export const revokeEmergencyCode = async (code) => {
    const db = await getDb();
    await db.collection('healthVaultCodes').updateOne(
        { code },
        { $set: { status: 'revoked' } }
    );
};

export const getEmergencyVaultData = async (accessCode) => {
    const db = await getDb();
    const collection = db.collection('healthVaultCodes');

    const codeData = await collection.findOne({
        code: accessCode.toUpperCase(),
        status: 'active',
    });

    if (!codeData) {
        return null;
    }

    const patientProfile = await getPatientProfile(codeData.patientId);

    if (!patientProfile) {
        return null;
    }
    
    return { patientProfile: serializeMongoObject(patientProfile) };
};

    
