const CryptoJS = require("crypto-js");
const _ = require("lodash");
const p2p = require("./p2p");
const transaction = require("./transaction");
const transactionPool = require("./transactionPool");
const util = require("./util");

/** Block class */
class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
};
exports.Block = Block;

/** get the blockchain */
const getBlockchain = () => blockchain;
exports.getBlockchain = getBlockchain;

/** get latest block in the chain */
const getLatestBlock = () => blockchain[blockchain.length - 1];

exports.getLatestBlock = getLatestBlock;

// Difficulty adjustment internal in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

/** get block difficulty */
const getDifficulty = (aBlockchain) => {
    const latestBlock = aBlockchain[blockchain.length - 1];
    if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
        return getAdjustedDifficulty(latestBlock, aBlockchain);
    }
    else {
        return latestBlock.difficulty;
    }
};

/** get adjusted block diffulty for provided block and chain */
const getAdjustedDifficulty = (latestBlock, aBlockchain) => {
    const prevAdjustmentBlock = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
        return prevAdjustmentBlock.difficulty + 1;
    }
    else if (timeTaken > timeExpected * 2) {
        return prevAdjustmentBlock.difficulty - 1;
    }
    else {
        return prevAdjustmentBlock.difficulty;
    }
};

/** get current timestamp */
const getCurrentTimestamp = () => Math.round(new Date().getTime() / 1000);

/** generate block using the data provided */
exports.generateRawNextBlock = (blockData) => {
    const previousBlock = getLatestBlock();
    const difficulty = getDifficulty(getBlockchain());
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = getCurrentTimestamp();
    const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
    if (addBlockToChain(newBlock)) {
        transaction.updateAssets(blockData).then((res) => {
            p2p.broadcastLatest();
            return newBlock;
        });
    }
    else {
        return null;
    }
};

/** generate block with transaction provided */
exports.generateNextBlockWithTransaction = (tx) => {
    return this.generateRawNextBlock(tx);
}

/** create a block with specified values */
const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
        const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
    }
};

/** send transaction */
exports.sendTransaction = (teamA, tradingA, teamB, tradingB) => {
    const tx = transaction.createTransaction(teamA, tradingA, teamB, tradingB);
    tx.id = transaction.getTransactionId(tx);
    transaction.verifyTrade(tx).then((result) => {
        console.log("valid transaction")
        transactionPool.addToTransactionPool(tx);
        p2p.broadCastTransactionPool();
        return tx;
    }).catch((err) => {
        return new Error('invalid trade');

    })
};

/** calculate hash for a given block */
const calculateHashForBlock = (block) => calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

/** find sha-256 for a given details */
const calculateHash = (index, previousHash, timestamp, data, difficulty, nonce) => CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();

/** check block structure */
const isValidBlockStructure = (block) => {

    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.data === 'object';
};

/** check validity of new blocks */
const isValidNewBlock = (newBlock, previousBlock) => {
    if (!isValidBlockStructure(newBlock)) {
        console.log('invalid block structure: %s', JSON.stringify(newBlock));
        return false;
    }
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    }
    else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    }
    else if (!hasValidHash(newBlock)) {
        return false;
    }
    return true;
};

exports.isValidBlockStructure = isValidBlockStructure;

const getAccumulatedDifficulty = (aBlockchain) => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
};

const isValidTimestamp = (newBlock, previousBlock) => {
    return (previousBlock.timestamp - 60 < newBlock.timestamp)
        && newBlock.timestamp - 60 < getCurrentTimestamp();
};
const hasValidHash = (block) => {
    if (!hashMatchesBlockContent(block)) {
        console.log('invalid hash, got:' + block.hash);
        return false;
    }
    if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
        console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
    }
    return true;
};
const hashMatchesBlockContent = (block) => {
    const blockHash = calculateHashForBlock(block);
    return blockHash === block.hash;
};
const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = util.hexToBinary(hash);
    const requiredPrefix = '0'.repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
};
/*
Checks if the given blockchain is valid
 */
const isValidChain = (blockchainToValidate) => {
    console.log('isValidChain:');
    console.log(JSON.stringify(blockchainToValidate));
    const isValidGenesis = (block) => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    };
    if (!isValidGenesis(blockchainToValidate[0])) {
        return null;
    }

    /*
    Validate each block in the chain. 
    The block is valid if the block structure is valid and the transaction are valid
    */
    let aUnspentTxOuts = [];
    for (let i = 0; i < blockchainToValidate.length; i++) {
        const currentBlock = blockchainToValidate[i];
        if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return null;
        }
    }
    return aUnspentTxOuts;
};

/** add block to chain */
addBlockToChain = (newBlock) => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        blockchain.push(newBlock);
        transactionPool.updateTransactionPool(newBlock);
        return true;
    }
    return false;
};
exports.addBlockToChain = addBlockToChain;
exports.replaceChain = (newBlocks) => {
    const validCheck = isValidChain(newBlocks);
    const validChain = validCheck !== null;

    if (validChain &&
        getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        p2p.broadcastLatest();
    }
    else {
        console.log('Received blockchain invalid');
    }
};

/** genesis transaction details */
const genesisTransaction = {
    'teamA': 'waiver',
    'teamB': 'waiver',
    'id': 'bb54068aea85faa7e487530083366be9962390af822e4c71ef1aca7033c83e66',
    'tradingA': 'null',
    'tradingB': 'null'
};

const genesisBlock = new Block(0, 'c009d8d136ec5132f5cf3c096c1cdf5798414914868607b266830a9c8b0c5e7a', '', getCurrentTimestamp, [genesisTransaction], 0, 0);

let blockchain = [genesisBlock];

const handleReceivedTransaction = (transaction) => {
    transactionPool.addToTransactionPool(transaction);
}

exports.handleReceivedTransaction = handleReceivedTransaction;
