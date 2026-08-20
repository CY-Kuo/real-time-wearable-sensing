// Set up constant parameters
const express = require('express');
const app = express();
const Datastore = require('nedb');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const database1 = new Datastore({ filename: 'database1.db' });
const database2 = new Datastore({ filename: 'database2.db' });
const database3 = new Datastore({ filename: 'database3.db' });
const database4 = new Datastore({ filename: 'database4.db' });

// Load the databases
database1.loadDatabase();
database2.loadDatabase();
database3.loadDatabase();
database4.loadDatabase();

// Set up routes to fetch data from databases
app.use(express.static('public'));
app.get('/api/A1', (request, response) => {
    database1.find({}, (err, data) => {
        if (err) {
            response.end();
            return;
        }
        response.json(data);
    });
});

app.get('/api/A2', (request, response) => {
    database2.find({}, (err, data) => {
        if (err) {
            response.end();
            return;
        }
        response.json(data);
    });
});

app.get('/api/A3', (request, response) => {
    database3.find({}, (err, data) => {
        if (err) {
            response.end();
            return;
        }
        response.json(data);
    });
});

app.get('/api/A4', (request, response) => {
    database4.find({}, (err, data) => {
        if (err) {
            response.end();
            return;
        }
        response.json(data);
    });
});

// Primary process tasks
if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    let count1 = 0;
    let count2 = 0;
    let count3 = 0;
    let count4 = 0;

    // Fork Arduino workers
    const arduinoWorkers = [];
    for (let i = 0; i < numCPUs; i++) {
        const arduinoWorker = cluster.fork();
        arduinoWorker.send({ type: 'initialize', workerType: 'arduino' });
        arduinoWorkers.push(arduinoWorker);
    }

    // Handle messages from workers
    cluster.on('message', (worker, message) => {
        const data = message;
        const label = data.slice(2, 4);

        if (label === 'A1') {
            count1 += 1;
            database1.insert({ _id: count1, data });
        } else if (label === 'A2') {
            count2 += 1;
            database2.insert({ _id: count2, data });
        } else if (label === 'A3') {
            count3 += 1;
            database3.insert({ _id: count3, data });
        } else if (label === 'A4') {
            count4 += 1;
            database4.insert({ _id: count4, data });
        }
    });

    // Listen for dashboard connections
    const PORT = 3002;
    const server = app.listen(PORT, () => {
        console.log(`Dashboard server ${process.pid} listening on port ${PORT}`);
    });

    const WebSocketServer = require('websocket').server;
    const wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    wsServer.on('request', (request) => {
        const connection = request.accept(null, request.origin);
        console.log(`Dashboard connection accepted in process ${process.pid}`);

        connection.on('message', (message) => {
            const dataReceived = message.utf8Data;

            // Broadcast dashboard start/stop commands to Arduino workers
            if (dataReceived === 'Client: start to collect data!') {
                connection.sendUTF('Server: Start collecting...');
                arduinoWorkers.forEach((worker) => {
                    worker.send({ type: 'start_collection' });
                });
            } else if (dataReceived === 'Client: stop collecting data!') {
                connection.sendUTF('Server: Collection stopped!');
                arduinoWorkers.forEach((worker) => {
                    worker.send({ type: 'stop_collection' });
                });
            }
        });

        connection.on('close', () => {
            console.log(`Peer ${connection.remoteAddress} disconnected.`);
        });
    });

    // Restart workers that exit unexpectedly
    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died`);
        const newArduinoWorker = cluster.fork();
        newArduinoWorker.send({ type: 'initialize', workerType: 'arduino' });
        arduinoWorkers.push(newArduinoWorker);
    });
} else {
    let order = 1;

    process.on('message', (msg) => {
        if (msg.type === 'start_collection') {
            order = 0;
            console.log(`Worker ${process.pid} started collecting.`);
        } else if (msg.type === 'stop_collection') {
            order = 1;
            console.log(`Worker ${process.pid} stopped.`);
        }
    });

    // Listen for Arduino WebSocket connections
    const PORT2 = 80;
    const server = app.listen(PORT2, () => {
        console.log(`Arduino worker ${process.pid} listening on port ${PORT2}`);
    });

    const WebSocketServer = require('websocket').server;
    const wsServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    wsServer.on('request', (request) => {
        const connection = request.accept(null, request.origin);
        console.log(`Arduino connection accepted in worker ${process.pid}`);

        // Forward Arduino data to the primary process only while collection is active
        connection.on('message', (message) => {
            const dataReceived = message.utf8Data;
            if (order === 0) {
                process.send(dataReceived);
            }
        });

        connection.on('close', () => {
            console.log(`Peer ${connection.remoteAddress} disconnected.`);
        });
    });
}
