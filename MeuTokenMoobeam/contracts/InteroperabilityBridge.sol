// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract InteroperabilityBridge is Ownable, ReentrancyGuard {
    
    IERC20 public immutable token;
    
    mapping(address => uint256) public lockedTokens;
    mapping(bytes32 => bool) public processedTransactions;
    
    event TokensLocked(
        address indexed user,
        uint256 amount,
        string destinationChain,
        address destinationAddress,
        bytes32 indexed transactionId
    );
    
    event TokensUnlocked(
        address indexed user,
        uint256 amount,
        bytes32 indexed transactionId
    );

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function lockTokens(
        uint256 amount,
        string memory destinationChain,
        address destinationAddress
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(destinationAddress != address(0), "Invalid destination address");
        
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        lockedTokens[msg.sender] += amount;
        
        bytes32 transactionId = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                destinationChain,
                destinationAddress,
                block.timestamp,
                block.number
            )
        );
        
        emit TokensLocked(
            msg.sender,
            amount,
            destinationChain,
            destinationAddress,
            transactionId
        );
    }

    function unlockTokens(
        address user,
        uint256 amount,
        bytes32 transactionId
    ) external onlyOwner nonReentrant {
        require(!processedTransactions[transactionId], "Transaction already processed");
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        processedTransactions[transactionId] = true;
        
        if (lockedTokens[user] >= amount) {
            lockedTokens[user] -= amount;
        }
        
        require(token.transfer(user, amount), "Token transfer failed");
        
        emit TokensUnlocked(user, amount, transactionId);
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(token.transfer(owner(), amount), "Token transfer failed");
    }
} 