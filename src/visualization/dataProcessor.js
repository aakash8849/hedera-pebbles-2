function processDataForVisualization(holders, transactions) {
    // Process holders into nodes
    const nodes = holders.map(holder => ({
        id: holder.Account,
        value: parseFloat(holder.Balance),
        radius: Math.sqrt(parseFloat(holder.Balance)) * 2 // Scale radius based on balance
    }));

    // Process transactions into links
    const links = transactions.map(tx => ({
        source: tx['Sender Account'],
        target: tx['Receiver Account'],
        value: parseFloat(tx['Receiver Amount']),
        timestamp: tx.Timestamp
    }));

    return {
        nodes,
        links
    };
}

module.exports = { processDataForVisualization };