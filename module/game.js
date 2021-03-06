/**
 * Created by fp on 2016/10/14.
 */
const _ = require('underscore');
const Util = require('../libs/util');

const Table = require('../model/game_table');
const Match = require('../model/match');

const Seats = require('./seats');

class G{
    constructor(db){
        this._id = null;
        this._table = {};

        this._seats = new Seats();

        this._db = db;
    }

    get id(){
        return this._id;
    }
    get table(){
        return Object.assign({}, this._table);
    }

    init(options){
        console.log('options: ', options);
        return this._db.begin().then(dbc =>
            this._init(dbc, options).then(() => {
                if (this._table.curkiosk > 0 || this._table.status === 2) {
                    this._table.curkiosk = 0;
                    this._table.status = 1;
                    return Table.update(dbc, {id: this._table.id}, {curkiosk: 0, status: 1});
                }
                return Promise.resolve();
            }).then(() => {
                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            })
        ).then(() => {
            return Promise.resolve(_.pick(this._table, 'ip', 'port'));
        }).catch(e => {
            return Promise.reject(e);
        });
    }

    /**
     * verify player
     * @param player  {Player}
     * @returns {Promise.<T>}
     */
    login(player){
        if(player.status !== 'auth')
            return Promise.reject(`player status ${player.status} error on game.login`);

        let opt = {
            agentId: this._table.agentid,
            topAgentId: this._table.topagentid,
            poolAgentId: this._table.poolagentid
        };
        return this._db.begin().then(dbc =>
            player.loadAgency(dbc, opt)
            .then(() => {
                return this._db.over(dbc).then(() => Promise.resolve(player));
            })
            .catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            })
        );
    }

    /**
     *  player have seat
     * @param player
     * @param options
     * @return {Promise.<TResult>}
     */
    seat(player, options){
        if(player.status !== 'login')
            return Promise.reject({code: 'invalid_call', message: `player status ${player.status} error on game.seat.`});

        return this._db.begin().then(dbc => {
            let opt = _.extend({
                tableId: this._table.id,
                gameId: this._table.gameid,
                kioskId: player.id
            }, _.pick(options, 'index', 'ip', 'port', 'adjust'));

            let seatIndex = opt.index;

            return this._seats.choose(dbc, opt).then(res => {
                seatIndex = res.index;
                return Table.update(dbc, {id: opt.tableId, gameId: opt.gameId}, {curKiosk: res.cur});
            }).then(() => {
                return this._db.over(dbc).then(() => Promise.resolve(seatIndex));
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e))
            });
        });
    }

    /**
     * player leave game
     * @param player
     * @returns {Promise.<TResult>}
     */
    leave(player){
        if(!player.index)
            return Promise.resolve();

        return this._db.begin().then(dbc => {
            let params = {
                tableId: this._table.id,
                gameId: this._table.gameid,
                kioskId: player.id,
                index: player.index
            };
            return this._seats.leave(dbc, params).then(cur => {
                return Table.update(dbc, {id: params.tableId, gameId: params.gameId}, {curkiosk: cur});
            }).then(() => {
                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            });
        });
    }

    /**
     * start game
     * @param players   need start players
     * @returns {*}
     */
    start(players){
        if (this._table.status === 0) {     // 检查桌子是否激活
            return Promise.reject({code: 'system_maintenance', message: 'Table is not active status on game.start'});
        }

        return this._db.begin().then(dbc =>
            this._init(dbc, {tableId: this._table.id, reload: true}).then(() => {
                let params = {agencyId: this._table.top_agentid, gameId: this._profile.game.id, status: 1};
                return AgencyGame.find(dbc, params);
            }).then(eg => {
                if (_.isEmpty(eg))
                    return Promise.reject({code: 'system_maintenance', message: 'No agency games on game.start'});

                let params = {id: this._table.id, gameId: this._table.gameid};
                let data = {lastMatch: Util.formatDate(new Date(), process.env.TIMEZONE)};

                return Table.update(dbc, params, data).then(() => {
                    let data = {agentId: this._table.topagentid, tableId: this._table.id, gameId: this._table.gameid, matchStart: Util.formatDate(new Date(), process.env.TIMEZONE), state: "open"};
                    return Match.insert(dbc, data)
                });
            }).then(res => {
                if (res.insertId) {
                    this._id = this._table.matchid = res.insertId;
                }else{
                    return Promise.reject({code: 'unexpected_error', message: 'add match error, insert not success'});
                }
                let opt = {
                    tableId: this._table.id,
                    gameId: this._table.gameid,
                    pType: this._table.ptype,
                    agentId: this._table.agentid,
                    topAgentId: this._table.topagentid,
                    poolAgentId: this._table.poolagentid,
                    walletType: this._profile.game['ptype']
                };
                let seats = this._seats.seat;

                return Promise.all(players.map(player => {
                    return player.open(dbc, _.extend({}, opt, seats[player.get('index')].remote));
                }));
            }).then(res => {
                return this._db.over(dbc).then(() => Promise.resolve(res));
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            })
        );
    }

    /**
     * end game and save game record
     * @param players
     * @returns {*|Promise.<TResult>}
     */
    over(players){
        return this._db.begin().then(dbc => {
            let opt = {gameId: this._table.gameid};
            return Promise.all(players.map(player => player.close(dbc, opt))).then(() => {
                let params = {
                    id: this._id,
                    agentId: this._table.poolAgentId,
                    tableId: this._table.id,
                    gameId: this._table.gameid,
                    state: "open"
                };
                let data = {
                    // kioskCount: gamematchresult.kioskcount,
                    // betTotal: common.tonumber(gamematchresult.bettotal, 4),
                    // winTotal: common.tonumber(gamematchresult.wintotal, 4),
                    // payout: common.tonumber((gamematchresult.wintotal - gamematchresult.bettotal), 4),
                    // betDetail: JSON.stringify(common.float2fix(gamematchresult.betdetail)),
                    // result: JSON.stringify(common.float2fix(gamematchresult.result)),
                    // matchEnd: dbtime,
                    state: "close"
                };
                return Match.update(dbc, params, data);
            }).then(() => {
                this._id = null;

                return this._db.over(dbc);
            }).catch(e => {
                return this._db.close(dbc).then(() => Promise.reject(e));
            });
        });
    }

    exit(){
    //    TODO: exit game remove seat at game multiplayer seat table
    }

    /**
     * auth player
     * @param player
     * @param options   {Object}    {session: String, id: Number}
     * @returns {*}
     */
    auth(player, options){
        if(player.id)
            return Promise.resolve({status: 'ok'});

        return this._db.begin().then(dbc =>
            player.init(dbc, options)
            .then(kiosk => this._db.over(dbc).then(() => Promise.resolve({status: 'ok', repeat: this._seats.has(player.id)})))
            .catch(e => this._db.close(dbc).then(() => Promise.reject(e)))
        );
    }

    _init(dbc, options){
        return Table.get(dbc, {id: options.tableId}).then(table => {
            if (_.isEmpty(table)) 
                return Promise.reject({code: 'invalid_params', message: 'table not exits on game.init'});

            this._table = table;
            return this._seats.init(dbc, table);
        });
    }
}

module.exports = G;