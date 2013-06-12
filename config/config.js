var mysql = require("mysql")
    fs = require("fs");

var types = {
        CSS: "CSS",
        JS: "JS"
    },
    options = {
        dev: false,
        cacheTimeOut: 5, // Minutes
        compressJS: true,
        compressCSS: true
    },
    config = {
        port:8080,
        baseComboPath:"/combo",
        jsComboPath:"/js/",
        cssComboPath:"/css/",
        apiKeys:[],
        pathSets:[
            {
                rootPath: "/",
                cssRootPath: "/css",
                jsRootPath: "/js"
            }
        ]
    };

function updateConfigFromCLI(process){
    var pairs = process.argv.slice(2, process.argv.length),
        params = {};

    for( var i in pairs){
        if(i % 2){
            var key = pairs[i-1].replace(/$\-+/, ""),
                value = pairs[i];

            params[key] = value;
        }
    }

    updateConfigFromParams(params);
    return this;
}

function updateConfigFromParams(params){
    for( var key in params){
        if(key === "pathSets" && params[key].length){
            config[key] = config[key].concat(params[key]);
        }else if(options.hasOwnProperty(key)){
            options[key] = params[key];
        }else if(config.hasOwnProperty(key)){
            config[key] = params[key];
        }else {
            console.log("ignoring param "+ key );
        }
    }
    return this;
}

function updateFromFile(path){
    fs.readFile(path, function(err, data){
        if(err){
            console.log("Config file not found at "+path);
        }else{
            var configObj = {};
            try{
                configObj = JSON.parse(data);
            }catch(e){
                console.log("Config file at "+path+" contains invalid JSON");
            }
            updateConfigFromParams(configObj);
        }
    });
}

exports.types = types;
exports.options = options;
exports.config = config;
exports.updateConfigFromCLI = updateConfigFromCLI;
exports.updateConfigFromParams = updateConfigFromParams;
exports.updateFromFile = updateFromFile;