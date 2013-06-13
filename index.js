var config = require('./config/config'),
    combo = require('./combo');
    
exports.bindComboService = function(app, params){
    // Update Config
    config.updateConfigFromParams(params);
    
    // Routes
    console.log("Combo Service binding path: "+config.config.baseComboPath+config.config.jsComboPath);
    app.get(config.config.baseComboPath+config.config.jsComboPath, function(req, res){
        combo.comboReq(req, res, config.types.JS, config);
    });
    
    console.log("Combo Service binding path: "+config.config.baseComboPath+config.config.cssComboPath);
    app.get(config.config.baseComboPath+config.config.cssComboPath, function (req, res) {
        combo.comboReq(req, res, config.types.CSS, config);
    });
};

exports.combo = combo;
exports.config = config;