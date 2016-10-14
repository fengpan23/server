/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const _ = require('underscore');
const db = require('../libs/db');

const TABLE = 'game_multiplayer_table';
const DEFAULT_COLUMN = "*";

/**
 * 根据params对象拼凑条件数组
 * @param params
 */
function _getCond(params) {
    let cond = [];
    if (params.tableid)
        cond.push({[TABLE + '_id']: params.tableid});
    if (params.agentid)
        cond.push({[TABLE + '_agentid']: params.agentid});
    if (params.gameid)
        cond.push({[TABLE + '_gameid']: params.gameid});
    return cond;
}


/**
 * 游戏桌子数据模型
 */
class Table {
    constructor() {

    }

    /**
     * （按条件）获取单个桌子
     * @param dbc
     * @param params
     */
    get(dbc, params) {
        return db.one(dbc, TABLE, DEFAULT_COLUMN, _getCond(params)).then(table => {
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
        let table = {[TABLE +　'_updated']: common.datetimezoneformat(new Date(), configs.envconf().timezone)};
        let columns = _.pick(data, 'agentid', 'gameid', 'status', 'index', 'ptype', 'maxkiosk',
                                    'curkiosk', 'privateip', 'ip', 'port', 'minbet', 'maxbet',
                                    'stakes', 'dfstake', 'extend', 'ptmultiplier', 'lastmatch');

        for(let key in columns)
            table[TABLE + '_' + key] = columns[key];

        return db.update(dbc, TABLE, table, cond);
    }
}

module.exports = new Table();