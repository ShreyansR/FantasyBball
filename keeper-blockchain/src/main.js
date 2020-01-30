const bodyParser = require("body-parser");
const express = require("express");
const _ = require("lodash");
const blockchain = require("./blockchain");
const p2p = require("./p2p");
const transactionPool = require("./transactionPool");
const httpPort = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort = parseInt(process.env.P2P_PORT) || 6001;

/* initial server setup function */
const initHttpServer = (myHttpPort) => {
    const app = express();
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message);
        }
    });

    /** GET Requests for the server */

    /** Get the whole blockchain */
    app.get('/blocks', (req, res) => {
        res.send(blockchain.getBlockchain());
    });

    /** Get a specific block from the chain */
    app.get('/block/:hash', (req, res) => {
        const block = _.find(blockchain.getBlockchain(), { 'hash': req.params.hash });
        res.send(block);
    });

    /** Get specific transaction */
    app.get('/transaction/:id', (req, res) => {

        // ensure the transaction exists in the transaction pool with the provided id
        const tx = _(blockchain.getBlockchain())
            .map((blocks) => blocks.data)
            .flatten()
            .find({ 'id': req.params.id });
        res.send(tx);
    });

    /** Get transaction pool */
    app.get('/transactionPool', (req, res) => {
        res.send(transactionPool.getTransactionPool());
    });

    /** get peers connected */
    app.get('/peers', (req, res) => {
        res.send(p2p.getSockets().map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });

    /** POST Requests for the server */
    /** Approve specified transaction */
    app.post('/approveTransaction', (req,res) => {
        try{
            
            // ensure the transaction exists in the transaction pool with the provided id
            const tx = _(transactionPool.getTransactionPool())
                .map((blocks) => blocks)
                .flatten()
                .find({ 'id': req.body.id });
            if (req.body.id === undefined || tx == null ){
                throw Error ('invalid transaction id');
            }
            // if the transaction exists generate new block with the data provided
            const resp = blockchain.generateRawNextBlock(tx);
            res.send(resp);
        }
        catch (e){
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    /** Reject specified transaction */
    app.post('/rejectTransaction',(res,req) => {
        try{
            // ensure the transaction exists in the transaction pool with the provided id
            const tx = _(transactionPool.getTransactionPool())
                .map((blocks) => blocks)
                .flatten()
                .find({ 'id': req.body.id });
            if (req.body.id === undefined || tx == null ){
                throw Error ('invalid transaction id');
            }
            // update transaction pool if transaction exists
            const resp = transactionPool.updateTransactionPool(tx);
            res.send(resp);
        }
        catch (e){
            console.log(e.message);
            res.status(400).send(e.message);
        }
    })

    /** POST a transaction to be added to transaction pool */
    app.post('/sendTransaction', (req, res) => {

        try {
            let teamA = req.body.teamA;
            let tradingA = req.body.tradingA;
            let teamB = req.body.teamB;
            let tradingB = req.body.tradingB;

            // ensure all the fields are provided in the request body
            if (teamA === undefined || teamB === undefined || tradingA === undefined || tradingB === undefined) {
                throw Error('invalid team or trade');
            }
            // send the transaction to the blockchain for adding to pool
            const resp = blockchain.sendTransaction(teamA,tradingA, teamB, tradingB);
            res.send(resp);
        }
        catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    /** Add a peer specified by their IP */
    app.post('/addPeer', (req, res) => {
        p2p.connectToPeers(req.body.peer);
        res.send();
    });

    /** Stop server */
    app.post('/stop', (req, res) => {
        res.send({ 'msg': 'stopping server' });
        process.exit();
    });

    /** server port assignment */
    app.listen(myHttpPort, () => {
        console.log('Listening http on port: ' + myHttpPort);
    });
};

/** initial server setup */
initHttpServer(httpPort);
p2p.initP2PServer(p2pPort);
