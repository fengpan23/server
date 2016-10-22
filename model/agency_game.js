/**
 * Created by fp on 2016/10/17.
 */
"use strict";
const db = require('../libs/db');

const TABLE = 'agency_game';

function cond(params) {
    let cond = [];
    if (params.agencyId) cond.push({[TABLE + '_agencyid']: params.agencyId});
    if (params.gameId) cond.push({[TABLE + '_gameid']: params.gameId});
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
