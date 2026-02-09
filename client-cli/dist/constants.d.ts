/**
 * PumpClaw CLI Constants
 * Contract addresses and ABIs from shared config
 */
export { CONTRACTS, CHAIN, TOKEN_DEFAULTS, PROTOCOL_CONFIG } from "./shared/contracts.js";
export { FACTORY_ABI, LP_LOCKER_ABI, TOKEN_ABI, ERC20_ABI } from "./shared/abis.js";
export declare const BASE_RPC = "https://base-rpc.publicnode.com";
export declare const BASE_CHAIN_ID = 8453;
export declare const DEFAULT_SUPPLY: bigint;
export declare const DEFAULT_FDV: bigint;
export declare const LOCKER_ABI: readonly [{
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
