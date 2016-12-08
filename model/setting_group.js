/**
 * Created by fp on 2016/10/14.
 */
const DB = require('../libs/db');
const Util = require('../libs/util');


const TABLE = 'game_group_setting';

class SettingGroup {
    constructor() {}

    /**
     * 获取游戏组设置
     * @param dbc
     * @param params
     *  params.groupId
     *  params.agencyId
     *  params.status
     */
    static get (dbc, params) {
        return DB.one(dbc, TABLE, '*', Util.getCond(TABLE, params));
    }
}

module.exports = SettingGroup;