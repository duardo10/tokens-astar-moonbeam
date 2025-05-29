// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract InteroperabilityBridge is Ownable, ReentrancyGuard {
    
    IERC20 public immutable token;
    
    mapping(bytes32 => bool) public processedTransactions;
    
    event TokensBurned(
        address indexed user,
        uint256 amount,
        string destinationChain,
        address destinationAddress,
        bytes32 indexed transactionId
    );
    
    event TokensMinted(
        address indexed user,
        uint256 amount,
        bytes32 indexed transactionId
    );

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function burnTokens(
        uint256 amount,
        string memory destinationChain,
        address destinationAddress
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(destinationAddress != address(0), "Invalid destination address");
        
        // Transfere tokens do usuário para o contrato (simula burn)
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
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
        
        emit TokensBurned(
            msg.sender,
            amount,
            destinationChain,
            destinationAddress,
            transactionId
        );
    }

    function mintTokens(
        address user,
        uint256 amount,
        bytes32 transactionId
    ) external onlyOwner nonReentrant {
        require(!processedTransactions[transactionId], "Transaction already processed");
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        processedTransactions[transactionId] = true;
        
        // Transfere tokens para o usuário (simula mint)
        require(token.transfer(user, amount), "Token transfer failed");
        
        emit TokensMinted(user, amount, transactionId);
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(token.transfer(owner(), amount), "Token transfer failed");
    }

    // Função para depositar tokens no contrato (para simular pool de tokens)
    function depositTokens(uint256 amount) external onlyOwner {
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
    }
} 