/**
 * Created by fp on 2016/10/14.
 */
const db = require('../libs/db');
const Util = require('../libs/util');

const TABLE = 'game';

class Game {
    constructor() {}

    /**
     * 根据游戏id查询记录
     * @param dbc
     * @param id
     */
    static get(dbc, id) {
        return db.one(dbc, TABLE, '*', [{id: id}]).then(game => Promise.resolve(Util.format(TABLE, game)));
    }

    static update(dbc, id, data) {
        return db.update(dbc, TABLE, {
            game_status: data.status,
            game_display_status: data.dpstatus
        }, [{game_id: id}]);
    }
}
module.exports = Game;