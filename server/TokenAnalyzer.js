import { join } from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://mainnet-public.mirrornode.hedera.com/api/v1';
const OUTPUT_DIR = join(__dirname, '..', 'token_data');
const SIX_MONTHS_IN_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const PROCESSING_DELAY = 200;

export class TokenAnalyzer {
  constructor(tokenId) {
    this.tokenId = tokenId;
    this.tokenInfo = null;
    this.startTimestamp = Date.now();
    this.lastRequestTime = Date.now();
    this.requestCount = 0;
    this.sixMonthsAgoTimestamp = (Date.now() - SIX_MONTHS_IN_MS) / 1000;
    this.tokenDir = join(OUTPUT_DIR, `${tokenId}_token_data`);
  }

  async initialize() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.mkdir(this.tokenDir, { recursive: true });
    this.tokenInfo = await this.getTokenInfo();
    console.log(`\nToken Information:`);
    console.log(`Name: ${this.tokenInfo.name}`);
    console.log(`Symbol: ${this.tokenInfo.symbol}`);
    console.log(`Decimals: ${this.tokenInfo.decimals}`);
    return this.tokenInfo;
  }

  async getTokenInfo() {
    try {
      const response = await axios.get(`${BASE_URL}/tokens/${this.tokenId}`);
      return {
        name: response.data.name,
        symbol: response.data.symbol,
        decimals: response.data.decimals
      };
    } catch (error) {
      throw new Error(`Failed to fetch token information: ${error.message}`);
    }
  }

  async fetchAllHolders() {
    let holders = [];
    let nextLink = '';
    let retryCount = 0;

    do {
      try {
        const url = `${BASE_URL}/tokens/${this.tokenId}/balances${nextLink}`;
        const response = await axios.get(url);
        holders = holders.concat(response.data.balances);
        nextLink = response.data.links?.next ? `?${response.data.links.next.split('?')[1]}` : '';
        retryCount = 0;

        console.log(`Fetched ${holders.length} holders`);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.error(`\nError fetching holders (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          continue;
        }
        throw new Error(`Failed to fetch all holders after ${MAX_RETRIES} attempts`);
      }
    } while (nextLink);

    const holdersPath = join(this.tokenDir, `${this.tokenId}_holders.csv`);
    const holdersData = holders.map(holder => [
      holder.account,
      holder.balance / Math.pow(10, this.tokenInfo.decimals)
    ]);
    
    await fs.writeFile(holdersPath, 'Account,Balance\n' + holdersData.map(row => row.join(',')).join('\n'));
    console.log(`\nSaved holders to ${holdersPath}`);
    
    return holders;
  }

  async fetchAccountTransactions(accountId, progressCallback) {
    let transactions = [];
    let timestamp = '';
    let retryCount = 0;
    let pageCount = 0;
    let reachedTimeLimit = false;
    
    while (!reachedTimeLimit) {
      try {
        let url = `${BASE_URL}/transactions`;
        let params = {
          'account.id': accountId,
          'limit': BATCH_SIZE,
          'timestamp': `gt:${this.sixMonthsAgoTimestamp}`
        };

        if (timestamp) {
          params['timestamp'] = `lt:${timestamp}`;
        }

        const response = await axios.get(url, { params });
        if (!response.data?.transactions?.length) break;

        pageCount++;
        const relevantTxs = [];

        for (const tx of response.data.transactions) {
          const txTimestamp = parseInt(tx.consensus_timestamp.split('.')[0]);
          
          if (txTimestamp < this.sixMonthsAgoTimestamp) {
            reachedTimeLimit = true;
            break;
          }

          if (tx.token_transfers?.some(tt => tt.token_id === this.tokenId)) {
            const transfers = tx.token_transfers.filter(tt => tt.token_id === this.tokenId);
            const receivedTransfers = transfers.filter(tt => 
              tt.account === accountId && tt.amount > 0
            );

            if (receivedTransfers.length > 0) {
              const senderTransfers = transfers.filter(tt => tt.amount < 0);
              
              for (const receivedTransfer of receivedTransfers) {
                const sender = senderTransfers.find(st => 
                  Math.abs(st.amount) >= receivedTransfer.amount
                );

                if (sender) {
                  relevantTxs.push({
                    timestamp: new Date(txTimestamp * 1000).toISOString(),
                    transaction_id: tx.transaction_id,
                    sender_account: sender.account,
                    sender_amount: Math.abs(sender.amount) / Math.pow(10, this.tokenInfo.decimals),
                    receiver_account: receivedTransfer.account,
                    receiver_amount: receivedTransfer.amount / Math.pow(10, this.tokenInfo.decimals),
                    token_symbol: this.tokenInfo.symbol,
                    memo: tx.memo_base64 ? Buffer.from(tx.memo_base64, 'base64').toString() : '',
                    fee_hbar: (tx.charged_tx_fee || 0) / 100000000
                  });
                }
              }
            }
          }
        }

        transactions = transactions.concat(relevantTxs);
        timestamp = response.data.transactions[response.data.transactions.length - 1].consensus_timestamp;
        
        if (progressCallback) {
          progressCallback(transactions.length, pageCount);
        }

        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.error(`\nError fetching transactions for ${accountId} (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          continue;
        }
        throw new Error(`Failed to fetch all transactions for ${accountId} after ${MAX_RETRIES} attempts`);
      }
    }

    return transactions;
  }

  async analyze() {
    try {
      await this.initialize();
      
      const holders = await this.fetchAllHolders();
      console.log(`\nProcessing ${holders.length} holders for transactions...`);
      
      let allTransactions = [];
      const transactionsPath = join(this.tokenDir, `${this.tokenId}_transactions.csv`);
      const headers = [
        'Timestamp',
        'Transaction ID',
        'Sender Account',
        'Total Sent Amount',
        'Receiver Account',
        'Receiver Amount',
        'Token Symbol',
        'Memo',
        'Fee (HBAR)'
      ];
      
      await fs.writeFile(transactionsPath, headers.join(',') + '\n');
      
      for (let i = 0; i < holders.length; i += BATCH_SIZE) {
        const batch = holders.slice(i, i + BATCH_SIZE);
        console.log(`\nProcessing holders ${i + 1}-${Math.min(i + BATCH_SIZE, holders.length)} of ${holders.length}`);
        
        const batchTransactions = await Promise.all(batch.map(async (holder) => {
          console.log(`Processing account ${holder.account}...`);
          return await this.fetchAccountTransactions(holder.account, 
            (count) => process.stdout.write(`\rFound ${count} transactions`));
        }));
        
        const newTransactions = batchTransactions.flat();
        allTransactions = allTransactions.concat(newTransactions);
        
        // Append new transactions to file
        if (newTransactions.length > 0) {
          const transactionRows = newTransactions.map(tx => [
            tx.timestamp,
            tx.transaction_id,
            tx.sender_account,
            tx.sender_amount,
            tx.receiver_account,
            tx.receiver_amount,
            tx.token_symbol,
            tx.memo,
            tx.fee_hbar
          ].join(','));
          
          await fs.appendFile(transactionsPath, transactionRows.join('\n') + '\n');
        }

        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
      }

      console.log(`\nAnalysis complete!`);
      console.log(`Data saved in: ${this.tokenDir}`);
      
      return {
        tokenInfo: this.tokenInfo,
        holders: holders.length,
        transactions: allTransactions.length,
        outputDir: this.tokenDir
      };
    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }
}