/**
 * PumpClaw Contract Addresses (Base Mainnet)
 * Single source of truth for all clients
 */
export declare const CONTRACTS: {
    readonly FACTORY: "0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90";
    readonly LP_LOCKER: "0x6e4D241957074475741Ff42ec352b8b00217Bf5d";
    readonly SWAP_ROUTER: "0x3A9c65f4510de85F1843145d637ae895a2Fe04BE";
    readonly FEE_VIEWER: "0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39";
    readonly POOL_MANAGER: "0x498581fF718922c3f8e6A244956aF099B2652b2b";
    readonly POSITION_MANAGER: "0x7C5f5A4bBd8fD63184577525326123B519429bDc";
};
export declare const CHAIN: {
    readonly ID: 8453;
    readonly NAME: "Base";
    readonly RPC: "https://base-rpc.publicnode.com";
};
export declare const TOKEN_DEFAULTS: {
    readonly SUPPLY: bigint;
    readonly FDV: bigint;
};
export declare const PROTOCOL_CONFIG: {
    readonly PRICE_RANGE_MULTIPLIER: 100n;
    readonly LP_FEE_BPS: 10000;
    readonly CREATOR_FEE_BPS: 8000;
};
export declare const CONTRACTS_JSON: string;
