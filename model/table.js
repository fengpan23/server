/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const _ = require('underscore');
const db = require('../libs/db');

const TABLE = 'game_multiplayer_table';

function _getCond(params) {
    let cond = [];
    if (params.tableId)
        cond.push({[TABLE + '_id']: params.tableId});
    if (params.agentId)
        cond.push({[TABLE + '_agentid']: params.agentId});
    if (params.gameId)
        cond.push({[TABLE + '_gameid']: params.gameId});
    return cond;
}

class Table {
    constructor() {
    }

    /**
     * （按条件）获取单个桌子
     * @param dbc
     * @param params
     */
    get(dbc, params) {
        return db.one(dbc, TABLE, '*', _getCond(params)).then(table => {
            let result = {};
            for(let key in table)
                result[key.split('_').pop()] = table[key];
            return Promise.resolve(result);
        });
    }

    /**
     * 更新桌子
     * @param dbc
     * @param params
     * @param data
     */
    update(dbc, params, data) {
        let cond = _getCond(params);
        let table = {[TABLE +　'_updated']: +new Date()};
        let columns = _.pick(data, 'agentid', 'gameid', 'status', 'index', 'ptype', 'maxkiosk',
                                    'curkiosk', 'privateip', 'ip', 'port', 'minbet', 'maxbet',
                                    'stakes', 'dfstake', 'extend', 'ptmultiplier', 'lastmatch');

        for(let key in columns)
            table[TABLE + '_' + key] = columns[key];

        return db.update(dbc, TABLE, table, cond);
    }
}

module.exports = new Table();