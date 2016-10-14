/**
 * Created by fp on 2016/10/14.
 */

"use strict";
const db = require('../libs/db');
const TABLE = 'game';

/**
 * 游戏主记录
 */
class Game {
    constructor() {
    }

    /**
     * 根据游戏id查询记录
     * @param dbc
     * @param id
     */
    get(dbc, id) {
        return db.one(dbc, TABLE, '*', [{game_id: id}]).then(game => {
            let result = {};
            for (let key in game){
                result[key.slice(5)] = game[key];
            }
            return Promise.resolve(result);
        });
    }

    update(dbc, id, data) {
        return db.update(dbc, TABLE, {
            game_status: data.status,
            game_display_status: data.dpstatus
        }, [{game_id: id}]);
    }
}
module.exports = new Game();