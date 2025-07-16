# Flipzy - Decentralized Coin Flip Game on Aptos

A pixelated, retro-style coin flip gambling dApp built on the Aptos blockchain. Test your luck with our provably fair coin flip game featuring multiple game modes and real APT rewards!

> 🛠️ **Built at Build On Aptos Hackathon – Kolkata Edition**
> A 24-hour IRL hackathon in the Cultural Capital of India 🇮🇳

---

## 🎮 Live Demo

**Play Now:** [flipzy.netlify.app](https://flipzy.netlify.app)

---

## 📃 Contract Address

```
0xbb104ac69cf9db8762e57faefcfd529cd3321b3eef2fa5d10850f24b69a278dd
```

---

## 🤝 Contact Info

* **Ayushman Koley** – [ayushmankoley1@gmail.com](mailto:ayushmankoley1@gmail.com)
* **Bedanta De** – 9123930028 | [bedanta.de5@gmail.com](mailto:bedanta.de5@gmail.com)
* **Mayank Soni** – 9142132522 | [imayank.tech@gmail.com](mailto:imayank.tech@gmail.com)

---

## 🚀 Features

### Game Modes

* **Normal Mode** – Classic coin flip with standard bets (0.5 – 9 APT)
* **Degen Mode** – Double flip for higher risk and reward
* **Whale Mode** – High-stakes betting (20 – 100 APT)
* **Free Mode** – Practice with zero risk

### Key Highlights

* ✨ **Provably Fair**: True randomness via blockchain
* 💵 **Multiple Bet Sizes**: Risk your way
* ⏱️ **Real-time Results**: Instant feedback with animation
* 📸 **Social Sharing**: PNL image generation + Twitter sharing
* 📶 **Recent Plays Feed**: See all recent activity
* 📱 **Mobile Ready**: Fully responsive
* 🎮 **Retro Vibes**: Pixelated old-school graphics

---

## 🧰 Tech Stack

* **Frontend** – React, TypeScript, Vite
* **Styling** – Tailwind CSS, shadcn/ui
* **Blockchain** – Aptos Network
* **Smart Contract** – Move Language
* **Wallet** – Aptos Wallet Adapter
* **Deployment** – Netlify
* **API** – Aptos GraphQL API

---

## 📦 Installation & Development

### Prerequisites

* Node.js (v16+)
* npm or yarn
* Aptos CLI

### Clone the Repository

```bash
git clone https://github.com/ayushmankoley/flipzy.git
cd flipzy
```

### Install Dependencies

```bash
npm install
```

### Initialize Aptos Wallet

```bash
aptos init
```

### Create `.env` File

```env
PROJECT_NAME=flipzy
VITE_APP_NETWORK=
VITE_APTOS_API_KEY="key-here"
VITE_MODULE_ADDRESS=replace_contract_address
VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=replace_contract_address
VITE_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY=replace_privatekey
```

### Start Development Server

```bash
npm run dev
```

Go to: `http://localhost:5173`

---

## 📽️ Smart Contract Deployment

### Compile the Contract

```bash
aptos move compile
```

### Deploy

```bash
aptos move publish
```

> Update `.env` for testnet/mainnet before deploying.

---

## 🎯 How to Play

1. Connect your Aptos-compatible wallet
2. Pick a mode – Normal, Degen, Whale
3. Choose Heads or Tails
4. Select your APT bet amount
5. Hit **DOUBLE OR NOTHING**
6. Watch the animation & see if you win!

---

## 🎮 Game Modes in Detail

### Normal Mode

* Bet: 0.5–9 APT
* Single flip
* 2x payout

### Degen Mode

* Two simultaneous flips
* Mix bets
* Win both, one, or none

### Whale Mode

* High stakes: 20–100 APT
* One flip, double payout

---

## 📊 Contract Details

* Blockchain-based randomness
* Event emission
* Secure payouts
* Anti-manipulation logic

### Functions

* `flip_coin()` – Normal
* `flip_coin_degen()` – Degen
* `flip_coin_whale()` – Whale

---

## 🔧 Available Scripts

* `npm run dev` – Start dev server
* `npm run build` – Production build
* `npm run preview` – Preview build
* `npm run move:compile` – Compile Move
* `npm run move:test` – Test contracts
* `npm run move:publish` – Deploy
* `npm run move:upgrade` – Upgrade contract

---

## 🌐 Deployment

### Netlify

```bash
npm run build
```

Upload the `dist` folder and configure environment variables on Netlify.

### Manual

```bash
npm run build
```

Deploy `dist` to any static hosting provider.

---

## 👥 Credits

* **Design** – Retro pixel aesthetic
* **Team** – Team Oblique
* **Blockchain** – Aptos Network
* **Hackathon** – Build On Aptos, Kolkata

---

## 🔗 Links

* **Live Game** – [flipzy.netlify.app](https://flipzy.netlify.app)
* **Aptos Network** – [aptoslabs.com](https://aptoslabs.com)
* **Docs** – [Aptos Developer Docs](https://aptos.dev)

---

## ⚠️ Disclaimer

This is a gambling application. Please play responsibly and never bet more than you can afford to lose. Outcomes are random and smart contract-enforced.

---

**Built with ❤️ by Team Oblique on Aptos**
