// config.js

const approot = require('app-root-path');
const configfile = require('./config.json');
const runmode = configfile.runmode;
const config = configfile[runmode];

console.info('*************** config *****************');
console.info(`* runmode [dev/prod] : ${runmode}`);
console.info(`* debug_level : ${config.DEBUG_LEVEL}`);
console.info(`* api : ${JSON.stringify(config.API_HOST)}`);
console.info(`* dm_server : ${JSON.stringify(config.DM_SERVER)}`);
console.info(`* api_manager : ${JSON.stringify(config.APIMANAGER_HOST)}`);
console.info(`* domain_id : ${configfile["chatbot"].DOMAIN_ID}`);
console.info(`* react_port : ${config.REACT_PORT}`);
console.info(`* express_port : ${config.EXPRESS_PORT}`);
console.info('****************************************');



module.exports = config;
