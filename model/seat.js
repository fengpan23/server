/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'game_multiplayer_seat';

function getCond(params) {
    let cond = [];
    if (params.state) cond.push({[TABLE + '_state']: params.state});
    if (params.gameId) cond.push({[TABLE + '_gameid']: params.gameId});
    if (params.kioskId) cond.push({[TABLE + '_kioskid']: params.kioskId});
    if (params.agentId) cond.push({[TABLE + '_agentid']: params.agentId});
    if (params.tableId) cond.push({[TABLE + '_tableid']: params.tableId});
    if (params.seatIndex) cond.push({[TABLE + '_index']: params.seatIndex});
    return cond;
}

class Seat {
    constructor() {}

    /**
     * 获取座位列表
     * @param dbc
     * @param params
     * @param order
     */
    static find(dbc, params, order) {
        return db.select(dbc, TABLE, '*', getCond(params), order).then(seats => {
            let results = [];
            seats.forEach(seat => {
                results.push(Util.format(TABLE, seat));
            });
            return Promise.resolve(results);
        });
    }

    /**
     * 获取单个座位
     * @param dbc
     * @param params
     * @param order
     */
    static get(dbc, params, order) {
        return db.one(dbc, TABLE, '*', getCond(params), order);
    }

    /**
     * 插入多个座位
     * @param dbc
     * @param fields
     * @param data
     */
    static insert(dbc, fields, data) {
        return db.inserts(dbc, TABLE, _.map(fields, field => TABLE + '_' + field), data);
    }

    /**
     * 更新座位
     * @param dbc
     * @param params
     * @param data
     */
    static update(dbc, params, data) {
        let seat = {[TABLE + '_updated'] : +new Date()};

        let d = _.pick(data, 'kioskid', 'agentid', 'gameid', 'roomid', 'state', 'ip', 'port');
        for(let key in d){
            seat[TABLE + '_' + key.toLowerCase()] = d[key];
        }
        return db.update(dbc, TABLE, seat, getCond(params));
    }
}
module.exports = Seat;