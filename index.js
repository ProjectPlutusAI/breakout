//This file manages the agent selection and runs the appropriate agent
const tokenLaunchAgent = require("./agent/tokenLaunchAgent")
const twitterAgent = require("./agent/twitterAgent")
const tokenTraderAgent = require("./agent/tokenTraderAgent")
const anchor = require('@project-serum/anchor')
const bs58 = require('bs58')
const errorHandler = require('./utils/errorHandler')

// Global error handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    errorHandler.restartScript();
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    errorHandler.restartScript();
});

// Add process exit handler
process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
    if (code !== 0) {
        errorHandler.restartScript();
    }
});

const agentSelect = process.env.AGENT_SELECT


if(agentSelect == "tokenLaunchAgent"){
	tokenLaunchAgent()
}else if(agentSelect == "twitterAgent"){
	twitterAgent()
}else if(agentSelect == "tokenTraderAgent"){
	tokenTraderAgent()
}
