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
    string private _websiteUrl;

    event ImageUrlUpdated(string oldUrl, string newUrl);
    event WebsiteUrlUpdated(string oldUrl, string newUrl);

    error OnlyCreator();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address creator_,
        string memory imageUrl_,
        string memory websiteUrl_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        creator = creator_;
        _imageUrl = imageUrl_;
        _websiteUrl = websiteUrl_;
        _mint(msg.sender, totalSupply_);
    }

    function imageUrl() external view returns (string memory) {
        return _imageUrl;
    }

    function websiteUrl() external view returns (string memory) {
        return _websiteUrl;
    }

    /// @notice Update the token image URL (creator only)
    /// @param newImageUrl New image URL
    function setImageUrl(string calldata newImageUrl) external {
        if (msg.sender != creator) revert OnlyCreator();
        string memory oldUrl = _imageUrl;
        _imageUrl = newImageUrl;
        emit ImageUrlUpdated(oldUrl, newImageUrl);
    }

    /// @notice Update the token website URL (creator only)
    /// @param newWebsiteUrl New website URL
    function setWebsiteUrl(string calldata newWebsiteUrl) external {
        if (msg.sender != creator) revert OnlyCreator();
        string memory oldUrl = _websiteUrl;
        _websiteUrl = newWebsiteUrl;
        emit WebsiteUrlUpdated(oldUrl, newWebsiteUrl);
    }
}
