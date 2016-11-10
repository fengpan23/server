/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const db = require('../libs/db');

const TABLE = 'game_multiplayer_match';

function getCond(params) {
    let cond = [];
    if (params.id) cond.push({game_multiplayer_match_id: params.id});
    if (params.agentid) cond.push({game_multiplayer_match_agentid: params.agentid});
    if (params.tableid) cond.push({game_multiplayer_match_tableid: params.tableid});
    if (params.gameid) cond.push({game_multiplayer_match_gameid: params.gameid});
    if (params.state) cond.push({game_multiplayer_match_state: params.state});
    return cond;
}

class Match {
    constructor() {

    }

    static insert(dbc, data) {
        let match = {[TABLE + '_created']: common.datetimezoneformat(new Date(), configs.envconf().timezone)};

        let columns = _.pick(data, 'agentid', 'tableid', 'gameid', 'kioskcount', 'state', 'bettotal', 'wintotal',
                                    'payout', 'betdetail', 'result', 'updated');
        for(let key in columns) {
            match[TABLE + '_' + key] = columns[key];
        }

        if (data.matchstart) match[TABLE + 'time_matchstart'] = data.matchstart;
        if (data.matchend) match[TABLE + 'time_matchstart'] = data.matchend;

        return db.insert(dbc, TABLE, match);
    }

    ;

    /**
     * 更新游戏场次记录（主要更新游戏结果）
     * @param dbc
     * @param params
     * @param data
     */
    static update(dbc, params, data) {
        let cond = _getcond(params);

        let match = {game_multiplayer_match_updated: common.datetimezoneformat(new Date(), configs.envconf().timezone)};
        if (data.kioskcount) match.game_multiplayer_match_kioskcount = data.kioskcount;
        if (data.matchend) match.game_multiplayer_match_time_matchend = data.matchend;
        if (data.state) match.game_multiplayer_match_state = data.state;
        if (data.bettotal) match.game_multiplayer_match_bettotal = data.bettotal;
        if (data.wintotal) match.game_multiplayer_match_wintotal = data.wintotal;
        if (data.payout) match.game_multiplayer_match_payout = data.payout;
        if (data.betdetail) match.game_multiplayer_match_betdetail = data.betdetail;
        if (data.result) match.game_multiplayer_match_result = data.result;

        return db.update(dbc, tablename, match, cond);
    }

    ;

    /**
     * 获取最近一场游戏记录
     * @param dbc
     */
    getlatestmatch(dbc) {
        return db.one(dbc, tablename, '*', null, {game_multiplayer_match_created: "DESC"});
    }

    getmatches(dbc, params, order) {
        let cond = _getcond(params);
        return db.select(dbc, tablename, '*', cond, order);
    }


}

module.exports = Match;