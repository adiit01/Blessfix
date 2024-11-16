const fs = require('fs').promises;
const axios = require('axios');

async function loadFetch() {
    const fetch = await import('node-fetch').then(module => module.default);
    return fetch;
}

const config = {
    apiBaseUrl: "https://gateway-run.bls.dev/api/v1",
    ipServiceUrl: "https://tight-block-2413.txlabs.workers.dev",
    authFile: "user.txt",
    retryLimit: 5,
    pingInterval: 60000, // 60 detik
    delayBetweenRetries: 5000 // 5 detik
};

// Delay utility
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Read auth token from file
async function readAuthToken() {
    const data = await fs.readFile(config.authFile, 'utf-8');
    return data.trim();
}

// Fetch IP Address
async function fetchIpAddress() {
    const fetch = await loadFetch();
    const response = await fetch(config.ipServiceUrl);
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] IP fetched: ${data.ip}`);
    return data.ip;
}

// Fetch Node Data
async function getNodeData(authToken) {
    const nodesUrl = `${config.apiBaseUrl}/nodes`;

    for (let attempt = 1; attempt <= config.retryLimit; attempt++) {
        try {
            console.log(`[${new Date().toISOString()}] Fetching node information...`);
            const fetch = await loadFetch();
            const response = await fetch(nodesUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`[${new Date().toISOString()}] Node data fetched:`, data);

            const validNodes = data.filter(node => node.pubKey.length >= 48 && node.pubKey.length <= 55);
            if (validNodes.length === 0) {
                throw new Error("No valid nodes found.");
            }

            const node = validNodes[0];
            return { nodeId: node.pubKey, hardwareId: node.hardwareId };
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Attempt ${attempt} failed:`, error);
            if (attempt === config.retryLimit) throw error;
            await delay(config.delayBetweenRetries);
        }
    }
}

// Register Node
async function registerNode(authToken, nodeId, hardwareId) {
    const registerUrl = `${config.apiBaseUrl}/nodes/${nodeId}`;
    const ipAddress = await fetchIpAddress();

    console.log(`[${new Date().toISOString()}] Registering node...`);
    const fetch = await loadFetch();
    const response = await fetch(registerUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ ipAddress, hardwareId })
    });

    if (!response.ok) {
        throw new Error(`Failed to register node. Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[${new Date().toISOString()}] Node registered successfully:`, data);
    return data;
}

// Ping Node
async function pingNode(authToken, nodeId) {
    const pingUrl = `${config.apiBaseUrl}/nodes/${nodeId}/ping`;

    console.log(`[${new Date().toISOString()}] Pinging node ${nodeId}...`);
    const fetch = await loadFetch();
    const response = await fetch(pingUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${authToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Ping failed. Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[${new Date().toISOString()}] Ping response:`, data);
    return data;
}

// Main Loop for continuous tasks
async function mainLoop(authToken, nodeId) {
    while (true) {
        try {
            await pingNode(authToken, nodeId);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Ping failed, retrying in ${config.delayBetweenRetries / 1000} seconds...`, error);
            await delay(config.delayBetweenRetries);
        }
        await delay(config.pingInterval); // Wait before next ping
    }
}

// Main process
async function runProcess() {
    try {
        console.log(`[${new Date().toISOString()}] Starting process...`);
        const authToken = await readAuthToken();
        const { nodeId, hardwareId } = await getNodeData(authToken);

        console.log(`[${new Date().toISOString()}] Node Data - ID: ${nodeId}, Hardware ID: ${hardwareId}`);
        await registerNode(authToken, nodeId, hardwareId);

        console.log(`[${new Date().toISOString()}] Starting main loop...`);
        await mainLoop(authToken, nodeId);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Process failed:`, error);
    }
}

// Run the script
runProcess();
