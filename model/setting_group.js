/**
 * Created by fp on 2016/10/14.
 */
"use strict";
const db = require('../libs/db');
const TABLE = 'game_group_setting';

class Setting {
    constructor() {
    }

    /**
     * 获取游戏组设置
     * @param dbc
     * @param groupId
     * @param agencyId
     * @param status
     */
    get (dbc, groupId, agencyId, status) {
        let cond = [{game_group_setting_groupid: groupId}, {game_group_setting_agencyid: agencyId}, {game_group_setting_status: status}];
        return db.one(dbc, TABLE, '*', cond);
    };
}

module.exports = new Setting();