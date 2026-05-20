// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IMediChain {
    function isDoctorVerified(address doctorAddress) external view returns (bool);
}

contract MediChain is Ownable {

    mapping(bytes32 => bool) private consultationHashes;
    mapping(address => bool) public verifiedDoctors;
    mapping(address => bool) public bannedDoctors;

    // Patient -> Doctor -> Scope -> Expiration Timestamp
    mapping(address => mapping(address => mapping(bytes32 => uint256))) public consents;

    event ConsultationLogged(bytes32 indexed summaryHash, address indexed doctor, bytes32 indexed patientHash, uint256 timestamp);
    event DoctorVerified(address indexed doctorAddress);
    event DoctorBanned(address indexed doctorAddress);
    event DoctorUnbanned(address indexed doctorAddress);
    event ConsentGranted(address indexed patient, address indexed doctor, bytes32 scope, uint256 expiry);
    event ConsentRevoked(address indexed patient, address indexed doctor, bytes32 scope);

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyVerifiedDoctor() {
        require(verifiedDoctors[msg.sender], "Only a verified doctor can perform this action");
        require(!bannedDoctors[msg.sender], "Doctor is banned");
        _;
    }

    function addConsultationLog(bytes32 _summaryHash, bytes32 _patientHash) public onlyVerifiedDoctor {
        require(!consultationHashes[_summaryHash], "This consultation summary has already been logged.");
        consultationHashes[_summaryHash] = true;
        emit ConsultationLogged(_summaryHash, msg.sender, _patientHash, block.timestamp);
    }
    
    function verifyDoctor(address doctorAddress) public onlyOwner {
        require(!verifiedDoctors[doctorAddress], "Doctor is already verified.");
        verifiedDoctors[doctorAddress] = true;
        emit DoctorVerified(doctorAddress);
    }

    function banDoctor(address doctorAddress) public onlyOwner {
        require(!bannedDoctors[doctorAddress], "Doctor is already banned.");
        bannedDoctors[doctorAddress] = true;
        emit DoctorBanned(doctorAddress);
    }

    function unbanDoctor(address doctorAddress) public onlyOwner {
        require(bannedDoctors[doctorAddress], "Doctor is not banned.");
        bannedDoctors[doctorAddress] = false;
        emit DoctorUnbanned(doctorAddress);
    }

    function isDoctorVerified(address doctorAddress) public view returns (bool) {
        return verifiedDoctors[doctorAddress] && !bannedDoctors[doctorAddress];
    }

    // === Consent Management ===

    function grantConsent(address doctor, bytes32 scope, uint256 expiry) public {
        consents[msg.sender][doctor][scope] = expiry;
        emit ConsentGranted(msg.sender, doctor, scope, expiry);
    }

    function revokeConsent(address doctor, bytes32 scope) public {
        consents[msg.sender][doctor][scope] = 0;
        emit ConsentRevoked(msg.sender, doctor, scope);
    }

    function checkConsent(address patient, address doctor, bytes32 scope) public view returns (bool) {
        return consents[patient][doctor][scope] > block.timestamp;
    }
}
