var fs = require('fs'),
    crypto = require('crypto'),
    cssmin = require('css-compressor').cssmin,
    uglifyJSParser = require("uglify-js").parser,
    uglifyJSUglify = require("uglify-js").uglify,
    cache = {},
    CacheItem = function(path, compressed, hash, content){
        this.path = path;
        this.hash = hash;
        this.content = content;
        this.compressed = compressed;
        this.expires = new Date().getTime();
    };

/**
 **  So, you can enter in file names 1 of 3 ways but you CANNOT mix them.
 **  This is because order matters in both CSS and JS and order cannot be
 **  extracted when params are mixed. If they are mixed r will be prefered
 **  over files which will be prefered over simple file list.
 **
 **  1) ?r=<File Path>&r=<File Path>&r=<File Path>
 **  2) ?file=<File Path>&file=<File Path>&file=<File Path>
 **  3) ?<File Path>&<File Path>&<File Path>
 **
 **  You can intermix config params in any order.
 **/

function comboReq(req, res, type, config){

    var files = extractFilePaths(req.query),
        reqOptions = extractOptions(config.options, req.query, true),
        reqConfig = config.config;


    res.header("Content-Type", type == config.types.JS ? "application/javascript" : "text/css");
    res.header("Expires", new Date(new Date().getTime() + reqOptions.cacheTimeOut * 60 * 1000));

    /* TODO set headers */
    if(files.length){
        processFiles(files.shift());
     } else{
        res.end();
    }



    function processFiles(partialPath){
        var pathSetIndex = 0,
            path = getBasePath(pathSetIndex) + partialPath,
            fileHashKey,
            name,
            nameBase,
            staticContent;
            
        if(reqConfig.staticStore && partialPath){
            name = partialPath
                        .split("/").pop();
            nameBase = name
                        .split(type == config.types.JS ? ".js" : ".css")[0];
                        
            staticContent = 
                reqConfig.staticStore[name] ||
                reqConfig.staticStore[nameBase] ||
                reqConfig.staticStore[nameBase+"-"];

            if(staticContent){
                console.log(name);
                writeFile(null, staticContent);
            }else{
                fs.realpath(path, checkPath);
            }
        }else{
            fs.realpath(path, checkPath);
        }

        function checkPath(err, resolvedPath){
            if(err && pathSetIndex < reqConfig.pathSets.length - 1){
                pathSetIndex++;
                path = getBasePath(pathSetIndex) + partialPath;
                fs.realpath(path, checkPath);
            }else if(err){
                writeFile("404","/* File not found: "+partialPath+" */");
            }else{
                fs.realpath(getBasePath(pathSetIndex), function(err, fullBasePath){
                    if(resolvedPath.indexOf(fullBasePath) === 0){
                        fileHashKey = getFileHashKey(resolvedPath, doCompress());
        
                        if(!reqOptions.dev && cacheCheck(fileHashKey)){
                            console.log("Serving from cache: "+resolvedPath);
                            writeFile(null, cache[fileHashKey].content);
                        }else{
                            console.log("Setting up cache: "+resolvedPath);
                            setupCache(resolvedPath, fileHashKey, function(){
                                writeFile(null, cache[fileHashKey].content);
                            });
                        }
                    }else{
                        writeFile("403","/* File out of root: "+partialPath+" */");
                    }
                });
            }
        }

        function getBasePath(idx){
            return reqConfig.pathSets[idx].rootPath+
                ( type == config.types.JS ?  reqConfig.pathSets[idx].jsRootPath : reqConfig.pathSets[idx].cssRootPath);
        }

        function writeFile(err, content){
            if(!err){
                res.write('\n/* Added file from '+partialPath+' */\n');
            }
            res.write(content);
            if(files.length){
                processFiles(files.shift());
            }else{
                res.write("\n");
                res.end();
            }
        }

    }

    function setupCache(fullPath, fileHashKey, cb){
        cb = cb || function(){};

        var compress = doCompress();

        if(!cache[fileHashKey]){
            cache[fileHashKey] = new CacheItem(fullPath, compress);
        }
        getFileHashAndContents(fullPath, function(hash, content){
            if(cache[fileHashKey].hash === hash && cache[fileHashKey].compressed === compress){
                updateCache(cache[fileHashKey]);
                cb();
            }else{
                if( compress && !fullPath.match(/\-min\.js$/) ){
                    if(type == config.types.JS){
                        cache[fileHashKey].content = compressJS(content);
                    }else{
                        cache[fileHashKey].content = compressCSS(content);
                    }
                }else{
                    cache[fileHashKey].content = content;
                }
                    
                cache[fileHashKey].hash = hash;
                updateCache(cache[fileHashKey]);
                
                cb();
            
            }
        });
    }

    function updateCache(cacheObj){
        cacheObj.expires = new Date().getTime() + reqOptions.cacheTimeOut * 60 * 1000;
    }

    function doCompress(){
        var compressCSS = type == config.types.CSS && reqOptions.compressCSS,
            compressJS = type == config.types.JS && reqOptions.compressJS,
            compress = compressJS || compressCSS;

        compress = reqOptions.dev ? false : compress;

        return compress;
    }
}

function getFileHashAndContents(fullPath, cb){
    cb = cb || function(){};

    var md5sum = crypto.createHash('md5'),
        content = '',
        s = fs.ReadStream(fullPath);

    s.on('data', function(data) {
        md5sum.update(data);
        content += data.toString();
    });

    s.on('end', function() {
        var hash = md5sum.digest('hex');
        cb(hash, content);
    });
}

function getFileHashKey(fullPath, compress){
    var md5Sum = crypto.createHash('md5');

    md5Sum.update(fullPath);
    md5Sum.update(compress ? "compressed" : "uncompressed");

    return md5Sum.digest('hex');
}

function compressJS(str){
    var ast,
        compressedJSStr;
    
    try{
        ast = uglifyJSParser.parse(str);
        ast = uglifyJSUglify.ast_mangle(ast);
        ast = uglifyJSUglify.ast_squeeze(ast);
        compressedJSStr = uglifyJSUglify.gen_code(ast)+";";
    }catch(e){
        console.log("Error compressing js.");
    }

    return compressedJSStr || str;
}

function compressCSS(cssStr){
    var compressedCSSStr;
    
    try{
        compressedCSSStr = cssmin(cssStr);
    }catch(e){
        console.log("Error compressing css.");
    }

    return compressedCSSStr || cssStr;
}

function extractFilePaths(query){

    var fileList = [];

    if(query.r){
        fileList = fileList.concat(query.r);
    }else if(query.files){
        fileList = fileList.concat(query.files);
    }

    if(!fileList.length){
        for(var key in query){
            if(query[key] === ''){
                fileList.push(key);
            }
            if(Array.isArray(query[key])){
                var count = 1;
                query[key].forEach(function(val){
                    count += val === '' ? 1 : 0;
                });
                if(count == query[key].length){
                    fileList.push(key);
                }
            }
        }
    }

    return fileList;
}

function extractOptions(defaultOptions, query){
    var options = {};
    for( var key in defaultOptions){
        options[key] = query[key] || defaultOptions[key];

        if(options[key] === "false"){
            options[key] = false;
        }
    }

    return options;
}

function cacheCheck(fileHashKey){
    var inCache = false;
    if(cache[fileHashKey]){
        if(new Date().getTime() < cache[fileHashKey].expires){
            inCache = true;
        }
    }
    return inCache;
}


exports.comboReq = comboReq;
exports.getFileHashAndContents = getFileHashAndContents;
exports.compressJS = compressJS;
exports.compressCSS = compressCSS;
exports.extractOptions = extractOptions;
exports.extractFilePaths = extractFilePaths;
exports.cacheCheck = cacheCheck;
