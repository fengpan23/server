/**
 * Created by fengpan on 2016/10/22.
 */
const _ = require('underscore');
const Kiosk = require('../model/kiosk');
const STATUS = {init: 1, login: 3, seat: 5};

class Player {
    constructor(clientId) {
        this.clientId = clientId;

        this._actions = new Set();
        this._status = 'init';
    }

    get status(){
        return this._status;
    }

    init(dbc, session){
        //TODO: if this._kiosk had id ???
        // return Kiosk.get(dbc, {session: session}).then(kiosk => {
        return Kiosk.get(dbc, {id: 205}).then(kiosk => {
            this._status = 'login';
            if(kiosk){
                if(kiosk.status !== 1)
                    return Promise.reject('invalid_user, kiosk is not active on player.init');

                return Promise.resolve(this._kiosk = kiosk);
            }
            return Promise.reject('unknown_session, cat not get kiosk by session on player.init');
        });
    }

    // /**
    //  * set value to client
    //  * @param key   {String}
    //  * @param value {*}
    //  * @return Boolean
    //  */
    // set(key, value){
    //     if(key){
    //         if(typeof key === 'object'){
    //             for(let k in key){
    //                 this.set(k, key[k]);
    //             }
    //         }else{
    //             this._client[key] = value;
    //         }
    //         return true;
    //     }
    //     return false;
    // }
    //
    // /**
    //  * get before set value
    //  * @param key   {String}
    //  */
    // get(key){
    //     return this._client[key];
    // }

    set(key, value){
        this[key] = value;
    }

    get(key){
        if(_.isEmpty(this._kiosk))
            return new Error('player not init');
        let result;
        switch (key){
            case 'username':
                result = this._kiosk.username;
                break;
            case 'kiosk':
                result = Object.assign({}, this._kiosk);
                break;
            case 'point':
                result = this._kiosk['balance_a'];
                break;
        }
        return this['_' + key];
    }

    /**
     * lock player action
     * @param action
     * @returns {*}
     */
    lock(action){
        if(this._actions.has(action)){
            return Promise.reject('player is operating: ' + action);
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
        if(STATUS[action] <= STATUS[this.status])
            return Promise.reject(`verify action: ${action} error, player status: ${this.status}`);
        return  Promise.resolve();
    }
}

module.exports = Player;