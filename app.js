/**
 ** Module dependencies.
 **/
var express = require('express'),
    http = require('http'),
    appConfig = require('./config/appConfig'),
    config = require('./config/config'),
    combo = require('./combo'),
    app = appConfig.createApp(express, combo);

config.updateConfigFromCLI(process);
config.updateFromFile(process.cwd() + "/config.json");

// Routes
app.get('/combo/js', function(req, res){
    combo.comboReq(req, res, config.types.JS, config);
});

app.get('/combo/css', function (req, res) {
    combo.comboReq(req, res, config.types.CSS, config);
});

http.createServer(app).listen(config.config.port);
console.log("Express server listening on port %d in %s mode", config.config.port, app.settings.env);