/**
 * Created by fp on 2016/10/17.
 */
"use strict";
const db = require('../libs/db');

const TABLE = 'game_agent_pool';

class AgencyPool {
    constructor() {
    }

    add (dbc, gameId, agentId) {
        return db.insert(dbc, TABLE, {gameid: gameId, agentid: agentId});
    };

    get (dbc, ptype, gameId, agentId) {
        let cond = [{agentid: agentId}, {gameid: gameId}];
        let cols = {
            "id": "id",
            "pool": "current_" + ptype,
            "current": "current_" + ptype,
            "protect": "protect_" + ptype,
            "total": "total_" + ptype,
            "progjp": "progjp_" + ptype
        };
        return db.one(dbc, TABLE, cols, cond);
    };
}

module.exports = new AgencyPool();