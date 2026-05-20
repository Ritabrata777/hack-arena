const { ethers } = require("ethers");

const signatures = [
    "addConsultationLog(bytes32,bytes32)",
    "verifyDoctor(address)",
    "banDoctor(address)",
    "unbanDoctor(address)",
    "grantConsent(address,bytes32,uint256)",
    "revokeConsent(address,bytes32)",
    "isDoctorVerified(address)"
];

console.log("--- Selectors ---");
signatures.forEach(sig => {
    const selector = ethers.id(sig).slice(0, 10);
    console.log(`${selector} : ${sig}`);
});
