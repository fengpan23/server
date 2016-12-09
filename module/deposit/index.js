/**
 * Created by fp on 2016/11/15.
 */

const Log = require('log')();
const _ = require('underscore');
const Handle = require('./handle');

class D{
    constructor(server){
        this._server = server;

        server.on('disconnect', this.quit.bind(this));

        this._deposit = new Map();
    };

    start(){
        return this._server.db.begin().then(dbc => {
            let table = this._server.get('table');
            let opt = {gameId: table.gameid, tableId: table.id, maxBet: table.maxbet};

            return Handle.check(dbc, this._server.players, opt).then(res => {

                let params = {gameId: table.gameid, tableId: table.id};
                Promise.all(res.pass.map(r => Handle.start(dbc, Object.assign({kioskId: r.kioskId}, params))))
            }).then(() => {
                return this._server.db.over(dbc);
            }).catch(e => {
                return this._server.db.close(dbc).then(() => Promise.reject(e));
            });
        });
        console.log('deposit start');

    }

    /**
     * player buy in
     * @param player
     * @param amount    buy in point
     * @returns {Promise.<TResult>}
     */
    buy(player, amount){
        return this._server.db.begin().then(dbc => {
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

            return Handle.buy(dbc, opt).then(balance => {
                this._deposit.set(player.id, amount);
                return this._server.db.over(dbc).then(() => Promise.resolve(balance))
            }).catch(e => {
                return this._server.db.close(dbc).then(() => Promise.reject(e));
            });
        });
    }

    /**
     * player quit
     * @param player
     */
    quit(player){
        if(!this._deposit.has(player.id))
            return;

        this._server.db.begin().then(dbc => {
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

            return Handle.refund(dbc, opt).then(() => {
                return this._server.db.over(dbc);
            }).catch(e => {
                return this._server.db.close(dbc).then(() => Promise.reject(e));
            });
        }).catch(e => {
            Log.error('on player deposit.quit ', e);
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
        return this._server.db.begin().then(dbc => {
            let table = this._server.get('table');
            let opt = {gameId: table.gameid, tableId: table.id, maxBet: table.maxbet};
            return Handle.check(dbc, players, opt).then(res => {
                return this._server.db.over(dbc).then(() => Promise.resolve(res));
            }).catch(e => {
                return this._server.db.close(dbc).then(() => Promise.reject(e));
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