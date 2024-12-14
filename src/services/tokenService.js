import axios from 'axios';
import * as d3 from 'd3';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function analyzeToken(tokenId) {
  try {
    const response = await axios.post(`${API_URL}/analyze`, { tokenId });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

export async function getTokenTreasuryInfo(tokenId) {
  try {
    const response = await axios.get(`https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/${tokenId}`);
    return {
      treasuryId: response.data.treasury_account_id,
      creatorId: response.data.admin_key?.key
    };
  } catch (error) {
    throw new Error('Failed to fetch treasury information');
  }
}

export async function visualizeToken(tokenId) {
  try {
    const [visualData, treasuryInfo] = await Promise.all([
      axios.get(`${API_URL}/visualize/${tokenId}`),
      getTokenTreasuryInfo(tokenId)
    ]);

    return processDataForVisualization(visualData.data, treasuryInfo);
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

// Rest of the file remains the same...