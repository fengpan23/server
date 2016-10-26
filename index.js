/**
 * Created by fp on 2016/10/13.
 */

const _ = require('underscore');
const Events = require('events');

const Log = require('log')({env: 'develop', singleton: true});   //create singleton log
const Engine = require('engine');

const Game = require('./module/game');
const Config = require('./module/config');
const Request = require('./module/request');

class Index extends Events{
    /**
     * init game server
     * @param options  {object}   {api: {join: Func， seat: Func, ....}}
     */
    constructor(options) {
        super();
        this._config = new Config();            //create config file module

        this._engine = new Engine();
        this._engine.on('request', request => {     //request.content => json {event: String, data: Obj}
            console.log('cc', Object.assign(new Request(), request));
            // if(options.api){
            //     let api = options.api[request.getParams('event')];
            //     api ? Common.invokeCallback(options.api, api, request) : request.close('unknown_action');
            // }else{
            //     this.emit('request', request);
            // }
        }).on('reconnect', request => {
            console.info('client reconnect !!!');

        }).on('disconnect', id => {
            if(this.players.delete(id)){
                this.emit('disconnect', id);
            }
        });

        let opt = {
            nodes: this._config.get('db.nodes'),
            cluster: this._config.get('cluster')
        };
        this._game = new Game(opt);
        this._game.init(_.pick(options, 'tableId')).then(() => {
            this._engine.start(_.pick(options, 'port', 'ip'));      //port and ip to create socket server  default port:2323, ip:localhost
        }).catch(e => {
            Log.error('Game init error server.game.init: ', e);
        });

        this.players = new Map();   //join game players
    };

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

    /**
     * player login game
     * @param request
     * @returns {Promise}
     */
    login(request){
        if (this.closed)
            return Promise.reject("engine is closed on engine.init");

        let session = request.getParams('content.session');

        return this._game.login(session).then(player => {
            request.set({player: player});      //login success keep player alive on client


            return Promise.resolve(player);
        }).catch(e => {
            return Promise.reject(e);
        });
    };

    /**
     * player have seat
     * @param request
     * @param seatIndex
     * @returns {Promise}
     */
    seat(player, seatIndex) {
        if (this.status)
            return Promise.reject("engine is closed on engine.seat");

        if (player.get('status') !== 'login')
            return Promise.reject('player seat error on engine.seat, player status: ' + player.get('status'));

        return this._game.seat(player, seatIndex).then(p => {

            this.players.set(p.id, p);

            return Promise.resolve(player);
        }).catch(e => {
            return Promise.reject(e);
        });
    };

    win(request) {

    };

    quit(request){

    };

    reconnect(request){

    };

    exit() {
    };

    get(name){
        return this._game.get(name);
    }
}

module.exports = Index;
//test
if (require.main !== module) return;
"use strict";
let server = new Index({tableId: 211, api: {
    init: function (request) {
        server.login(request).then(s => {
            console.log('username: ', s.getUsername());


            server.seat(request).then(s => {
                console.log('seat: ', s.getUsername());

            }).catch(e => {
                console.error(e);
            })
        }).catch(e => {
            console.error(e);
        })

    }
}});
