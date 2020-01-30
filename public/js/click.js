function acceptTrade(user, id){
    var url = 'localhost:3000/'+user+'/acceptTrade/'+id;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        value: value
    }));
}
function rejectTrade(user, id){
    var url = 'localhost:3000/'+user+'/rejectTrade/'+id;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        value: value
    }));
} 