const { spawn } = require('child_process');
const path = require('path');

// Global error handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    restartScript();
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    restartScript();
});

function restartScript() {
    console.log('Attempting to restart script...');
    const scriptPath = process.argv[1];
    
    // Spawn a new instance of the script
    const newProcess = spawn('node', [scriptPath], {
        detached: true,
        stdio: 'inherit'
    });

    // Kill the current process
    process.exit(1);
}

module.exports = {
    restartScript
};
