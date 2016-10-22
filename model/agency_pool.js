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

    get (dbc, type, gameId, agentId) {
        let cond = [{agentid: agentId}, {gameid: gameId}];
        let cols = {
            "id": "id",
            "pool": "current_" + type,
            "current": "current_" + type,
            "protect": "protect_" + type,
            "total": "total_" + type,
            "progjp": "progjp_" + type
        };
        return db.one(dbc, TABLE, cols, cond);
    };
}

module.exports = new AgencyPool();