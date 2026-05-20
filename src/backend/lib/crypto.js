// IMPORTANT: This is a placeholder for demonstration purposes and is NOT secure.
// For a real application, use a robust library like CryptoJS or the Web Crypto API.

const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY || "MediChainSecretKey";

const simpleXOR = (text, key) => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

export const encryptData = (data) => {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  const encrypted = simpleXOR(data, SECRET_KEY);
  // Base64 encode to make it safe for storage
  return btoa(encrypted);
};

export const decryptData = (encryptedData) => {
  try {
    // Validate input
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data: not a string');
    }
    
    // Check if it's valid base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(encryptedData)) {
      throw new Error('Invalid encrypted data: not valid base64');
    }
    
    // Base64 decode
    const decoded = atob(encryptedData);
    const decrypted = simpleXOR(decoded, SECRET_KEY);
    try {
      // Try to parse if it's JSON
      return JSON.parse(decrypted);
    } catch (e) {
      // Return as string if not JSON
      return decrypted;
    }
  } catch (error) {
    console.error("Failed to decrypt data:", error);
    throw error; // Re-throw to be caught by the calling function
  }
};
