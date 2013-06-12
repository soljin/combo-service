
function createApp(express, combo){
    var app = module.exports = express(),
        appPath = process.argv[1].match(/^(.*)\/[^\/]+$/)[1];
    process.chdir(appPath);


    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);

    return app;
}

exports.createApp = createApp;