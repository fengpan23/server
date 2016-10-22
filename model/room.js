/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const db = require('../libs/db');
const util = require('../libs/util');

const TABLE = "game_multiplayer_room";

function getCond(params) {
    let cond = [];
    if (params.roomId) cond.push({[TABLE + '_id']: params.roomId});
    return cond;
}

class Room{
    constructor() {
    }

    get(dbc, params, order) {
        return db.one(dbc, TABLE, '*', getCond(params), order).then(room => Promise.resolve(util.format(TABLE, room)));
    }
}

module.exports = new Room();