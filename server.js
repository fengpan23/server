/**
 * Created by fp on 2016/11/3.
 */

const _ = require('underscore');
const Common = require('common');
const Events = require('events');

const Log = require('log')({env: 'develop', singleton: true});   //create singleton log
const Engine = require('engine');

const API = require('./module/api');
const Game = require('./module/game');
const Config = require('./module/config');
const Player = require('./module/player');

class Server extends Events {
    /**
     * init game server
     * @param options  {object}   {api: {join: Func， seat: Func, ....}}
     */
    constructor(options) {
        super();
        this._api = new API();
        this._config = new Config();            //create config file module

        this._engine = new Engine();
        this._engine.on('request', this._createBindFunc(options).bind(this)).on('reconnect', request => {
            console.info('client reconnect !!!');
        }).on('disconnect', id => {
            if (this.players.delete(id))
                this.emit('disconnect', id);
            // this._game.
        });

        this._game = new Game({nodes: this._config.get('db.nodes'), cluster: this._config.get('cluster')});
        this._game.init(_.pick(options, 'tableId')).then(res => {
            this._engine.start(_.pick(res, 'port', 'ip'));      //port and ip to create socket server  default port:2323, ip:localhost

            this._api.start(res.port - 10000 || 10000);
        }).catch(e => {
            Log.error('Game init error server.game.init: ', e);
        });

        this._players = new Map();
    };

    get players(){
        return this._players;
    }

    _createBindFunc(options) {
        if (options.api) {
            return function (request) {       //request.content => json {event: String, data: Obj}
                let clientId = request.getClientId();
                let player = this.players.has(clientId);
                if (!player) {
                    player = new Player(clientId);
                    this._players.set(clientId, player);
                }
                let action = request.getParams('event');
                let api = options.api[action];
                api ? Common.invokeCallback(options.api, api, request, player) : request.close('unknown_action: ' + action);
            }
        } else {
            return function (request) {
                this.emit('request', request);
            }
        }
    }
}

module.exports = Server;