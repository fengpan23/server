/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'game_seat';

class Seat {
    constructor() {}

    /**
     * 获取座位列表
     * @param dbc
     * @param params
     * @param order
     */
    static find(dbc, params, order) {
        return db.select(dbc, TABLE, '*', Util.getCond(params), order);
    }

    /**
     * 获取单个座位
     * @param dbc
     * @param params
     * @param order
     */
    static get(dbc, params, order) {
        return db.one(dbc, TABLE, '*', Util.getCond(TABLE, params), order);
    }

    /**
     * 插入多个座位
     * @param dbc
     * @param fields
     * @param data
     */
    static insert(dbc, fields, data) {
        return db.inserts(dbc, TABLE, _.map(fields, field => TABLE + '_' + field.toLowerCase()), data);
    }

    /**
     * 更新座位
     * @param dbc
     * @param params
     * @param data
     */
    static update(dbc, params, data) {
        data.update = Util.formatDate(new Date(), process.env.TIMEZONE);
        return db.update(dbc, TABLE, data, Util.getCond(params));
    }
}
module.exports = Seat;