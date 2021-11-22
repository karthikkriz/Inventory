const express = require('express');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const config = require('./config');
const mongoose = require('mongoose');
const main = require('./app/mainfile/main');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connecting to the database
mongoose.connect(config.databaseconnection.url, {
    useNewUrlParser: true, useUnifiedTopology: true
}).then(() => {
    console.log("Connection Established To Database");
}).catch(err => {
    console.log('Could not connect to the database ', err);
    process.exit();
});

// app.get('/', (req, res) => {
//     res.status(200).json({ "Message": "Order Details Task" });
// });

cron.schedule('1 * * * * *', function () {
    main.checkgeneratetoken(function () {
        console.log('running a token task');
    });
});

//listening port
app.listen(config.apport.port, () => {
    console.log("Server is listening on port " + config.apport.port);
});

require('./app/route')(app)