/**
 * Created by fp on 2016/11/15.
 */

const _ = require('underscore');
const handle = require('./handle');

class D{
    constructor(server){
        this._db = server.db;
        this._server = server;

        server.on('disconnect', player => {
            this.out(player);
        });

        this._deposit = new Map();
    };

    start(){
        console.log('deposit start');
        return this.check(this._server.players);
    }

    /**
     * player buy in
     * @param player
     * @param amount    buy in point
     * @returns {Promise.<TResult>}
     */
    buy(player, amount){
        return this._db.begin().then(dbc => {
            let table = this._server.get('table');
            let opt = {
                amount: amount,
                gameId: table.gameid,
                tableId: table.id,
                kioskId: player.id,
                kioskType: player.type,
                agencyId: player.kiosk.agencyid,
                pType: table.ptype,
                name: 'main'
            };

            return handle.buy(dbc, opt).then(balance => {
                return this._db.over(dbc).then(() => Promise.resolve(balance))
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            });
        });
    }

    out(player){
        return this._db.begin().then(dbc => {
            let table = this._server.get('table');
            let opt = {
                gameId: table.gameid,
                tableId: table.id,
                kioskId: player.id,
                kioskType: player.type,
                agencyId: player.kiosk.agencyid,
                pType: table.ptype,
                name: 'main'
            };

            return handle.refund(dbc, opt).then(() => {
                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            });
        });
    }

    /**
     * player win （玩家赢钱， 需要先有bet）
     * @param player
     * @param point
     */
    win(player, point){
        this._deposit.set(player.id, point);
        return Promise.resolve(point);
    }

    /**
     * player stake     (玩家下注)
     * @param player
     * @param point
     */
    bet(player, point){
        this._deposit.set(player.id, point);
        return Promise.resolve(point);
    }

    /**
     * check players deposit amount
     * @param players
     * @returns {Promise.<TResult>|*}
     */
    check(players){
        return this._db.begin().then(dbc => {
            let table = this._server.get('table');
            let opt = {gameId: table.gameid, tableId: table.id, maxBet: table.maxbet};
            return handle.check(dbc, players, opt).then(res => {
                console.log('check res : ', res);
            }).then(() => {
                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            });
        });
    }

    balance(){
        ispoint = !!ispoint;
        if (this.depositbalance.has(kioskid)) {
            let balance = this.depositbalance.get(kioskid);
            return ispoint ? Math.floor(profile.ptconvertion(balance, false, true)) : balance;
        }
        return 0;
    }

    stake(){
        let result = 0;
        if (common.empty(kioskid)) {
            let total = 0;
            this.depositstake.forEach(function (val) {
                total += val;
            });
            result = profile.poolratiocurrentcount(common.tonumber(total));
        } else {
            return profile.poolratiocurrentcount(this.depositstake.get(kioskid)) || 0;
        }

        return common.tonumber(result);
    }
}

module.exports = D;