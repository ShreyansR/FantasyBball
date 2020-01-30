
var admin = require("firebase-admin");

var serviceAccount = require("../secrets/firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://blockchain-keeper.firebaseio.com"
});
var db = admin.database();
let users = {users: []};

db.ref('/users/').once('value').then(function(snapshot) {
    var response = (snapshot.val());
    Object.keys(response).forEach(function (entry){
      if(entry!='waiver')
        users.users.push({'name':entry, 'win': response[entry].win, 'loss': response[entry].loss, 'tie': response[entry].tie});
    });
});


function snapshotToArray(snapshot) {
    var returnArr = [];

    snapshot.forEach(function(childSnapshot) {
        var item = childSnapshot.val();
        item.key = childSnapshot.key;
        returnArr.push(item);
    });

    return returnArr;
};
exports.snapshotToArray = snapshotToArray;
exports.users = users;
exports.getUsers = () => {
    return users;
}

/** get user from specified name */
exports.getUser = (user) => {
    return new Promise((resolve,reject) => {
        db.ref("/users/"+user+"/players").on("value", (snapshot)=>{
            resolve (snapshot.val());
        });
    });
}

/** update specified user players usign specified data */
exports.updateUser = (user, data) =>{
    db.ref("/users/"+user+"/players").set(data);
}

/** update users  */
exports.updateUsers = (users) => {
    db.ref("users").set(users);
}