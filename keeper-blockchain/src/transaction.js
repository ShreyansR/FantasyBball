const CryptoJS = require("crypto-js");
const ecdsa = require("elliptic");
const _ = require("lodash");
const ec = new ecdsa.ec('secp256k1');
const db = require("./db");

/** Transaction class  */
exports.Transaction = class Transaction {
    constructor(teamA, tradingA, teamB, tradingB){
        this.teamA = teamA;
        this.teamB = teamB;
        this.tradingA = tradingA;
        this.tradingB = tradingB;
    }
};

/** create new transaction */
exports.createTransaction = (teamA, tradingA, teamB, tradingB) => {
    return new this.Transaction(teamA, tradingA, teamB, tradingB);
}

/** genereate Transaction id using the Transaction details */
const getTransactionId = (transaction) => {
    const txTradeAContent = transaction.tradingA;
    const txTradeBContent = transaction.tradingB;
    return CryptoJS.SHA256(txTradeAContent + txTradeBContent).toString();
};
exports.getTransactionId  = getTransactionId;

/** verify Trade to ensure specified team owns the respective asset */
exports.verifyTrade = (tx) => {
    return new Promise((resolve, reject)=>{
        db.getUser(tx.teamA).then((team)=>{
            db.getUser(tx.teamB).then((team2)=>{
                if (team == undefined || team2 == undefined){
                    reject (new Error ('Team id not valid'));
                }
                if (!team.includes(tx.tradingA)){
                    console.log('invalid trade player A ');
                    reject (false);
                }
                if (!team2.includes(tx.tradingB)){
                    console.log('invalid trade player B');
                    reject (false);
                }
                console.log("valid block")
                resolve (true);
            })
        });
    });
}

/** update the assets for respective teams */
exports.updateAssets = (tx) => {
    return new Promise((resolve, reject)=>{
        db.getUser(tx.teamA).then((team)=>{
            db.getUser(tx.teamB).then((team2)=>{
                if (team == undefined || team2 == undefined){
                    reject (new Error ('Team id not valid'));
                }
                team[team.indexOf(tx.tradingA)] = tx.tradingB;
                team2[team.indexOf(tx.tradingB)] = tx.tradingA;

                db.updateUser(tx.teamA , team);
                db.updateUser(tx.teamB , team2);

                console.log("valid block")
                resolve (true);
            })
        });
    });
}