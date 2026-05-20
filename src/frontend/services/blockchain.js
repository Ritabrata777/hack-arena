'use client';

import { createCampaignOnChain as createCampaignOnChainBC, donateToCampaignOnChain as donateToCampaignOnChainBC } from '@/backend/lib/blockchain';
import { updateFundraiserRequestStatus } from '@/backend/services/mongodb';

// Client-side function that handles blockchain transaction
export const createCampaignOnChain = async (campaignData) => {
    // This function should only be called from the client side
    if (typeof window === 'undefined') {
        throw new Error("createCampaignOnChain must be called from the client side. Please call it from a browser environment.");
    }
    
    const tx = await createCampaignOnChainBC(campaignData);
    await updateFundraiserRequestStatus(campaignData.requestId, 'approved', tx.campaignId);
    return tx;
};

export const donateToCampaignOnChain = async (campaignId, amount) => {
    // This function should only be called from the client side
    if (typeof window === 'undefined') {
        throw new Error("donateToCampaignOnChain must be called from the client side. Please call it from a browser environment.");
    }
    
    const tx = await donateToCampaignOnChainBC(campaignId, amount);
    return tx;
};
