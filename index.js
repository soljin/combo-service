var config = require('./config/config'),
    combo = require('./combo');
    
exports.bindComboService = function(app, params){
    // Update Config
    config.updateConfigFromParams(params);
    
    // Routes
    app.get(config.baseComboPath+config.jsComboPath, function(req, res){
        combo.comboReq(req, res, config.types.JS, config);
    });
    
    app.get(config.baseComboPath+config.cssComboPath, function (req, res) {
        combo.comboReq(req, res, config.types.CSS, config);
    });
};