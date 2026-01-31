// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC5805} from "@openzeppelin/contracts/interfaces/IERC5805.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title PumpClawToken
/// @notice ERC20 token with governance (votes), permit, and burnable extensions
/// @dev Base-only deployment - no superchain/cross-chain support needed
contract PumpClawToken is ERC20, ERC20Permit, ERC20Votes, ERC20Burnable {
    error NotAdmin();
    error NotOriginalAdmin();
    error AlreadyVerified();

    address private immutable _originalAdmin;
    address private _admin;
    string private _metadata;
    string private _context;
    string private _image;
    bool private _verified;

    event Verified(address indexed admin, address indexed token);
    event UpdateImage(string image);
    event UpdateMetadata(string metadata);
    event UpdateAdmin(address indexed oldAdmin, address indexed newAdmin);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address admin_,
        string memory image_,
        string memory metadata_,
        string memory context_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        _originalAdmin = admin_;
        _admin = admin_;
        _image = image_;
        _metadata = metadata_;
        _context = context_;
        _mint(msg.sender, maxSupply_);
    }

    function updateAdmin(address admin_) external {
        if (msg.sender != _admin) revert NotAdmin();
        address oldAdmin = _admin;
        _admin = admin_;
        emit UpdateAdmin(oldAdmin, admin_);
    }

    function updateImage(string memory image_) external {
        if (msg.sender != _admin) revert NotAdmin();
        _image = image_;
        emit UpdateImage(image_);
    }

    function updateMetadata(string memory metadata_) external {
        if (msg.sender != _admin) revert NotAdmin();
        _metadata = metadata_;
        emit UpdateMetadata(metadata_);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function verify() external {
        if (msg.sender != _originalAdmin) revert NotOriginalAdmin();
        if (_verified) revert AlreadyVerified();
        _verified = true;
        emit Verified(msg.sender, address(this));
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    // View functions
    function isVerified() external view returns (bool) { return _verified; }
    function admin() external view returns (address) { return _admin; }
    function originalAdmin() external view returns (address) { return _originalAdmin; }
    function imageUrl() external view returns (string memory) { return _image; }
    function metadata() external view returns (string memory) { return _metadata; }
    function context() external view returns (string memory) { return _context; }

    function allData() external view returns (
        address originalAdmin_,
        address admin_,
        string memory image_,
        string memory metadata_,
        string memory context_
    ) {
        return (_originalAdmin, _admin, _image, _metadata, _context);
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == type(IERC20).interfaceId 
            || interfaceId == type(IERC165).interfaceId
            || interfaceId == type(IERC5805).interfaceId;
    }
}
