var express = require('express');
var router = express.Router();
const axios = require('axios');
var firebase = require("firebase/app");
const qs = require('querystring')

require('firebase/auth');
require("firebase/database");

var firebaseConfig = {
  apiKey: "AIzaSyDIgnb_DdJICzuuRJm1ORzeQqyyNoP0yrk",
  authDomain: "blockchain-keeper.firebaseapp.com",
  databaseURL: "https://blockchain-keeper.firebaseio.com",
  storageBucket: "blockchain-keeper.appspot.com",
};

firebase.initializeApp(firebaseConfig);
var database = firebase.database();

/* GET home page. */
router.get('/:user/', function (req, res, next) {
  res.render('index', {user: req.params.user});
});

/*GET league page*/
router.get('/:user/league', function (req, res, next) {

  //Get users from firebase asynchronously, then execute function
  firebase.database().ref('/users/').once('value').then(function(snapshot) {
    let users = [];
    var response = (snapshot.val());
    Object.keys(response).forEach(function (entry){
      if(entry!='waiver')
        users.push({'name':entry, 'win': response[entry].win, 'loss': response[entry].loss, 'tie': response[entry].tie});
    });

    //Sort users on wins, then ties
    users.sort(function(a, b) {
      return b.win - a.win  ||  b.tie - a.tie;
    });

    res.render('league', {user: req.params.user, users: users});
  });
});

/*GET team page of another user*/
router.get('/:user/league/:otherUser', function (req, res, next) {
  let players = [];

  //Get value from firebase asynchronously, then execute function
  firebase.database().ref('/').once('value').then(function (snapshot) {
    let otherPlayer = snapshot.val().users[req.params.otherUser].players.join(',');
 
    if (req.query.player == null) req.query.player = '';

    //Get player stats from MySportsFeed API asynchronously, then execute function
    axios.get('https://api.mysportsfeeds.com/v2.1/pull/nba/current/player_stats_totals.json', {
      headers: { Authorization: 'Basic ODg5YzA4MjUtZWFkNC00YWRkLWE3ZjUtMmEyZGU4Ok1ZU1BPUlRTRkVFRFM=' },
      params: {player:otherPlayer}
    })
      .then(response => {
        let data = response.data.playerStatsTotals;
        data.forEach(function (entry) {
          players.push({ 'name': entry.player.firstName + ' ' + entry.player.lastName, 'ftp': entry.stats.freeThrows.ftPct, 'fgp': entry.stats.fieldGoals.fgPct, 'three': entry.stats.fieldGoals.fg3PtMadePerGame, 'pts': entry.stats.offense.ptsPerGame, 'reb': entry.stats.rebounds.rebPerGame, 'ast': entry.stats.offense.astPerGame, 'st': entry.stats.defense.stlPerGame, 'blk': entry.stats.defense.blkPerGame, 'to': entry.stats.defense.tovPerGame })
        });

        res.render('otherTeam', {otherPlayers: snapshot.val().users[req.params.otherUser].players, players: players, user: req.params.user, otherUser: req.params.otherUser, yourPlayers: snapshot.val().users[req.params.user].players});
      })
      .catch(error => {
        console.log(error);
      });
  });
});

/*GET matchup page*/
router.get('/:user/matchup', function (req, res, next) {
  let yourPlayers = [];
  let otherPlayers = [];

  //Get value from firebase asynchronously, then execute function
  firebase.database().ref('/').once('value').then(function (snapshot) {
    let otherName = null
    snapshot.val().matchups.forEach(function(entry){
      if(entry.player1 == req.params.user){otherName = entry.player2}
      else if(entry.player2 == req.params.user){otherName =  entry.player1}
    })
    
    let yours = snapshot.val().users[req.params.user].players;
    let others = snapshot.val().users[otherName].players.join(',');
    if (req.query.player == null) req.query.player = '';
  
    //Get player stats from MySportsFeed API asynchronously, then execute function
    axios.get('https://api.mysportsfeeds.com/v2.1/pull/nba/current/player_stats_totals.json', {
      headers: { Authorization: 'Basic ODg5YzA4MjUtZWFkNC00YWRkLWE3ZjUtMmEyZGU4Ok1ZU1BPUlRTRkVFRFM=' },
      params: {player:yours.join(',')+','+others}
    })
      .then(response => {
        let data = response.data.playerStatsTotals;
        data.forEach(function (entry) {
          if(yours.includes((entry.player.firstName + '-' + entry.player.lastName).toLowerCase())){
            yourPlayers.push({ 'name': entry.player.firstName + ' ' + entry.player.lastName, 'ftp': entry.stats.freeThrows.ftPct, 'fgp': entry.stats.fieldGoals.fgPct, 'three': entry.stats.fieldGoals.fg3PtMadePerGame, 'pts': entry.stats.offense.ptsPerGame, 'reb': entry.stats.rebounds.rebPerGame, 'ast': entry.stats.offense.astPerGame, 'st': entry.stats.defense.stlPerGame, 'blk': entry.stats.defense.blkPerGame, 'to': entry.stats.defense.tovPerGame })
          }
          else{
            otherPlayers.push({ 'name': entry.player.firstName + ' ' + entry.player.lastName, 'ftp': entry.stats.freeThrows.ftPct, 'fgp': entry.stats.fieldGoals.fgPct, 'three': entry.stats.fieldGoals.fg3PtMadePerGame, 'pts': entry.stats.offense.ptsPerGame, 'reb': entry.stats.rebounds.rebPerGame, 'ast': entry.stats.offense.astPerGame, 'st': entry.stats.defense.stlPerGame, 'blk': entry.stats.defense.blkPerGame, 'to': entry.stats.defense.tovPerGame })
          }
        });
        let yourStats = statGenerator(yourPlayers, req.params.user)
        let otherStats = statGenerator(otherPlayers, otherName);

        if(yourStats.ftp > otherStats.ftp) yourStats.score++; else if(yourStats.ftp < otherStats.ftp) otherStats.score++;
        if(yourStats.fgp > otherStats.fgp) yourStats.score++; else if(yourStats.fgp < otherStats.fgp) otherStats.score++;
        if(yourStats.three > otherStats.three) yourStats.score++; else if(yourStats.three < otherStats.three) otherStats.score++;
        if(yourStats.pts > otherStats.pts) yourStats.score++; else if(yourStats.pts < otherStats.pts) otherStats.score++;
        if(yourStats.reb > otherStats.reb) yourStats.score++; else if(yourStats.reb < otherStats.reb) otherStats.score++;
        if(yourStats.ast > otherStats.ast) yourStats.score++; else if(yourStats.ast < otherStats.ast) otherStats.score++;
        if(yourStats.st > otherStats.st) yourStats.score++; else if(yourStats.st < otherStats.st) otherStats.score++;
        if(yourStats.blk > otherStats.blk) yourStats.score++; else if(yourStats.blk < otherStats.blk) otherStats.score++;
        if(yourStats.to < otherStats.to) yourStats.score++; else if(yourStats.to > otherStats.to) otherStats.score++;

        res.render('matchup', {user: req.params.user, otherUser: otherName, you: yourStats, opp: otherStats});
      })
      .catch(error => {
        console.log(error);
      });
  });
});


function statGenerator(players, name) {
  let stats = {'name': name,'ftp': 0, 'fgp': 0, 'three': 0, 'pts': 0, 'reb': 0, 'ast': 0, 'st': 0, 'blk': 0, 'to': 0, 'score':0};
  players.forEach(function(entry){
    stats.ftp += entry.ftp;
    stats.fgp += entry.fgp;
    stats.three += entry.three;
    stats.pts += entry.pts;
    stats.reb += entry.reb;
    stats.ast += entry.ast;
    stats.st += entry.st;
    stats.blk += entry.blk;
    stats.to += entry.to;
  });
  stats.three = Math.round(stats.three);
  stats.pts = Math.round(stats.pts);
  stats.reb = Math.round(stats.reb);
  stats.ast = Math.round(stats.ast);
  stats.st = Math.round(stats.st);
  stats.blk = Math.round(stats.blk);
  stats.to = Math.round(stats.to);
  stats.ftp = Math.round((stats.ftp/players.length)*10)/10;
  stats.fgp = Math.round((stats.fgp/players.length)*10)/10;
  return stats;
}

/*GET available players page*/
router.get('/:user/players', function (req, res, next) {
  let players = [];

  //Get value from firebase asynchronously, then execute function
  firebase.database().ref('/').once('value').then(function (snapshot) {
    let waivers = snapshot.val().users.waiver.players.join(',');
    console.log(snapshot.val().users);
 
    if (req.query.player == null) req.query.player = '';

    //Get player stats from MySportsFeed API asynchronously, then execute function
    axios.get('https://api.mysportsfeeds.com/v2.1/pull/nba/current/player_stats_totals.json', {
      headers: { Authorization: 'Basic ODg5YzA4MjUtZWFkNC00YWRkLWE3ZjUtMmEyZGU4Ok1ZU1BPUlRTRkVFRFM=' },
      params: {player:waivers}
    }).then(response => {
        let data = response.data.playerStatsTotals;
        data.forEach(function (entry) {
          players.push({ 'name': entry.player.firstName + ' ' + entry.player.lastName, 'ftp': entry.stats.freeThrows.ftPct, 'fgp': entry.stats.fieldGoals.fgPct, 'three': entry.stats.fieldGoals.fg3PtMadePerGame, 'pts': entry.stats.offense.ptsPerGame, 'reb': entry.stats.rebounds.rebPerGame, 'ast': entry.stats.offense.astPerGame, 'st': entry.stats.defense.stlPerGame, 'blk': entry.stats.defense.blkPerGame, 'to': entry.stats.defense.tovPerGame })
        });
        res.render('players', {otherPlayers: snapshot.val().users.waiver.players, user: req.params.user, yourPlayers: snapshot.val().users[req.params.user].players,
          players: players.filter(function (player) {
            return player.name.toLowerCase().includes(req.query.player);
          })
        });
      })
      .catch(error => {
        console.log(error);
      });
  });
});

/*GET my team page*/
router.get('/:user/team', function (req, res, next) {

  //Get value from firebase asynchronously, then execute function
  firebase.database().ref('/users/' + req.params.user + '/players').once('value').then(function (snapshot) {
    let players = [];
    let names = snapshot.val().join(',');

    //Get player stats from MySportsFeed API asynchronously, then execute function
    axios.get('https://api.mysportsfeeds.com/v2.1/pull/nba/current/player_stats_totals.json', {
      headers: { Authorization: 'Basic ODg5YzA4MjUtZWFkNC00YWRkLWE3ZjUtMmEyZGU4Ok1ZU1BPUlRTRkVFRFM=' },
      params: { player: names }
    })
      .then(response => {
        let data = response.data.playerStatsTotals;
        data.forEach(function (entry) {
          players.push({ 'name': entry.player.firstName + ' ' + entry.player.lastName, 'ftp': entry.stats.freeThrows.ftPct, 'fgp': entry.stats.fieldGoals.fgPct, 'three': entry.stats.fieldGoals.fg3PtMadePerGame, 'pts': entry.stats.offense.ptsPerGame, 'reb': entry.stats.rebounds.rebPerGame, 'ast': entry.stats.offense.astPerGame, 'st': entry.stats.defense.stlPerGame, 'blk': entry.stats.defense.blkPerGame, 'to': entry.stats.defense.tovPerGame })
        });
        res.render('team', {user: req.params.user, players:players});
      });
  });
});

/*GET pending trades page*/
router.get('/:user/trades', function (req, res, next) {
  let trades = {trades:[]};
  axios.get('http://localhost:3001/transactionPool').then((response)=>{
    trades.trades = (response.data);
    console.log(trades.trades);
    res.render('trades', {user: req.params.user, tradesRes: trades.trades});
  })
});

/*POST accept trade*/
router.post('/:user/acceptTrade/:id', (req,res,next) => {
  console.log(req.params.id)
  const requestBody = {
    id: req.params.id
  };
  const url = 'http://localhost:3001/approveTransaction';
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
  
  axios.post(url, qs.stringify(requestBody), config)
  .then(function (response) {
    console.log(response);
    res.redirect('http://localhost:3000/'+req.params.user+'/trades')
  })
  .catch(function (error) {
    console.log(error);
  });
});

/*POST reject trade*/
router.post('/:user/rejectTrade/:id', (res,req,next) => {
  console.log(req.params.id)
  const requestBody = {
    id: req.params.id
  };
  const url = 'http://localhost:3001/rejectTransaction';
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
  
  axios.post(url, qs.stringify(requestBody), config)
  .then(function (response) {
    console.log(response);
    res.redirect('http://localhost:3000/'+req.params.user+'/trades')
  })
  .catch(function (error) {
    console.log(error);
  });
});
  
  
/*POST create trade*/
router.post('/:user/requestTrade', function (req, res, next) {
  
  const requestBody = {
    teamA: req.body.team,
    teamB: req.body.team2,
    tradingA: req.body.yourPlayers,
    tradingB: req.body.oppPlayers
  };
  const url = 'http://localhost:3001/sendTransaction';
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
  
  axios.post(url, qs.stringify(requestBody), config)
  .then(function (response) {
    console.log(response);
    res.redirect('http://localhost:3000/'+req.body.team+'/trades')
  })
  .catch(function (error) {
    console.log(error);
  });
});

module.exports = router;
