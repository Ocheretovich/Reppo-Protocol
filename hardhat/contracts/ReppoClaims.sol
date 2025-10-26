// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ReppoClaims is Ownable, ReentrancyGuard, Pausable {

    event ClaimsUpdated(address indexed to, uint256 amount);
    event Claimed(address indexed to, uint256 genesisTokenId);

    mapping(address => uint256) public claims;

    address public reppoToken;

    constructor(
        address owner,
        address _reppoToken
    ) Ownable(owner) {
        reppoToken = _reppoToken;
    }

    function setClaims(address[] calldata to, uint256[] calldata amount) external onlyOwner {
        require(to.length == amount.length, "Length mismatch");
        for (uint256 i = 0; i < to.length; i++) {
            claims[to[i]] = amount[i];
            emit ClaimsUpdated(to[i], amount[i]);
        }
    }

    function claim() external nonReentrant whenNotPaused {
        uint256 claimableAmount = claims[msg.sender];
        require(claimableAmount > 0, "No claimable tokens");
        claims[msg.sender] = 0;
        IERC20(reppoToken).transfer(msg.sender, claimableAmount);
        emit Claimed(msg.sender, claimableAmount);
    }

    function claimBalanceOf(address addr) external view returns (uint256) {
        return claims[addr];
    }

    function transferOwnership(address newOwner) public override(Ownable) onlyOwner {
        super.transferOwnership(newOwner);
    }

    function withdraw(address to) external onlyOwner nonReentrant {
        uint256 balance = IERC20(reppoToken).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(reppoToken).transfer(to, balance);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}