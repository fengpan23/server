/**
 * Created by fp on 2016/10/17.
 */
"use strict";
const db = require('../libs/db');
const TABLE = 'game_setting';

/**
 * 游戏配置
 */
class Setting {
    constructor() {

    }

    /**
     * 获取所有游戏配置
     * @param dbc
     * @param cond
     */
    find (dbc, cond) {
        return db.select(dbc, TABLE, '*', cond);
    };

    /**
     * 获取一个游戏配置
     * @param dbc
     * @param name
     */
    findOne (dbc, name) {
        let cond = [
            {'game_setting_status': 1},
            {'game_setting_name': name}
        ];
        return db.one(dbc, TABLE, '*', cond);
    };

    /**
     * 更新一个游戏配置
     * @param dbc
     * @param name
     * @param type
     * @param value
     */
    update(dbc, name, type, value) {
        let cond = [{'game_setting_name': name}];
        let data = {
            'game_setting_name': name,
            'game_setting_type': type,
            'game_setting_data': value,
            'game_setting_status': 1
        };
        return db.update(dbc, TABLE, data, cond);
    };

    /**
     * 添加一个游戏配置
     * @param dbc
     * @param name
     * @param type
     * @param value
     */
    add (dbc, name, type, value) {
        let data = {
            'game_setting_name': name,
            'game_setting_type': type,
            'game_setting_data': value,
            'game_setting_status': 1
        };
        return db.insert(dbc, TABLE, data);
    };
}

module.exports = new Setting();