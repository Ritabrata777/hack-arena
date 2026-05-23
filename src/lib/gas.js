import { ethers } from 'ethers';

const DEFAULT_MIN_PRIORITY_FEE_GWEI = '25';
const DEFAULT_MAX_FEE_MULTIPLIER = 2n;

const maxBigInt = (...values) => {
    return values
        .filter((value) => typeof value === 'bigint')
        .reduce((max, value) => (value > max ? value : max), 0n);
};

const getMinPriorityFee = () => {
    const configuredValue = process.env.NEXT_PUBLIC_AMOY_MIN_PRIORITY_FEE_GWEI || DEFAULT_MIN_PRIORITY_FEE_GWEI;

    try {
        return ethers.parseUnits(configuredValue, 'gwei');
    } catch {
        return ethers.parseUnits(DEFAULT_MIN_PRIORITY_FEE_GWEI, 'gwei');
    }
};

export const getTransactionFeeOverrides = async (provider) => {
    const minPriorityFee = getMinPriorityFee();
    let feeData = {};

    try {
        feeData = await provider.getFeeData();
    } catch (error) {
        console.warn('Could not fetch fee data, using configured gas fee floor:', error);
    }

    const maxPriorityFeePerGas = maxBigInt(feeData.maxPriorityFeePerGas, minPriorityFee);
    const suggestedMaxFee = feeData.maxFeePerGas ?? feeData.gasPrice;
    const maxFeePerGas = maxBigInt(
        suggestedMaxFee,
        maxPriorityFeePerGas * DEFAULT_MAX_FEE_MULTIPLIER
    );

    return {
        maxFeePerGas,
        maxPriorityFeePerGas,
    };
};
