/**
 * Created by fp on 2016/10/14.
 */
const DB = require('../libs/db');
const Util = require('../libs/util');

const TABLE = "game_multiplayer_room";

function getCond(params) {
    let cond = [];
    if (params.roomId) cond.push({[TABLE + '_id']: params.roomId});
    return cond;
}

class Room{
    static get(dbc, params, order) {
        return DB.one(dbc, TABLE, '*', getCond(params), order).then(room => Promise.resolve(Util.format(TABLE, room)));
    }
}

module.exports = Room;