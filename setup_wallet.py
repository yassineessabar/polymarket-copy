"""
Wallet Setup Script for Polymarket Copy Bot
- Generates a new Ethereum wallet
- Saves credentials to .env
- Requests testnet MATIC from Polygon Amoy faucet
- Checks USDC balance on Polygon mainnet

NOTE: Polymarket runs on Polygon MAINNET only (no testnet).
      For real testing you need real USDC on Polygon.
      Use DRY_RUN=True in the bot to test without spending.
"""

import os
import json
import secrets
from eth_account import Account
from dotenv import load_dotenv

ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")


def generate_wallet():
    """Generate a new Ethereum wallet."""
    private_key = "0x" + secrets.token_hex(32)
    account = Account.from_key(private_key)
    return {
        "address": account.address,
        "private_key": private_key,
    }


def save_env(wallet):
    """Save wallet credentials to .env file."""
    env_content = f"""# Polymarket Copy Bot Configuration
# Generated wallet - KEEP THIS SECRET!

PRIVATE_KEY={wallet['private_key']}
FUNDER_ADDRESS={wallet['address']}
SIGNATURE_TYPE=0

# Target wallet to copy trades from
TARGET_ADDRESS=0x0000000000000000000000000000000000000000

# Bet settings
BET_AMOUNT=2.0
DRY_RUN=True
"""
    with open(ENV_FILE, "w") as f:
        f.write(env_content)
    print(f"  Saved to {ENV_FILE}")


def check_polygon_balance(address):
    """Check MATIC and USDC balance on Polygon mainnet."""
    import requests

    # Check MATIC balance via public RPC
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [address, "latest"],
        "id": 1,
    }
    try:
        r = requests.post("https://polygon-rpc.com", json=payload, timeout=10)
        balance_wei = int(r.json()["result"], 16)
        matic = balance_wei / 1e18
        print(f"  MATIC balance: {matic:.4f} MATIC")
    except Exception as e:
        print(f"  Could not check MATIC balance: {e}")

    # Check USDC balance (Polygon USDC contract: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
    usdc_contract = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    # balanceOf(address) selector = 0x70a08231
    data = "0x70a08231" + address[2:].lower().zfill(64)
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_call",
        "params": [{"to": usdc_contract, "data": data}, "latest"],
        "id": 2,
    }
    try:
        r = requests.post("https://polygon-rpc.com", json=payload, timeout=10)
        balance = int(r.json()["result"], 16)
        usdc = balance / 1e6  # USDC has 6 decimals
        print(f"  USDC balance:  {usdc:.2f} USDC")
    except Exception as e:
        print(f"  Could not check USDC balance: {e}")


def request_amoy_faucet(address):
    """Try to get testnet MATIC from Polygon Amoy faucet."""
    import requests

    print("\n[3] Requesting testnet MATIC from Polygon Amoy faucet...")
    print(f"    Address: {address}")

    faucets = [
        {
            "name": "Polygon Faucet (official)",
            "url": f"https://faucet.polygon.technology",
            "note": "Visit manually: https://faucet.polygon.technology/ — paste your address and select Amoy",
        },
        {
            "name": "Alchemy Faucet",
            "url": f"https://www.alchemy.com/faucets/polygon-amoy",
            "note": "Visit manually: https://www.alchemy.com/faucets/polygon-amoy",
        },
    ]

    print("\n    Testnet faucets (visit manually - most require captcha):")
    for f in faucets:
        print(f"    - {f['name']}: {f['note']}")

    print("\n    For MAINNET testing with real funds:")
    print(f"    1. Send MATIC + USDC to: {address}")
    print("    2. You can bridge from Ethereum via https://portal.polygon.technology/bridge")
    print("    3. Or buy MATIC on an exchange and withdraw to Polygon network")
    print("    4. Then swap some MATIC for USDC on https://quickswap.exchange")


def main():
    print("\n" + "=" * 60)
    print("  POLYMARKET COPY BOT - WALLET SETUP")
    print("=" * 60)

    # Check if .env already exists
    if os.path.exists(ENV_FILE):
        load_dotenv(ENV_FILE)
        existing_key = os.getenv("PRIVATE_KEY")
        existing_addr = os.getenv("FUNDER_ADDRESS")
        if existing_key and existing_addr and existing_key != "your-private-key":
            print(f"\n[!] Existing wallet found in .env:")
            print(f"    Address: {existing_addr}")
            choice = input("\n    Generate NEW wallet? (y/n): ").strip().lower()
            if choice != "y":
                print("\n[2] Checking balances on Polygon mainnet...")
                check_polygon_balance(existing_addr)
                request_amoy_faucet(existing_addr)
                print("\n" + "=" * 60)
                print("  DONE - Your wallet is ready!")
                print("=" * 60 + "\n")
                return

    # Generate new wallet
    print("\n[1] Generating new wallet...")
    wallet = generate_wallet()
    print(f"    Address:     {wallet['address']}")
    print(f"    Private Key: {wallet['private_key'][:10]}...{wallet['private_key'][-6:]}")
    save_env(wallet)

    # Check balances
    print("\n[2] Checking balances on Polygon mainnet...")
    check_polygon_balance(wallet["address"])

    # Faucet info
    request_amoy_faucet(wallet["address"])

    print("\n" + "=" * 60)
    print("  SETUP COMPLETE!")
    print("=" * 60)
    print(f"""
  Your wallet: {wallet['address']}
  Credentials saved to: .env

  NEXT STEPS:
  1. Fund the wallet with MATIC + USDC on Polygon mainnet
  2. Edit .env to set TARGET_ADDRESS (wallet you want to copy)
  3. Set DRY_RUN=False when ready to trade for real
  4. Run: python3 polymarket_copy_bot.py
""")


if __name__ == "__main__":
    main()
