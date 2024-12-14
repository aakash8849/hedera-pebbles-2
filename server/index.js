import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { TokenAnalyzer } from './TokenAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const OUTPUT_DIR = join(__dirname, '..', 'token_data');

// Ensure output directory exists
try {
  await fs.access(OUTPUT_DIR);
} catch {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { tokenId } = req.body;
    const analyzer = new TokenAnalyzer(tokenId);
    const result = await analyzer.analyze();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/visualize/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const tokenDir = join(OUTPUT_DIR, `${tokenId}_token_data`);
    const holdersPath = join(tokenDir, `${tokenId}_holders.csv`);
    const transactionsPath = join(tokenDir, `${tokenId}_transactions.csv`);

    const [holdersData, transactionsData] = await Promise.all([
      fs.readFile(holdersPath, 'utf8'),
      fs.readFile(transactionsPath, 'utf8')
    ]);

    res.json({
      holders: holdersData,
      transactions: transactionsData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});