const path = require('path');
const constants = require('./config/constants');
const mirrorNode = require('./api/mirrorNode');
const { ensureDirectoryExists } = require('./utils/fileUtils');
const holderService = require('./services/holderService');
const transactionService = require('./services/transactionService');

class TokenAnalyzer {
    constructor(tokenId) {
        this.tokenId = tokenId;
        this.tokenInfo = null;
        this.startTimestamp = Date.now();
        this.lastRequestTime = Date.now();
        this.requestCount = 0;
        this.tokenDir = path.join(constants.OUTPUT_DIR, `${tokenId}_token_data`);
    }

    async initialize() {
        await ensureDirectoryExists(constants.OUTPUT_DIR);
        await ensureDirectoryExists(this.tokenDir);
        this.tokenInfo = await mirrorNode.getTokenInfo(this.tokenId);
        console.log(`\nToken Information:`);
        console.log(`Name: ${this.tokenInfo.name}`);
        console.log(`Symbol: ${this.tokenInfo.symbol}`);
        console.log(`Decimals: ${this.tokenInfo.decimals}`);
    }

    async analyze() {
        try {
            await this.initialize();
            
            // Get existing transactions to find the latest timestamp
            const existingTransactions = await transactionService.loadExistingTransactions(this.tokenDir, this.tokenId);
            const latestTimestamp = await transactionService.getLatestTransactionTimestamp(existingTransactions);
            
            // Fetch and compare holders
            const { changes } = await holderService.fetchAllHolders(this.tokenId, this.tokenInfo, this.tokenDir);
            const holdersToProcess = [...changes.new, ...changes.changed];
            
            console.log(`\nProcessing ${holdersToProcess.length} holders for transactions...`);
            
            let allTransactions = [];
            
            for (let i = 0; i < holdersToProcess.length; i += constants.HOLDER_BATCH_SIZE) {
                const batch = holdersToProcess.slice(i, i + constants.HOLDER_BATCH_SIZE);
                console.log(`\nProcessing holders ${i + 1}-${Math.min(i + constants.HOLDER_BATCH_SIZE, holdersToProcess.length)} of ${holdersToProcess.length}`);
                
                const batchTransactions = await Promise.all(batch.map(async (holder) => {
                    console.log(`Processing account ${holder.account}...`);
                    return await transactionService.fetchAccountTransactions(
                        holder.account,
                        this.tokenId,
                        this.tokenInfo,
                        latestTimestamp,
                        (count) => process.stdout.write(`\rFound ${count} transactions`)
                    );
                }));
                
                allTransactions = allTransactions.concat(batchTransactions.flat());
                
                if (allTransactions.length > 0) {
                    const newTransactionsCount = await transactionService.saveTransactions(allTransactions, this.tokenDir, this.tokenId);
                    console.log(`\nAdded ${newTransactionsCount} new transactions`);
                }

                await new Promise(resolve => setTimeout(resolve, constants.PROCESSING_DELAY));
            }

            console.log(`\nAnalysis complete!`);
            console.log(`Data saved in: ${this.tokenDir}`);
            
        } catch (error) {
            console.error('\nAnalysis failed:', error.message);
            throw error;
        }
    }
}

module.exports = TokenAnalyzer;