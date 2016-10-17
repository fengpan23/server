/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const _ = require('underscore');
const db = require('../libs/db');

const TABLE = 'game_multiplayer_seat';
const DEFAULT_COLUMN = "*";

function getCond(params) {
    let cond = [];
    if (params.state) cond.push({[TABLE + '_state']: params.state});
    if (params.gameid) cond.push({[TABLE + '_gameid']: params.gameid});
    if (params.kioskid) cond.push({[TABLE + '_kioskid']: params.kioskid});
    if (params.agentid) cond.push({[TABLE + '_agentid']: params.agentid});
    if (params.tableid) cond.push({[TABLE + '_tableid']: params.tableid});
    if (params.seatindex) cond.push({[TABLE + '_index']: params.seatindex});
    return cond;
}

class Seat {
    constructor() {
    }

    /**
     * 获取座位列表
     * @param dbc
     * @param params
     * @param order
     */
    find(dbc, params, order) {
        return db.select(dbc, TABLE, DEFAULT_COLUMN, getCond(params), order).then(seats => {
            let results = [];
            seats.forEach(seat => {
                let s = {};
                for(let key in seat){
                    s[key.split('_').pop()] = seat[key];
                }
                results.push(s);
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
    get(dbc, params, order) {
        return db.one(dbc, TABLE, DEFAULT_COLUMN, getCond(params), order);
    }

    /**
     * 插入多个座位
     * @param dbc
     * @param fields
     * @param data
     */
    insert(dbc, fields, data) {
        return db.inserts(dbc, TABLE, fields, data);
    }

    /**
     * 更新座位
     * @param dbc
     * @param params
     * @param data
     */
    update(dbc, params, data) {
        let seat = {[TABLE + '_updated'] : common.datetimezoneformat(new Date(), configs.envconf().timezone)};

        let d = _.pick(data, 'kioskid', 'agentid', 'gameid', 'roomid', 'state', 'ip', 'port')
        for(let key in d){
            seat[TABLE + '_' + key] = d[key];
        }
        return db.update(dbc, TABLE, seat, getCond(params));
    }
}
module.exports = new Seat();