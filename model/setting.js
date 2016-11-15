/**
 * Created by fp on 2016/10/17.
 */
const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'game_setting';

function getCond(params) {
    let cond = [];
    if (params.status) cond.push({[TABLE + '_status']: params.status});
    if (params.agencyId) cond.push({[TABLE + '_agencyid']: params.agencyId});
    return cond;
}

class Setting {
    constructor() {}

    /**
     * 获取所有游戏配置
     * @param dbc
     * @param params
     */
    static find (dbc, params) {
        return db.select(dbc, TABLE, '*', getCond(params)).then(res => {
            let settings = [];
            for (let item of res) {
                settings.push(Util.format(TABLE, item));
            }
            return Promise.resolve(settings);
        });
    }

    /**
     * 获取一个游戏配置
     * @param dbc
     * @param name
     */
    static findOne (dbc, name) {
        let cond = [
            {'game_setting_status': 1},
            {'game_setting_name': name}
        ];
        return db.one(dbc, TABLE, '*', cond);
    }

    /**
     * 更新一个游戏配置
     * @param dbc
     * @param name
     * @param type
     * @param value
     */
    static update(dbc, name, type, value) {
        let cond = [{'game_setting_name': name}];
        let data = {
            'game_setting_name': name,
            'game_setting_type': type,
            'game_setting_data': value,
            'game_setting_status': 1
        };
        return db.update(dbc, TABLE, data, cond);
    }

    /**
     * 添加一个游戏配置
     * @param dbc
     * @param name
     * @param type
     * @param value
     */
    static add(dbc, name, type, value) {
        let data = {
            'game_setting_name': name,
            'game_setting_type': type,
            'game_setting_data': value,
            'game_setting_status': 1
        };
        return db.insert(dbc, TABLE, data);
    }
}

module.exports = Setting;