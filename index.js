/**
 * Created by fp on 2016/10/13.
 */

const Server = require('./server');

class Index extends Server{
    /**
     * init game server
     * @param options  {object}   {api: {join: Func， seat: Func, ....}}
     */
    constructor(options) {
        super(options);
    }

    /**
     * player login game
     * @param player   {object}
     * @param options   {object}    {session: String}
     * @returns {Promise}
     */
    login(player, options){
        return this._lock(player, 'login').then(() =>
            this._game.login(player, options).then(pla => {
                return this._unlock(pla, 'login');
            }).catch(e => {
                this._unlock(player, 'login');
                return Promise.reject(e);
            })
        );
    };

    /**
     * player have seat
     * @param player
     * @param seatIndex
     * @returns {Promise}
     */
    seat(player, seatIndex) {
        return this._lock(player, 'seat').then(() => {
            let client = this._engine.getClients(player.clientId);
            this._game.seat(player, Object.assign({index: seatIndex}, client.remote).then(index => {
                player.set('index', index);
                return this._unlock(player, 'seat');
            }).catch(e => {
                this._unlock(player, 'seat');
                return Promise.reject(e);
            }));
        });
    };

    /**
     * start game
     * @returns {*}
     */
    open(){
        if (this._game.id)       // 校验 ‘游戏是否正在暂停’ ||  ‘游戏是否已开场’
            return Promise.reject("match is already opened on engine.open");

        return this._game.start().then(() => {
            return Promise.resolve(this.players);
        }).catch(e => {
            let clients = this._engine.getClients(this.players.keys());
            clients.forEach(client => {
                client.close('system_maintenance');
            });
            return Promise.reject(e);
        });
    }

    close(){
        if (me.options.deposit && me.getdepositstake() !== me.getdepositwin()) {
            return Promise.reject(new wrong("error", "invalid_action", 'staketotal is not equal wintotal on engine.MatchClose'));
        }
        let players = me.getplayers();
        return new Promise(function (resolve, reject) {
            let dbc = null;
            me._wait().then(function () {
                return db.begin();
            }).then(function (_dbc) {
                dbc = _dbc;
                profile.setdbtime();
                if (me.options.deposit)
                    return gamematch.depositmatchclose(dbc, me.table, me.gameprofile, me.depositstake, me.depositwin, me.depositbalance, me.depositmatchmaster);
                else
                    return Promise.resolve();
            }).then(function (protectmap) {
                if (common.typeof(protectmap) !== 'map')
                    protectmap = new Map();

                //玩家个人关场
                return new Promise(function (_res, _rej) {
                    let idx = 0;
                    let error = false;
                    let reqarr = [];

                    function kioskmatchclose() {
                        if (idx < players.length) {
                            let client = players[idx];
                            idx++;
                            if (client.closed || common.empty(client.match.master.id))
                                return kioskmatchclose();
                            let req = client.createreq('matchclose', dbc);
                            req.reqtimeout(0);
                            req.snapshotsync();
                            reqarr.push(req);
                            let depositbal = 0;
                            let comission = 0;
                            if (me.options.deposit) {
                                depositbal = me.depositbalance.get(client.kiosk.kiosk_id) || 0;
                                comission = protectmap.get(client.kiosk.kiosk_id) || 0;
                            }
                            kioskmatch.close(req, me.gameprofile, me.table, depositbal, comission).then(function () {
                                return gamepromise(req);
                            }).then(function () {
                                kioskmatchclose();
                            }).catch(function (err) {
                                (!error) && (error = err);
                                kioskmatchclose();
                            });
                        } else {
                            reqarr.forEach(function (_req) {
                                if (!!error) _req.snapshotrevert();
                                _req.destroy();
                            });
                            return !!error ? _rej(error) : _res();
                        }
                    }

                    kioskmatchclose();
                });
            }).then(function () {
                //整体游戏关场
                return gamematch.close(dbc, me.table, me.gamematchresult);
            }).then(function () {
                return db.commit(dbc);
            }).then(function () {
                db.destroy(dbc);
                _clearplayersmatch(players);
                _initgameresult(me);
                me._resume();
                return me.init(me.table.tableid, true);
            }, function (err) {
                return db.rollback(dbc).then(function () {
                    db.destroy(dbc);
                    wrong.wronghandler(err, (type, code, debug)=>me.server.errorlog(type, code, debug),
                        ()=>me.server.errorlog('error', 'unexpected_error', err));
                    me.kickplayers();
                    me._resume();
                    return Promise.reject(err);
                }).catch(function (_err) {
                    wrong.wronghandler(_err, (type, code, debug)=>me.server.errorlog(type, code, debug),
                        ()=>me.server.errorlog('error', 'unexpected_error', _err));
                    me.kickplayers();
                    me._resume();
                    return Promise.reject(_err);
                });
            }).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    win(request) {

    };

    /**
     * player quit  玩家退出游戏，返回玩家买入金额，释放座位（如果已经坐下）
     * @param player
     */
    quit(player){
        return this._lock(player, 'quit').then(() =>
            this._game.leave(player).then(() => {
                this._players.delete(player.clientId);

                console.log('this._game.id', this._game.id);
                if (this._game.id) {
                    // return player.leave(request, me.gameprofile, me.table, me.depositbalance.get(kiosk.kiosk_id) || 0);
                } else {
                    return Promise.resolve();
                }
            }).then(() => {
                // if (this.options.deposit) {
                //     request.once('afterclose', function (error) {
                //         if (!error) me.depositbalance.delete(kiosk.kiosk_id);
                //     });
                //     return gamematch.refund(request.dbc, me.table, me.gameprofile, kiosk.kiosk_id);
                // } else {
                //     return Promise.resolve();
                // }
            }).then(() => {
                return this._unlock(player, 'seat');
            })
        ).catch(e => {
            this._unlock(player, 'seat');
            return Promise.reject(e);
        });
    };

    reconnect(player){

    };

    exit() {
    };

    get(name){
        return this._game[name];
    }

    /**
     * lock player
     * @param player
     * @param action
     * @returns {*}
     * @private
     */
    _lock(player, action){
        if(this.closed){
            return Promise.reject('server is closed !');
        }

        return player.verify(action).then(() => {
            return player.lock(action);
        });
    }

    /**
     * unlock player operate
     * @param player
     * @param action    unlock action
     * @private
     */
    _unlock(player, action){
        return player.unlock(action);
    }
}

module.exports = Index;
//test
if (require.main !== module) return;

let server = new Index({tableId: 220, api: {
    init: function (request) {
        server.login(request).then(p => {
            console.log('init: ', p.get('username'));
            request.response('game', {username: p.get('username')});
            request.close();
        }).catch(e => {
            console.error(e);
        })
    },
    seat: function (request, player) {
        server.seat(player).then(p => {
            console.log('seat: ', p.get('username'));
            request.response('game', {seatIndex: p.get('index')});
            request.close();
        }).catch(e => {
            console.error(e);
        })
    }
}});
