// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title PumpClawToken
/// @notice Simple ERC20 token for PumpClaw launches
/// @dev Mints total supply to deployer (factory), includes permit for gasless approvals
contract PumpClawToken is ERC20, ERC20Permit, ERC20Burnable {
    address public immutable creator;
    string private _imageUrl;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address creator_,
        string memory imageUrl_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        creator = creator_;
        _imageUrl = imageUrl_;
        _mint(msg.sender, totalSupply_);
    }

    function imageUrl() external view returns (string memory) {
        return _imageUrl;
    }
}
