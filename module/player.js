/**
 * Created by fengpan on 2016/10/22.
 */
const _ = require('underscore');
const Kiosk = require('../model/kiosk');
const Agency = require('../model/agency');
const AgencySuspend = require('../model/agency_suspend');
const Wallet = require('../model/kiosk_wallet');

const STATUS = {new: 0, auth: 1, init: 3, login: 5, seat: 7, quit: 11};

class Player {
    constructor(clientId) {
        this._clientId = clientId;

        this._actions = new Set();
        this._status = 'new';
    }
    get id(){
        return this._kiosk &&　this._kiosk.id
    }
    get kiosk(){
        return Object.assign({}, this._kiosk);
    }
    get username(){
        let agencyName = this._agency.username;
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

    load(dbc, options){
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