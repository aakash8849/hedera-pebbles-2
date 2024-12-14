const fs = require('fs').promises;
const path = require('path');

function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString().replace(/[:.]/g, '-');
}

function formatTokenAmount(amount, decimals) {
    return amount / Math.pow(10, decimals);
}

async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

async function writeCSV(filePath, headers, data) {
    const content = [headers.join(',')];
    data.forEach(row => {
        content.push(row.join(','));
    });
    await fs.writeFile(filePath, content.join('\n'));
}

module.exports = {
    formatTimestamp,
    formatTokenAmount,
    ensureDirectoryExists,
    writeCSV
};