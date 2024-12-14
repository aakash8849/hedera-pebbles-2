const fs = require('fs').promises;
const path = require('path');

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

async function readCSV(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header.trim()] = values[index];
                return obj;
            }, {});
        });
        return data;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

async function appendToCSV(filePath, headers, newData) {
    const content = newData.map(row => row.join(',')).join('\n');
    await fs.appendFile(filePath, '\n' + content);
}

async function getLatestFile(dir, pattern) {
    try {
        const files = await fs.readdir(dir);
        const matchingFiles = files.filter(f => pattern.test(f));
        return matchingFiles.sort((a, b) => b.localeCompare(a))[0];
    } catch {
        return null;
    }
}

module.exports = {
    ensureDirectoryExists,
    writeCSV,
    readCSV,
    appendToCSV,
    getLatestFile
};