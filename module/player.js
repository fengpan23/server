/**
 * Created by fengpan on 2016/10/22.
 */
const _ = require('underscore');
const Kiosk = require('../model/kiosk');
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
    get username(){
        return this._kiosk.username;
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

    init(dbc, options){
        let opt = _.pick(_.omit(options, v => !v), 'id', 'session');
        if(_.isEmpty(opt))
            return Promise.reject({code: 'invalid_params', message: options});
        return Kiosk.get(dbc, opt).then(kiosk => {
            this._status = 'auth';
            if(kiosk){
                if(kiosk.status !== 1)
                    return Promise.reject({code: 'invalid_user', message: 'kiosk is not active on player.init'});
                return Promise.resolve(this._kiosk = kiosk);
            }
            return Promise.reject({code: 'unknown_session', message: 'cat not get kiosk by session on player.init'});
        });
    }

    set(key, value){
        this[key] = value;
    }

    get(key){
        if(_.isEmpty(this._kiosk))
            return new Error('player not init');
        let result;
        switch (key){
            case 'kiosk':
                result = Object.assign({}, this._kiosk);
                break;
            case 'point':
                result = this._kiosk['balance_a'];
                break;
        }
        return result || this['_' + key];
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