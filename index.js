
const express = require('express');
const app = express();
const Datastore = require('nedb');
const database = new Datastore({filename:'database.db'});
app.use(express.static('public'));
database.loadDatabase();


app.get('/api', (request, response) => {
    database.find({},(err, data) => {
        if (err){
            response.end();
            return;
        }
        response.json(data);
        ///console.log(data);
    });
});

//html set up
var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(app,function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(80, function() {
    console.log((new Date()) + ' Server is listening at port 80');
});


wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

let order = 1;

wsServer.on('request', function(request) {
    console.log(request)
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept(null, request.origin)
    console.log((new Date()) + ' Connection accepted.');

    let count = 0;
    connection.on('message', function(message) {
        const data = message.utf8Data;
        console.log('Received message' + data);
        if (data == "Client: start to collect data!"){
            order = 0;  //when order = 0 -->Start colleting
            database.insert({_id:count,ReceivedTime: new Date().toString()});
            console.log("Start collecting...");
            connection.sendUTF("Server: Start collecting...");
        }
        else if (data == "Client: stop collecting data!"){
            order = 1; 
            console.log("Collection stopped");
            connection.sendUTF("Server: Collection stopped!");
        }
        
        if(order ==0){
            count +=1;
            console.log('Data:' + data);
            database.insert({_id:count, data});
        }
        
    });

    //console.log(order);

    
    
            
    //connection.sendUTF("Server: Collection complete!!!");
    
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        //console.log(database);
    });

});