# Flipzy - Decentralized Coin Flip Game on Aptos

A pixelated, retro-style coin flip gambling dApp built on the Aptos blockchain. Test your luck with our provably fair coin flip game featuring multiple game modes and real APT rewards!

## 🎮 Live Demo

**Play Now:** [flipzy.netlify.app](https://flipzy.netlify.app)

## 📃 Contract Address

## 0xbb104ac69cf9db8762e57faefcfd529cd3321b3eef2fa5d10850f24b69a278dd
 
## 🤝 Contact Info

**Ayushman Koley** [ayushmankoley1@gmail.com]

**Bedanta De** [9123930028 | bedanta.de5@gmail.com]

**Mayank Soni** [9142132522 | imayank.tech@gmail.com]

## 🚀 Features

### Game Modes
- **Normal Mode**: Classic coin flip with standard bet amounts (0.5 - 9 APT)
- **Degen Mode**: Double flip action - make two simultaneous bets for higher risk/reward
- **Whale Mode**: High-stakes betting with premium amounts (20 - 100 APT)
- **Free Mode**: Practice mode with no real money involved

### Key Features
- **Provably Fair**: All outcomes are determined by blockchain randomness
- **Multiple Bet Sizes**: Choose from various APT amounts based on your risk tolerance
- **Real-time Results**: Instant feedback with animated coin flips
- **Social Sharing**: Generate PNL images and share results on X (Twitter)
- **Recent Plays**: Live feed of recent game results from all players
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Retro Aesthetic**: Pixelated graphics with nostalgic gaming vibes

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Blockchain**: Aptos Network
- **Smart Contract**: Move Language
- **Wallet Integration**: Aptos Wallet Adapter
- **Deployment**: Netlify
- **API**: Aptos GraphQL API

## 📦 Installation & Local Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Aptos CLI (for contract deployment)

### Clone the Repository
```bash
git clone https://github.com/ayushmankoley/flipzy.git
cd flipzy
```

### Install Dependencies
```bash
npm install
```

### Initialize Aptos wallet
```bash
aptos init
```

### Environment Setup
Create a `.env` file in the root directory:
```env
PROJECT_NAME=flipzy
VITE_APP_NETWORK=
VITE_APTOS_API_KEY="key-here"
VITE_MODULE_ADDRESS=replace_contract_address
VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=replace_contract_address
VITE_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY=replace_privatekey
```

### Run the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Smart Contract Deployment

### Compile the Contract
```bash
aptos move compile
```

### Deploy to Testnet
```bash
aptos move publish
```

### Deploy to Mainnet/Testnet
Update your `.env` to use mainnet/Testnet, then:
```bash
aptos move publish
```

## 🎯 How to Play

1. **Connect Your Wallet**: Use any Aptos-compatible wallet (Petra, Martian, etc.)
2. **Choose Your Mode**: Select Normal, Degen, or Whale mode
3. **Pick Your Side**: Choose Heads or Tails
4. **Set Your Bet**: Select your desired APT amount
5. **Flip the Coin**: Click "DOUBLE OR NOTHING" to start the game
6. **Win or Lose**: Watch the animated result and collect your rewards!

## 🎮 Game Modes Explained

### Normal Mode
- Single coin flip
- Bet amounts: 0.5, 1, 2, 5, 7, 9 APT
- 2x payout on wins
- Perfect for casual players

### Degen Mode
- Two simultaneous coin flips
- Mix and match different bet amounts
- Win both, one, or none
- Higher risk, higher reward potential

### Whale Mode
- Single coin flip with premium betting
- Bet amounts: 20, 30, 50, 75, 90, 100 APT
- 2x payout on wins
- For high-stakes players

## 📊 Contract Details

The smart contract handles:
- Secure random number generation
- Automatic payouts
- Event emission for transparency
- Anti-manipulation safeguards

Contract functions:
- `flip_coin()`: Standard single flip
- `flip_coin_degen()`: Double flip mode
- `flip_coin_whale()`: High-stakes mode

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run move:compile` - Compile Move contract
- `npm run move:test` - Run Move tests
- `npm run move:publish` - Deploy contract
- `npm run move:upgrade` - Upgrade existing contract

## 🌐 Deployment

### Netlify Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Configure environment variables in Netlify dashboard
4. Set up redirects for SPA routing

### Manual Deployment
```bash
npm run build
# Deploy the contents of the 'dist' folder to your hosting provider
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎨 Credits

- **Design**: Retro pixel art aesthetic
- **Team**: Team Oblique
- **Blockchain**: Built on Aptos Network
- **Inspiration**: Classic arcade gaming

## 🔗 Links

- **Live Demo**: [flipzy.netlify.app](https://flipzy.netlify.app)
- **Aptos Network**: [aptoslabs.com](https://aptoslabs.com)
- **Documentation**: [Aptos Developer Docs](https://aptos.dev)

## ⚠️ Disclaimer

This is a gambling application. Please gamble responsibly and only bet what you can afford to lose. The game outcomes are determined by blockchain randomness and the house edge is built into the smart contract.

---

**Built with ❤️ by Team Oblique on Aptos**
