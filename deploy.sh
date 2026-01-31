#!/bin/bash
set -e

RPC="https://base-rpc.publicnode.com"
ADMIN="0x261368f0EC280766B84Bfa7a9B23FD53c774878D"
POOL_MANAGER="0x498581fF718922c3f8e6A244956aF099B2652b2b"
POSITION_MANAGER="0x7C5f5A4bBd8fD63184577525326123B519429bDc"
WETH="0x4200000000000000000000000000000000000006"

# Get private key with 0x prefix
PK="0x${BASE_PRIVATE_KEY}"

echo "=== Deploying PumpClaw to Base Mainnet ==="
echo "Admin: $ADMIN"
echo ""

# 1. Deploy LPLocker
echo "1. Deploying LPLocker..."
LOCKER=$(forge create src/core/PumpClawLPLocker.sol:PumpClawLPLocker \
  --rpc-url "$RPC" \
  --private-key "$PK" \
  --constructor-args "$POSITION_MANAGER" "$ADMIN" \
  --broadcast \
  --json | jq -r '.deployedTo')

echo "   LPLocker deployed at: $LOCKER"

# 2. Deploy Factory  
echo "2. Deploying Factory..."
FACTORY=$(forge create src/core/PumpClawFactory.sol:PumpClawFactory \
  --rpc-url "$RPC" \
  --private-key "$PK" \
  --constructor-args "$POOL_MANAGER" "$POSITION_MANAGER" "$LOCKER" "$WETH" \
  --broadcast \
  --json | jq -r '.deployedTo')

echo "   Factory deployed at: $FACTORY"

# 3. Link locker to factory
echo "3. Linking Locker to Factory..."
cast send "$LOCKER" "setFactory(address)" "$FACTORY" \
  --rpc-url "$RPC" \
  --private-key "$PK"

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "LPLocker: $LOCKER"
echo "Factory: $FACTORY"
echo ""
echo "Verify contracts:"
echo "forge verify-contract $LOCKER src/core/PumpClawLPLocker.sol:PumpClawLPLocker --chain base --constructor-args \$(cast abi-encode 'constructor(address,address)' $POSITION_MANAGER $ADMIN)"
echo "forge verify-contract $FACTORY src/core/PumpClawFactory.sol:PumpClawFactory --chain base --constructor-args \$(cast abi-encode 'constructor(address,address,address,address)' $POOL_MANAGER $POSITION_MANAGER $LOCKER $WETH)"
