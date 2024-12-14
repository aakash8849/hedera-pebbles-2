function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString().replace(/[:.]/g, '-');
}

function formatTokenAmount(amount, decimals) {
    return amount / Math.pow(10, decimals);
}

module.exports = {
    formatTimestamp,
    formatTokenAmount
};