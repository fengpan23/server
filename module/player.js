/**
 * Created by fengpan on 2016/10/22.
 */
const _ = require('underscore');
const UserModel = require('../model/user');
const MatchMasterModel = require('../model/match_master');
const MatchResultModel = require('../model/match_result');

const STATUS = {new: 0, auth: 1, init: 3, login: 5, seat: 7, open: 9, quit: 11};

class Player {
    constructor(clientId) {
        this._clientId = clientId;

        this._actions = new Set();
        this._status = 'new';
    }
    get id(){
        return this._user &&　this._user.id
    }
    get matchId(){      //玩家开场之后产生 match id
        return this._matchId;
    }
    get user(){
        return Object.assign({}, this._user);
    }
    get agency(){
        return Object.assign({}, this._agency);
    }
    get username(){
        let agencyName = this.agency.username;
        let name = (this._user && this._user.username) || 'anonymous';
        if (name.startsWith(agencyName))
            name = name.substr(agencyName.length);
        else if (name !== 'anonymous' && name.length > 4)
            name = name.substr(-4);
        return name;
    }
    get balance(){
        return this._user && this._user['balance_a'];
    }
    get clientId(){
        return this._clientId;
    }
    get status(){
        return this._status;
    }
    set status(value){
        this._status = value;
    }
    get index(){
        return this['_cabinet_index'];
    }

    set(key, value){
        return this['_cabinet_' + key] = value;
    }

    /**
     * get player set data
     * @param key
     * @returns {*}     if get one return value, get more return key->value object
     */
    get(key){
        if(_.toArray(arguments).length > 1)
            key = _.toArray(arguments);
        if(_.isArray(key)){
            let res = {};
            for(let k of key){
                res[k] = this['_cabinet_' + k];
            }
            return res;
        }else{
            return this['_cabinet_' + key];
        }
    }

    clear(key){
        if(this[key]){
            delete  this['_cabinet_' + key];
        }
    }

    init(dbc, options){
        let opt = _.pick(_.omit(options, v => !v), 'id', 'session');
        if(_.isEmpty(opt))
            return Promise.reject({code: 'invalid_params', message: 'player verify fail， params: ' + JSON.stringify(options)});
        return UserModel.get(dbc, opt).then(user => {
            this._status = 'auth';
            if(!_.isEmpty(user)){
                if(user.status !== 1)
                    return Promise.reject({code: 'invalid_user', message: 'user is not active on player.init'});
                return Promise.resolve(this._user = user);
            }
            return Promise.reject({code: 'unknown_session', message: 'Empty user by options: ' + JSON.stringify(options) + ' on player.init'});
        });
    }

    _load(dbc, options){
        return this.init(dbc, {id: this._user.id, session: this._user.session})
            .then(() => {
                return this.loadWallet(dbc, options);
            })
            .then(() => {
                return this.loadAgency(dbc, options);
            });
    }

    loadWallet(dbc, options){
        return Wallet.get(dbc, {userId: this._user.id, pType: options.pType, name: options.walletType || 'main'}).then(wallet => {
            if (_.isEmpty(wallet))
                return Promise.reject({code: 'insufficient_fund', message: 'cat not get wallet on user.load'});

            Promise.resolve(this._wallet = wallet);
        });
    }

    loadAgency(dbc, options){
        // return Agency.get(dbc, {agencyId: this._user.agencyid}).then(agency => {
        //     if (_.isEmpty(agency))
        //         return Promise.reject({code: 'invalid_params', message: 'cat not get agency by user_agencyid on user.reload'});

        //     this._agency = agency;
        //     let poolAgentId = (agency['follow_top_agentpool'] === 'Y'  && agency['top_agencyid'] <= 0) ? agency.id : agency['top_agencyid'];

        //     if ((options.agentId === 0 && options.topAgentId === agency['top_agencyid']) || poolAgentId === options.poolAgentId) {
        //         let structure = typeof agency['upline_structure'] === 'string' ? agency['upline_structure'].split(',') : [];
        //         structure.push(agency.id);
        //         return AgencySuspend.getCount(dbc, structure);
        //     } else
        //         return Promise.reject({code: 'agent_suspended', message: 'agency is not active on user.load'});
        // }).then(count => {
        //     if (count > 0)
        //         return Promise.reject({code: 'agent_suspended', message: 'there are agency suspend on user.load'});
        //     else
                return Promise.resolve(0);
        // });
    }

    /**
     * player start game
     * @param dbc
     * @param options
     * @returns {Promise.<TResult>|*}
     */
    open(dbc, options){
        let match = _.pick(options, 'gameId', 'tableId', 'pType');
        _.extend(match, {
            agentId: this._user.agencyid,  userId: this.id, userType: this._user.type,
            clientIp: options.ip, bonusId: 0,  mType: "N", openBal: 1, betTotal: 0, winAmt: 0,
            payout: 0, refund: 0, balance: 0, state: 'play', jType: 0, jAmt: 0,
            updated: new Date(), created: new Date()
        });

        return this._load(dbc, options).then(() =>
            MatchMasterModel.add(dbc, match).then(result => {
                if (result.insertId) {
                    this._matchId = result.insertId;
                    return Promise.resolve({status: 'ok', id: this.id});
                } else {
                    return Promise.reject({code: 'unexpected_error', message: `user id: ${this.id } add match error on player.open`});
                }
            })
        ).catch(err => {
            return Promise.resolve({status: 'fail', id: this.id, error: err});
        });
    }

    /**
     * player close game
     * @returns {*}
     */
    close(dbc, options){
        if (!this._matchId)
            return Promise.reject({code: 'invalid_call', message: 'invalid match master id on player.close'});

        let data = {
            balance: this.balance,
            // refund: common.tonumber(matchmasterModel.refund, 4),
            // betTotal: common.tonumber(bettotal, 4),
            // winAmt: common.tonumber(winamt, 4),
            // payout: common.tonumber((matchmasterModel.refund + winamt - bettotal), 4),
            state: "done"
        };
        return MatchMasterModel.update(dbc, {id: this._matchId}, data).then(() => {
            let data = {
                gameId: options.gameId,
                userId: this.id,
                agentId: options.agentId,
                matchId: this._matchId
            };
            let result = {};
            // result.payout = common.tonumber((matchmasterModel.refund + winamt - bettotal), 4)
            result.gamematchid = options.gamematchid;
            result.tableindex = options.tableindex;
            data.result = JSON.stringify(result);

            return MatchResultModel.add(dbc, data);
        }).then(() => {
            // let matchmasterModel = request.propertyget('match.master');
            // let matchresultModel = request.propertyget('match.result');
            // let bettotal = common.tonumber(matchmasterModel.bettotal);
            // let totalwin = common.tonumber(matchmasterModel.winamt);
            // let totalrefund = common.tonumber(matchmasterModel.refund);
            // let jtype = common.tonumber(matchmasterModel.jtype);
            // let jamt = common.tonumber(matchmasterModel.jamt);
            return Member.get(dbc, {userId: this.id}).then(member => {
                if (_.isEmpty(member))
                    return Promise.resolve();

                return MemberTrx.add(dbc, member);
            });
        });
    }

    /**
     * lock player action
     * @param action
     * @returns {*}
     */
    lock(action){
        if(this._actions.has(action)){
            return Promise.reject({code: 'lock_error', message: 'player is operating: ' + action});
        }
        this._actions.add(action);
        return Promise.resolve();
    }

    /**
     * unlock player operate
     * @param action        unlock action
     * @returns {Promise.<T>}
     */
    unlock(action){
        this._actions.delete(action);
        return Promise.resolve(this);
    }

    verify(action){
        if(STATUS[action] && STATUS[action] <= STATUS[this._status])
            return Promise.reject({code: 'verify_error', message: `verify player action: ${action} error, player status is: ${this._status}`});
        return  Promise.resolve();
    }
}

module.exports = Player;