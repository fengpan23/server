/**
 * Created by fengpan on 2016/10/22.
 */
const _ = require('underscore');
const Kiosk = require('../model/kiosk');
const Agency = require('../model/agency');
const Member = require('../model/kiosk_member');
const MemberTrx = require('../model/member_trx');
const MatchMaster = require('../model/match_master');
const MatchResult = require('../model/match_result');
const AgencySuspend = require('../model/agency_suspend');
const Wallet = require('../model/kiosk_wallet');

const STATUS = {new: 0, auth: 1, init: 3, login: 5, seat: 7, open: 9, quit: 11};

class Player {
    constructor(clientId) {
        this._clientId = clientId;

        this._actions = new Set();
        this._status = 'new';
    }
    get id(){
        return this._kiosk &&　this._kiosk.id
    }
    get matchId(){      //玩家开场之后产生 match id
        return this._matchId;
    }
    get kiosk(){
        return Object.assign({}, this._kiosk);
    }
    get agency(){
        return Object.assign({}, this._agency);
    }
    get username(){
        let agencyName = this.agency.username;
        let name = this._kiosk.username || 'anonymous';
        if (name.startsWith(agencyName))
            name = name.substr(agencyName.length);
        else if (name !== 'anonymous' && name.length > 4)
            name = name.substr(-4);
        return name;
    }
    get balance(){
        return this._kiosk && this._kiosk['balance_a'];
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

    set(key, value){
        this[key] = value;
    }

    get(key){
        if(_.isEmpty(this._kiosk))
            return new Error('player not init');
        let result;
        switch (key){
            case 'point':
                result = this._kiosk['balance_a'];
                break;
        }
        return result || this['_' + key];
    }

    init(dbc, options){
        let opt = _.pick(_.omit(options, v => !v), 'id', 'session');
        if(_.isEmpty(opt))
            return Promise.reject({code: 'invalid_params', message: 'player init options: ' + JSON.stringify(options)});
        return Kiosk.get(dbc, opt).then(kiosk => {
            this._status = 'auth';
            if(!_.isEmpty(kiosk)){
                if(kiosk.status !== 1)
                    return Promise.reject({code: 'invalid_user', message: 'kiosk is not active on player.init'});
                return Promise.resolve(this._kiosk = kiosk);
            }
            return Promise.reject({code: 'unknown_session', message: 'Empty kiosk by options: ' + JSON.stringify(options) + ' on player.init'});
        });
    }

    _load(dbc, options){
        return this.init(dbc, {id: this._kiosk.id, session: this._kiosk.session})
            .then(() => {
                return this.loadWallet(dbc, options);
            })
            .then(() => {
                return this.loadAgency(dbc, options);
            });
    }

    loadWallet(dbc, options){
        return Wallet.get(dbc, {kioskId: this._kiosk.id, pType: options.pType, name: options.walletType || 'main'}).then(wallet => {
            if (_.isEmpty(wallet))
                return Promise.reject({code: 'insufficient_fund', message: 'cat not get wallet on kiosk.load'});

            Promise.resolve(this._wallet = wallet);
        });
    }

    loadAgency(dbc, options){
        return Agency.get(dbc, {agencyId: this._kiosk.agencyid}).then(agency => {
            if (_.isEmpty(agency))
                return Promise.reject({code: 'invalid_params', message: 'cat not get agency by kiosk_agencyid on kiosk.reload'});

            this._agency = agency;
            let poolAgentId = (agency['follow_top_agentpool'] === 'Y'  && agency['top_agencyid'] <= 0) ? agency.id : agency['top_agencyid'];

            if ((options.agentId === 0 && options.topAgentId === agency['top_agencyid']) || poolAgentId === options.poolAgentId) {
                let structure = typeof agency['upline_structure'] === 'string' ? agency['upline_structure'].split(',') : [];
                structure.push(agency.id);
                return AgencySuspend.getCount(dbc, structure);
            } else
                return Promise.reject({code: 'agent_suspended', message: 'agency is not active on kiosk.load'});
        }).then(count => {
            if (count > 0)
                return Promise.reject({code: 'agent_suspended', message: 'there are agency suspend on kiosk.load'});
            else
                return Promise.resolve(count);
        });
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
            agentId: this._kiosk.agencyid,  kioskId: this.id, kioskType: this._kiosk.type,
            clientIp: options.ip, bonusId: 0,  mType: "N", openBal: 1, betTotal: 0, winAmt: 0,
            payout: 0, refund: 0, balance: 0, state: 'play', jType: 0, jAmt: 0,
            updated: new Date(), created: new Date()
        });

        return this._load(dbc, options).then(() =>
            MatchMaster.add(dbc, match).then(result => {
                if (result.insertId) {
                    this._matchId = result.insertId;
                    return Promise.resolve({status: 'ok', id: this.id});
                } else {
                    return Promise.reject({code: 'unexpected_error', message: `kiosk id: ${this.id } add match error on player.open`});
                }
            })
        ).catch(err => {
            return Promise.resolve({status: 'fail', id: this._id, error: err});
        });
    }

    /**
     * player close game
     * @returns {*}
     */
    close(dbc){
        if (!this._matchId)
            return Promise.reject({code: 'invalid_call', message: 'invalid match master id on player.close'});

        let data = {
            balance: this.balance,
            refund: common.tonumber(matchmaster.refund, 4),
            betTotal: common.tonumber(bettotal, 4),
            winAmt: common.tonumber(winamt, 4),
            payout: common.tonumber((matchmaster.refund + winamt - bettotal), 4),
            state: "done"
        };
        return MatchMaster.update(dbc, {id: this._matchId}, data).then(() => {
            let data = {
                gameid: matchmaster.gameid,
                kioskid: request.propertyget('kiosk').kiosk_id,
                agentid: matchmaster.agentid,
                matchid: matchmaster.id
            };
            let result = {};
            result.payout = common.tonumber((matchmaster.refund + winamt - bettotal), 4)
            result.gamematchid = table.matchid;
            result.tableindex = table.index;
            data.result = JSON.stringify(result);

            return MatchResult.add(dbc, data);
        }).then(() => {
            let matchmaster = request.propertyget('match.master');
            let matchresult = request.propertyget('match.result');
            let bettotal = common.tonumber(matchmaster.bettotal);
            let totalwin = common.tonumber(matchmaster.winamt);
            let totalrefund = common.tonumber(matchmaster.refund);
            let jtype = common.tonumber(matchmaster.jtype);
            let jamt = common.tonumber(matchmaster.jamt);

            return Member.get(dbc, this._kiosk).then(member => {
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