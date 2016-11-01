/**
 * Created by fp on 2016/10/13.
 */

const _ = require('underscore');
const Common = require('common');
const Events = require('events');

const Log = require('log')({env: 'develop', singleton: true});   //create singleton log
const Engine = require('engine');

const Game = require('./module/game');
const Config = require('./module/config');

class Index extends Events{
    /**
     * init game server
     * @param options  {object}   {api: {join: Func， seat: Func, ....}}
     */
    constructor(options) {
        super();
        this._config = new Config();            //create config file module

        this._engine = new Engine();
        this._engine.on('request', this._createBindFunc(options).bind(this)).on('reconnect', request => {
            console.info('client reconnect !!!');
        }).on('disconnect', id => {
            if(this.players.delete(id))
                this.emit('disconnect', id);
            // this._game.
        });

        this._game = new Game({nodes: this._config.get('db.nodes'), cluster: this._config.get('cluster')});
        this._game.init(_.pick(options, 'tableId')).then(res => {
            this._engine.start(_.pick(res, 'port', 'ip'));      //port and ip to create socket server  default port:2323, ip:localhost
        }).catch(e => {
            Log.error('Game init error server.game.init: ', e);
        });

        this.players = new Map();   //save the player who had seat (存已经坐下的玩家)
    };

    _createBindFunc(options){
        if(options.api){
            return function(request){       //request.content => json {event: String, data: Obj}
                let clientId = request.getClientId();
                let player = this.players.get(clientId) || this._game.get('player', clientId);
                let api = options.api[request.getParams('event')];
                api ? Common.invokeCallback(options.api, api, request, player) : request.close('unknown_action');
            }
        }else{
            return function(request){
                this.emit('request', request);
            }
        }
    }

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

    /**
     * player login game
     * @param request   {object}
     * @returns {Promise}
     */
    login(request){
        if (this.closed)
            return Promise.reject("engine is closed on engine.init");

        let options = {
            session: request.getParams('content.session'),
            clientId: request.getClientId()
        };
        return this._game.login(options).then(player => {
            return Promise.resolve(player);
        }).catch(e => {
            return Promise.reject(e);
        });
    };

    /**
     * player have seat
     * @param player
     * @param seatIndex
     * @returns {Promise}
     */
    seat(player, seatIndex) {
        if (this.status)
            return Promise.reject("engine is closed on engine.seat");

        if (player.status !== 'login')
            return Promise.reject('player seat error on engine.seat, player status: ' + player.status);

        return this._game.seat(player, seatIndex).then(() => {

            this.players.set(player.clientId, player);
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
