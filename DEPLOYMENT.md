# PayGuard Contract Deployment

This repo is ready to deploy the PayGuard intelligent contract from Ubuntu/WSL.

## 1. Verify the frontend and contract syntax

```bash
cd /home/nald/payguard
npm run build
python3 -m py_compile contracts/payguard.py
```

## 2. Install the official GenVM linter

The deploy CLI is installed through npm, but the contract linter is a Python tool. If `npm run contract:lint` says `genvm-lint: not found`, install pip and the linter:

```bash
sudo apt-get update
sudo apt-get install -y python3-pip
python3 -m pip install --user genvm-linter
export PATH="$HOME/.local/bin:$PATH"
```

Then run:

```bash
npm run contract:lint
```

To make the PATH change permanent, add this line to `~/.bashrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## 3. Configure a deploy account

Use an existing funded Studionet private key:

```bash
npx genlayer account import --name payguard-deployer --private-key YOUR_PRIVATE_KEY
npx genlayer account use payguard-deployer
npx genlayer account show
```

Or create a new account, then fund it from the GenLayer faucet before deploying:

```bash
npx genlayer account create --name payguard-deployer
npx genlayer account use payguard-deployer
npx genlayer account show
```

## 4. Deploy to Studionet

```bash
npm run contract:deploy
```

The script runs:

```bash
genlayer deploy --contract contracts/payguard.py --rpc https://studio.genlayer.com/api
```

Copy the new contract address from the deploy output, then update `CONTRACT_ADDRESS` in `src/lib/genlayer.ts` and rebuild:

```bash
npm run build
```
