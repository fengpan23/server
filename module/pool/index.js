/**
 * Created by fp on 2016/11/17.
 */

const Game = require('../game');
const Pool = require('./pool');

class P extends Game{
    constructor(options){
        super(options);
    }

    update(){
        return this._db.begin().then(dbc =>
            Pool.gpoolupdate(dbc, amount).then(pool => {
                return Pool.gpooldelaychk(dbc).then(() => Promise.resolve(pool));
            }).then(pool => {
                return this._db.over(dbc).then(() => Promise.resolve(pool));
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            })
        );
    }

    check(){
        multiplier = multiplier === undefined ? true : common.toboolean(multiplier);
        return Pool.gpoolchk(request, amount, multiplier);
    }
}

module.exports = P;