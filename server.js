/**
 * Created by fp on 2016/11/3.
 */

const _ = require('underscore');
const Common = require('common');
const Events = require('events');

const Log = require('log')({env: 'develop', singleton: true});   //create singleton log
const Engine = require('engine');

const DB = require('./module/db');
const API = require('./module/api');
const Game = require('./module/game');
const Config = require('./module/config');
const Player = require('./module/player');

class Server extends Events {
    /**
     * init game server
     * @param options  {object}   {
     *                  deposit: Boolean
     *                  infirm: Boolean,     true相同账号登录被强退
     *                  tableId: Number,
     *                  api: {join: Func， seat: Func, ....}
     *             }
     */
    constructor(options) {
        super();
        this._api = new API();
        this._config = new Config();            //create config file module

        this._engine = new Engine();
        this._engine.on('request', this._createBindFunc(options).bind(this)).on('disconnect', id => {
            if(this.players.has(id)){
                let api = options.api &&  options.api.disconnect;
                if(api){
                    Common.invokeCallback(options.api, api, this.players.get(id));
                }
                // this.players.delete(id)
                // this.emit('disconnect', id);
            }
        });

        this._db = new DB({nodes: this._config.get('db.nodes'), cluster: this._config.get('cluster')});

        this._game = new Game(this._db);
        this._game.init(_.pick(options, 'tableId')).then(res => {
            this._engine.start(_.extend({type: 'net'},  _.pick(res, 'port', 'ip')));      //port and ip to create socket server  default port:2323, ip:localhost
            this._api.start(res.port - 10000 || 10000);
        }).catch(e => {
            this._game.exit();
            Log.error('Game init error server.game.init: ', e);
        });

        this._players = new Map();

        process.env.TIMEZONE = this._config.get('timezone');
        process.on('uncaughtException', err => {
            console.error('server uncaughtException', err);
        });
    };

    get players(){
        return this._players;
    }

    _createBindFunc(options) {
        if (options.api) {
            return function (request) {       //request.content => json {event: String, data: Obj}
                let player = this.players.get(request.clientId);
                let opt = {};
                if (!player) {
                    player = new Player(request.clientId);
                    opt.id = request.getParams('content.id');
                    opt.session = request.getParams('content.session');
                    this._players.set(request.clientId, player);
                }
                this._game.auth(player, opt).then(auth => {
                    if(auth.repeat){
                        if(options.infirm){
                            // return request.close('');
                            //TODO  踢掉之前玩家  reconnect
                        }
                        return request.error('invalid_request', 'player is in game');
                    }

                    let action = request.getParams('event');
                    if(player.verify(action)) {
                        let api = options.api[action];
                        api ? Common.invokeCallback(options.api, api, request, player) : request.error('unknown_action', action);
                    }else{
                        request.error('invalid_action', action);
                    }
                }).catch(e => {
                    request.error(e.code, e.message);
                });
            }
        } else {
            return function (request) {
                this.emit('request', request);
            }
        }
    }

    broadcast(event, content){
        let data = _.extend({event: event}, content);
        if(data.event){
            this._engine.broadcast(data);
        }else{
            throw new Error('empty event param !!!');
        }
    }

    createModule(moduleName){
        let Module = require('./module/' + moduleName);
        return new Module(this._db);
    }
}

module.exports = Server;