// Quick MongoDB connection test
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not set in .env.local');
  process.exit(1);
}

console.log('🔍 Testing MongoDB connection...');
console.log('Connection string (masked):', uri.replace(/:[^:/@]*@/, ':***@'));

(async () => {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    console.log('⏳ Attempting connection...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    const admin = client.db().admin();
    const status = await admin.ping();
    console.log('✅ Ping successful:', status);
    
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error('Error:', err.message);
    console.error('Name:', err.name);
    if (err.reason) console.error('Reason:', err.reason);
    process.exit(1);
  }
})();
