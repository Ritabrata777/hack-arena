'use server';
import clientPromise from '@/lib/mongodb';

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

export const updateConsultationRating = async (consultationId, rating) => {
    const db = await getDb();
    await db.collection('consultations').updateOne(
        { id: consultationId }, // Filter by our custom uuid
        { $set: { rating } }
    );
}

export const getAllConsultations = async () => {
    const db = await getDb();
    // Sort by timestamp descending to get the latest first
    const consultations = await db.collection('consultations').find({}).sort({ timestamp: -1 }).toArray();
    // Convert ObjectId to string for each document for serialization
    return consultations.map(c => ({...c, _id: c._id.toString()}));
};

export const getRecentConsultations = async (count = 6) => {
    const db = await getDb();
    const consultations = await db.collection('consultations').find({}).sort({ timestamp: -1 }).limit(count).toArray();
    return consultations.map(c => ({...c, _id: c._id.toString()}));
}

// Doctor Profiles

export const getDoctorProfile = async (walletAddress) => {
    if (!walletAddress) return null;
    const db = await getDb();
    // Always query with lowercase address for consistency
    const profile = await db.collection('doctorProfiles').findOne({ walletAddress: walletAddress.toLowerCase() });
    if (profile) {
        profile._id = profile._id.toString();
    }
    return profile;
};

export const updateDoctorProfile = async (walletAddress, profileData) => {
    const db = await getDb();
    // Use walletAddress as the unique identifier and ensure it's lowercase
    const filter = { walletAddress: walletAddress.toLowerCase() };
    const update = { $set: { ...profileData, walletAddress: walletAddress.toLowerCase() } };
    const options = { upsert: true }; // This will create the document if it doesn't exist
    await db.collection('doctorProfiles').updateOne(filter, update, options);
};

export const getAllDoctorProfiles = async () => {
    const db = await getDb();
    const profilesArray = await db.collection('doctorProfiles').find({}).toArray();
    const profiles = {};
    profilesArray.forEach(doc => {
        const lowerCaseWallet = doc.walletAddress.toLowerCase();
        // Ensure both the key and the walletAddress property in the object are lowercase
        profiles[lowerCaseWallet] = { ...doc, _id: doc._id.toString(), walletAddress: lowerCaseWallet };
    });
    return profiles;
};

// Patient Profiles

export const getPatientProfile = async (walletAddress) => {
    if (!walletAddress) return null;
    const db = await getDb();
    const profile = await db.collection('patientProfiles').findOne({ walletAddress: walletAddress.toLowerCase() });
     if (profile) {
        profile._id = profile._id.toString();
    }
    return profile;
};

export const updatePatientProfile = async (walletAddress, profileData) => {
    const db = await getDb();
    const filter = { walletAddress: walletAddress.toLowerCase() };
    const update = { $set: { ...profileData, walletAddress: walletAddress.toLowerCase() } };
    const options = { upsert: true };
    await db.collection('patientProfiles').updateOne(filter, update, options);
};

export const getAllPatientProfiles = async () => {
    const db = await getDb();
    const profilesArray = await db.collection('patientProfiles').find({}).toArray();
    const profiles = {};
    profilesArray.forEach(doc => {
        const lowerCaseWallet = doc.walletAddress.toLowerCase();
        // Ensure both the key and the walletAddress property in the object are lowercase
        profiles[lowerCaseWallet] = { ...doc, _id: doc._id.toString(), walletAddress: lowerCaseWallet };
    });
    return profiles;
};

// Used for the backup feature
export const getDatabaseData = async () => {
    const consultations = await getAllConsultations();
    const doctorProfiles = await getAllDoctorProfiles();
    const patientProfiles = await getAllPatientProfiles();

    return {
        consultations,
        doctorProfiles,
        patientProfiles
    }
}
