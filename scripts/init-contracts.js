const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Initializing MediChain contracts...');

try {
    // Initialize MediChain contract
    console.log('📋 Initializing MediChain contract...');
    const initOutput = execSync('aptos move run --profile medichain --function-id 0x7e897ca5fea6f59359962159a60bf0876bd7cb7798e945b97bbbc7b4b19a21d7::medichain::initialize', {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
    });
    
    console.log('✅ MediChain contract initialized successfully!');
    console.log('Output:', initOutput);

    // Initialize Fundraiser contract
    console.log('💰 Initializing Fundraiser contract...');
    const fundraiserOutput = execSync('aptos move run --profile medichain --function-id 0x7e897ca5fea6f59359962159a60bf0876bd7cb7798e945b97bbbc7b4b19a21d7::fundraiser::initialize --args address:0x7e897ca5fea6f59359962159a60bf0876bd7cb7798e945b97bbbc7b4b19a21d7', {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
    });
    
    console.log('✅ Fundraiser contract initialized successfully!');
    console.log('Output:', fundraiserOutput);

    console.log('🎉 All contracts initialized successfully!');
    console.log('You can now use the blockchain functions without errors.');

} catch (error) {
    console.error('❌ Initialization failed:', error.message);
    console.log('This might be because the contracts are already initialized.');
    console.log('Trying to continue...');
}
