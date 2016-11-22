/**
 * Created by fp on 2016/11/22.
 */
const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'game_agent_trx';

/**
 * 游戏流水
 */
class Trx {
    static add(dbc, data){
        data.created = Util.formatDate(new Date(), process.env.TIMEZONE);
        return DB.insert(dbc, TABLE, data);
    }
}

module.exports = Trx;