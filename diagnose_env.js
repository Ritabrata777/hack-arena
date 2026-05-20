const path = require('path');
const fs = require('fs');

console.log("--- START ENV DIAGNOSIS ---");

// Check what files exist
const files = ['.env', '.env.local', '.env.development', '.env.production', 'config.env'];
files.forEach(f => {
    console.log(`File ${f} exists: ${fs.existsSync(f)}`);
});

// Load dotenv and see what it finds
const dotenv = require('dotenv');
const result = dotenv.config(); // defaults to .env
console.log(".env load result:", result.error ? "No .env found" : "Loaded .env");
if (result.parsed) console.log(".env parsed keys:", Object.keys(result.parsed));

// Check process.env explicitly
console.log("process.env.MONGODB_URI value:", process.env.MONGODB_URI);

if (process.env.MONGODB_URI) {
    console.log("URI Length:", process.env.MONGODB_URI.length);
    console.log("Starts with '123'?", process.env.MONGODB_URI.startsWith('123'));
    console.log("Contains '123'?", process.env.MONGODB_URI.includes('123'));
}

console.log("--- END DIAGNOSIS ---");
