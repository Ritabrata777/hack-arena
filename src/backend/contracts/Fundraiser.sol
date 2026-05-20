// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Fundraiser is Ownable {
    struct Campaign {
        uint256 id;
        address payable beneficiary;
        address creator;
        uint256 goalAmount;
        uint256 totalDonations;
        string title;
        string description;
        bool isActive;
        bool exists;
    }

    struct Donation {
        address donor;
        uint256 amount;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Donation[]) public campaignDonations;
    mapping(uint256 => uint256) public activeCampaignIdToIndex;
    uint256[] public activeCampaignIds;
    
    address public mediChainAddress;

    event CampaignCreated(uint256 indexed id, address indexed beneficiary, address indexed creator, uint256 goalAmount, string title);
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CampaignClosed(uint256 indexed campaignId);

    constructor(address _initialOwner, address _mediChainAddress) Ownable(_initialOwner) {
        mediChainAddress = _mediChainAddress;
    }

    function createCampaign(address payable _beneficiary, uint256 _goalAmount, string memory _title, string memory _description) public {
        require(_goalAmount > 0, "Goal amount must be greater than 0");
        
        campaignCount++;
        uint256 newCampaignId = campaignCount;

        Campaign storage newCampaign = campaigns[newCampaignId];
        newCampaign.id = newCampaignId;
        newCampaign.beneficiary = _beneficiary;
        newCampaign.creator = msg.sender;
        newCampaign.goalAmount = _goalAmount;
        newCampaign.totalDonations = 0;
        newCampaign.title = _title;
        newCampaign.description = _description;
        newCampaign.isActive = true;
        newCampaign.exists = true;

        activeCampaignIds.push(newCampaignId);
        activeCampaignIdToIndex[newCampaignId] = activeCampaignIds.length - 1;

        emit CampaignCreated(newCampaignId, _beneficiary, msg.sender, _goalAmount, _title);
    }

    function donate(uint256 _campaignId) public payable {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        require(campaigns[_campaignId].isActive, "Campaign is not active");
        require(msg.value > 0, "Donation amount must be greater than 0");

        Campaign storage campaign = campaigns[_campaignId];
        campaign.totalDonations += msg.value;
        
        campaignDonations[_campaignId].push(Donation({
            donor: msg.sender,
            amount: msg.value
        }));

        // Transfer funds directly to beneficiary
        (bool sent, ) = campaign.beneficiary.call{value: msg.value}("");
        require(sent, "Failed to send Ether");

        emit DonationReceived(_campaignId, msg.sender, msg.value);

        if (campaign.totalDonations >= campaign.goalAmount) {
            closeCampaign(_campaignId);
        }
    }

    function closeCampaign(uint256 _campaignId) public {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        require(msg.sender == campaigns[_campaignId].creator || msg.sender == owner(), "Only creator or admin can close campaign");
        
        if (campaigns[_campaignId].isActive) {
            campaigns[_campaignId].isActive = false;
            
            // Remove from active campaigns array using swap and pop
            uint256 index = activeCampaignIdToIndex[_campaignId];
            uint256 lastCampaignId = activeCampaignIds[activeCampaignIds.length - 1];
            
            activeCampaignIds[index] = lastCampaignId;
            activeCampaignIdToIndex[lastCampaignId] = index;
            
            activeCampaignIds.pop();
            delete activeCampaignIdToIndex[_campaignId];
            
            emit CampaignClosed(_campaignId);
        }
    }

    function getActiveCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory activeCampaignsList = new Campaign[](activeCampaignIds.length);
        
        for (uint256 i = 0; i < activeCampaignIds.length; i++) {
            activeCampaignsList[i] = campaigns[activeCampaignIds[i]];
        }
        
        return activeCampaignsList;
    }

    function getCampaignDetails(uint256 _campaignId) public view returns (Campaign memory) {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        return campaigns[_campaignId];
    }

    function getDonors(uint256 _campaignId) public view returns (Donation[] memory) {
        return campaignDonations[_campaignId];
    }

    function updateMediChainAddress(address _newAddress) public onlyOwner {
        mediChainAddress = _newAddress;
    }
}
