/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'game_table';

class Table {
    constructor() {}

    /**
     * （按条件）获取单个桌子
     * @param dbc
     * @param params
     */
    static get(dbc, params) {
        return DB.one(dbc, TABLE, '*', Util.getCond(params));
    }

    /**
     * 更新桌子
     * @param dbc
     * @param params
     * @param data
     */
    static update(dbc, params, data) {
        let table = _.pick(data, 'gameId', 'status', 'index', 'maxKiosk',
                                    'curUser', 'privateIp', 'ip', 'port', 'minBet', 'maxBet',
                                    'stakes', 'dfStake', 'extend', 'ptMultiplier', 'lastMatch');
        table.updated = Util.formatDate(new Date(), process.env.TIMEZONE);

        return DB.update(dbc, TABLE, Util.format(TABLE, table, true), Util.getCond(TABLE, params));
    }
}

module.exports = Table;