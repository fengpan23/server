/**
 * Created by fp on 2016/10/17.
 */

"use strict";
const db = require('../libs/db');
const TABLE = 'agency_game';

/**
 * 根据params对象拼凑条件数组
 * @param params
 */
function cond(params) {
    let cond = [];
    if (params.agencyid) cond.push({[TABLE + '_agencyid']: params.agencyid});
    if (params.gameid) cond.push({[TABLE + '_gameid']: params.gameid});
    if (params.status) cond.push({[TABLE + '_status']: params.status});
    return cond;
}


class AgencyGame{
    constructor() {
    }

    find(dbc, params, order) {
        return db.select(dbc, TABLE, '*', cond(params), order);
    }
}

module.exports = new AgencyGame();
