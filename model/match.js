/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'game_multiplayer_match';
const TIMEZONE = process.env['TIMEZONE'] || 'Asia/Kuala_Lumpur';

class Match {
    constructor() {}

    static insert(dbc, data) {
        let match = Util.format(TABLE, _.pick(data, 'agentId', 'tableId', 'gameId', 'kioskCount', 'state', 'betTotal',
                                                    'winTotal', 'payout', 'betDetail', 'result', 'updated'), true);

        match[TABLE + '_created'] = Util.formatDate(new Date(), TIMEZONE);
        if (data['matchStart']) match[TABLE + '_time_matchstart'] = data['matchStart'];
        if (data['matchEnd']) match[TABLE + '_time_matchstart'] = data['matchEnd'];

        return db.insert(dbc, TABLE, match);
    }

    /**
     * 更新游戏场次记录（主要更新游戏结果）
     * @param dbc
     * @param params
     * @param data
     */
    static update(dbc, params, data) {
        let match =  Util.format(TABLE, data, true);

        match[TABLE + '_updated'] = Util.formatDate(new Date(), TIMEZONE);
        match[TABLE + '_time_matchend'] = data['matchEnd'] || Util.formatDate(new Date(), TIMEZONE);

        return db.update(dbc, TABLE, match, Util.getCond(TABLE, params));
    }

    ;

    /**
     * 获取最近一场游戏记录
     * @param dbc
     */
    getlatestmatch(dbc) {
        return db.one(dbc, TABLE, '*', null, {game_multiplayer_match_created: "DESC"});
    }

    getmatches(dbc, params, order) {
        let cond = _getcond(params);
        return db.select(dbc, TABLE, '*', cond, order);
    }


}

module.exports = Match;