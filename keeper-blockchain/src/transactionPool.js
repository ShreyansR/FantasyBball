const _ = require("lodash");
const blockchain = require("./blockchain");
let transactionPool = [];

/* get Transaction pool */
exports.getTransactionPool = () => {
    return _.cloneDeep(transactionPool);
};

/** verify trade */
exports.verifyTrade = (trade) => {
    if (getPlayer(trade.teamA).contains(tradingA) && getPlayer(trade.teamB).contains(tradingB) ){
        return true;
    } 
    return false;
}

/** add transaction to pool */
exports.addToTransactionPool = (tx) => {
    console.log('adding to txPool: %s', JSON.stringify(tx));
    transactionPool.push(tx);
    if(tx.teamB == 'waiver' || tx.teamA == 'waiver'){
        blockchain.generateRawNextBlock(tx);
    }
};

exports.updateTransactionPool = (tx) => {
    const toremoveTxs = [];
    transactionPool.forEach((transaction) => {
        if (tx.data.id == transaction.id){
            toremoveTxs.push(transaction);
        }
    });
    transactionPool = _.without(transactionPool, ...toremoveTxs);
};

exports.getTransaction = (id) => {
    transactionPool.forEach((transaction) => {
        if (id == transaction.id){
            return transaction;
        } 
    });
}
