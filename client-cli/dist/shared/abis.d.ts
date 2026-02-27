/**
 * PumpClaw Contract ABIs
 * Auto-generated from build artifacts - do not edit manually
 * Regenerate with: forge build && extract ABIs
 */
export declare const FACTORY_ABI: readonly [{
    readonly type: "function";
    readonly name: "PRICE_RANGE_MULTIPLIER";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "LP_FEE";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint24";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "TICK_SPACING";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "int24";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "createToken";
    readonly inputs: readonly [{
        readonly name: "name";
        readonly type: "string";
    }, {
        readonly name: "symbol";
        readonly type: "string";
    }, {
        readonly name: "imageUrl";
        readonly type: "string";
    }, {
        readonly name: "websiteUrl";
        readonly type: "string";
    }, {
        readonly name: "totalSupply";
        readonly type: "uint256";
    }, {
        readonly name: "initialFdv";
        readonly type: "uint256";
    }, {
        readonly name: "creator";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "positionId";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "getTokenCount";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getTokens";
    readonly inputs: readonly [{
        readonly name: "startIndex";
        readonly type: "uint256";
    }, {
        readonly name: "endIndex";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly name: "token";
            readonly type: "address";
        }, {
            readonly name: "creator";
            readonly type: "address";
        }, {
            readonly name: "positionId";
            readonly type: "uint256";
        }, {
            readonly name: "totalSupply";
            readonly type: "uint256";
        }, {
            readonly name: "initialFdv";
            readonly type: "uint256";
        }, {
            readonly name: "createdAt";
            readonly type: "uint256";
        }, {
            readonly name: "name";
            readonly type: "string";
        }, {
            readonly name: "symbol";
            readonly type: "string";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getTokenInfo";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "tuple";
        readonly components: readonly [{
            readonly name: "token";
            readonly type: "address";
        }, {
            readonly name: "creator";
            readonly type: "address";
        }, {
            readonly name: "positionId";
            readonly type: "uint256";
        }, {
            readonly name: "totalSupply";
            readonly type: "uint256";
        }, {
            readonly name: "initialFdv";
            readonly type: "uint256";
        }, {
            readonly name: "createdAt";
            readonly type: "uint256";
        }, {
            readonly name: "name";
            readonly type: "string";
        }, {
            readonly name: "symbol";
            readonly type: "string";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getTokensByCreator";
    readonly inputs: readonly [{
        readonly name: "creator";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256[]";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "tokens";
    readonly inputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "creator";
        readonly type: "address";
    }, {
        readonly name: "positionId";
        readonly type: "uint256";
    }, {
        readonly name: "totalSupply";
        readonly type: "uint256";
    }, {
        readonly name: "initialFdv";
        readonly type: "uint256";
    }, {
        readonly name: "createdAt";
        readonly type: "uint256";
    }, {
        readonly name: "name";
        readonly type: "string";
    }, {
        readonly name: "symbol";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "tokenIndex";
    readonly inputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "lpLocker";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "poolManager";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "positionManager";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "weth";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "TokenCreated";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "creator";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "name";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "symbol";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "positionId";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "totalSupply";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "initialFdv";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "tickLower";
        readonly type: "int24";
        readonly indexed: false;
    }, {
        readonly name: "tickUpper";
        readonly type: "int24";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
export declare const LP_LOCKER_ABI: readonly [{
    readonly type: "function";
    readonly name: "CREATOR_FEE_BPS";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "BPS";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "claimFees";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "getPosition";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "positionId";
        readonly type: "uint256";
    }, {
        readonly name: "creator";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "positions";
    readonly inputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "positionId";
        readonly type: "uint256";
    }, {
        readonly name: "creator";
        readonly type: "address";
    }, {
        readonly name: "exists";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "admin";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "factory";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "positionManager";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "FeesClaimed";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount0";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "amount1";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "creatorShare0";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "creatorShare1";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "PositionLocked";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "positionId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "creator";
        readonly type: "address";
        readonly indexed: true;
    }];
    readonly anonymous: false;
}];
export declare const TOKEN_ABI: readonly [{
    readonly type: "function";
    readonly name: "name";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "symbol";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "decimals";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint8";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalSupply";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "balanceOf";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "allowance";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly name: "spender";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "approve";
    readonly inputs: readonly [{
        readonly name: "spender";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transfer";
    readonly inputs: readonly [{
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transferFrom";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
    }, {
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "creator";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "imageUrl";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "setImageUrl";
    readonly inputs: readonly [{
        readonly name: "newImageUrl";
        readonly type: "string";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "websiteUrl";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "setWebsiteUrl";
    readonly inputs: readonly [{
        readonly name: "newWebsiteUrl";
        readonly type: "string";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "event";
    readonly name: "ImageUrlUpdated";
    readonly inputs: readonly [{
        readonly name: "oldUrl";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "newUrl";
        readonly type: "string";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "WebsiteUrlUpdated";
    readonly inputs: readonly [{
        readonly name: "oldUrl";
        readonly type: "string";
        readonly indexed: false;
    }, {
        readonly name: "newUrl";
        readonly type: "string";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Transfer";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "value";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Approval";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "spender";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "value";
        readonly type: "uint256";
        readonly indexed: false;
    }];
    readonly anonymous: false;
}];
export declare const ERC20_ABI: readonly [{
    readonly type: "function";
    readonly name: "balanceOf";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "approve";
    readonly inputs: readonly [{
        readonly name: "spender";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transfer";
    readonly inputs: readonly [{
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}];
export declare const SWAP_ROUTER_ABI: readonly [{
    readonly type: "function";
    readonly name: "buyTokens";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "minTokensOut";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "tokensOut";
        readonly type: "uint256";
    }];
    readonly stateMutability: "payable";
}, {
    readonly type: "function";
    readonly name: "sellTokens";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "tokensIn";
        readonly type: "uint256";
    }, {
        readonly name: "minEthOut";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "ethOut";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
}];
export declare const FEE_VIEWER_ABI: readonly [{
    readonly type: "function";
    readonly name: "getPendingFees";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "fees";
        readonly type: "tuple";
        readonly components: readonly [{
            readonly name: "token0";
            readonly type: "address";
        }, {
            readonly name: "token1";
            readonly type: "address";
        }, {
            readonly name: "amount0";
            readonly type: "uint256";
        }, {
            readonly name: "amount1";
            readonly type: "uint256";
        }, {
            readonly name: "creatorAmount0";
            readonly type: "uint256";
        }, {
            readonly name: "creatorAmount1";
            readonly type: "uint256";
        }, {
            readonly name: "adminAmount0";
            readonly type: "uint256";
        }, {
            readonly name: "adminAmount1";
            readonly type: "uint256";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getPendingFeesBatch";
    readonly inputs: readonly [{
        readonly name: "tokens";
        readonly type: "address[]";
    }];
    readonly outputs: readonly [{
        readonly name: "fees";
        readonly type: "tuple[]";
        readonly components: readonly [{
            readonly name: "token0";
            readonly type: "address";
        }, {
            readonly name: "token1";
            readonly type: "address";
        }, {
            readonly name: "amount0";
            readonly type: "uint256";
        }, {
            readonly name: "amount1";
            readonly type: "uint256";
        }, {
            readonly name: "creatorAmount0";
            readonly type: "uint256";
        }, {
            readonly name: "creatorAmount1";
            readonly type: "uint256";
        }, {
            readonly name: "adminAmount0";
            readonly type: "uint256";
        }, {
            readonly name: "adminAmount1";
            readonly type: "uint256";
        }];
    }];
    readonly stateMutability: "view";
}];
