import axios from 'axios';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import 'dotenv/config';


const createAgentBuy = async (tradeData) => {

  const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
  const url = new URL(`https://api.projectplutus.ai/api/trading/buy`);
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({ tradeData: tradeData })
  });

  const response = await Promise.race([fetchPromise]);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  console.log("data", data)

}

const createAgentSell = async (tradeData) => {

  const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
  const url = new URL(`https://api.projectplutus.ai/api/trading/sell`);
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({ tradeData: tradeData })
  });

  const response = await Promise.race([fetchPromise]);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  console.log("data", data)

}
  
const tradeSearch = async (searchParams) => {

  const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
  const url = new URL(`https://api.projectplutus.ai/api/tradeSearch`);
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({ searchParams: searchParams })
  });

  const response = await Promise.race([fetchPromise]);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  console.log("data", data)

  return data

}

const checkTradeStatus = async (tradeId) => {

  const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
  const url = new URL(`https://api.projectplutus.ai/api/tradeStatus`);
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({ tradeId: tradeId })
  });

  const response = await Promise.race([fetchPromise]);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  console.log("data", data)

  return data
}

const startAgent = async (agentId) => {

  const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
  const url = new URL(`https://api.projectplutus.ai/api/startAgent`);
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({ agentId: agentId })
  });

  const response = await Promise.race([fetchPromise]);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  console.log("data", data)

  return data

}

const endAgent = async (agentId) => {

  const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
  const url = new URL(`https://api.projectplutus.ai/api/endAgent`);
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({ agentId: agentId })
  });

  const response = await Promise.race([fetchPromise]);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  console.log("data", data)

  return data
}


const loadAgent = async (agentId) => {

  const auth = "Basic " + Buffer.from(process.env.PP_API_KEY).toString("base64");
  const url = new URL(`https://api.projectplutus.ai/api/loadAgent`);
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({ agentId: agentId })
  });


  const response = await Promise.race([fetchPromise]);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  console.log("data", data)

  return data
}

const main = async () => {

let agentId = process.env.TOKEN_TRADER_AGENT_ID;

let agentDetails = await loadAgent(agentId);

console.log("agentDetails", agentDetails)

}

main();

