/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const db = require('../libs/db');

const TABLE = "game_multiplayer_room";
const DEFAULT_COLUMN = "*";

function getCond(params) {
    let cond = [];
    if (params.roomid) cond.push({game_multiplayer_room_id: params.roomid});
    return cond;
}

class Room{
    constructor() {
    }

    get(dbc, params, order) {
        return db.one(dbc, TABLE, DEFAULT_COLUMN, getCond(params), order).then(room => {
            let results = {};
            for(let key in room){
                results[key.split('_').pop()] = room[key];
            }
            return Promise.resolve(results);
        });
    }
}

module.exports = new Room();