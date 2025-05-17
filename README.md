# Solana Agent Manager

A powerful agent manager for launching multiple Solana agents with ease. This project includes various specialized agents for different Solana tasks.

## Features

- Token Trader Agent
- Twitter Agent
- Token Launcher Agent
- Wallet Balance Checker

## Quick Start in Replit

1. Create a new Replit project
2. Copy this GitHub repository URL into the "Import from GitHub" option
3. Click "Import"
4. Once imported:
   - Click the "Run" button to start the agent manager
   - Or use the terminal to run `npm start`

## Project Structure

```

agent/
├── tokenTraderAgent/
├── twitterAgent/
└── tokenLauncher/
index.js
```

## Dependencies

- @project-serum/anchor ^0.24.2
- bs58 ^5.0.0

## Usage

Each agent can be configured and launched independently. The main entry point is `script/index.js` which manages the agent lifecycle.

## Development

To run the project locally:

```bash
npm install
npm start
```

## License

MIT
