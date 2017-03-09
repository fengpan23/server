/**
 * Created by fp on 2016/10/21.
 */
const _ = require('underscore');
const Util = require('../libs/util');
const SeatModel = require('../model/game_seat');

class Seats {
    constructor() {
        this._seats = new Map();
    }
    get seat(){
        let s = {};
        this._seats.forEach((v, k) => s[k] = v);
        return s;
    }

    /**
     * check this seats has player id
     * @param id    kiosk id
     * @returns {boolean}
     */
    has(id){
        for (let v of this._seats.values()) {
            if (v.kioskId === id) return true;
        }
        return false;
    }

    init(dbc, table){
        return SeatModel.find(dbc, {tableId: table.id}).then(seats => {
            seats.forEach(seat => {
                this._seats.set(seat.index, {status:　'empty'});
            });

            //update seat status
            let data = {gameId: table.gameId, status: 'idle', userId: null, userIp: '0.0.0.0', userPort: 0};
            return SeatModel.update(dbc, {tableId: table.id}, data);
        });
    }

    /**
     * @param dbc
     * @param opt {object}
     *        kiosk:    player info         玩家信息
     *        index:    choose seat index   玩家选择的座位
     *        adjust:   adjust seat         在座位被抢时是否调剂
     * @return {Promise.<*>}
     */
    choose(dbc, opt){
        let seatIndex;
        if(this._seats.has(opt.index) && this._seats.get(opt.index).status === 'empty'){
            seatIndex = opt.index;
            this._seats.set(seatIndex, {status: 'occupy', kioskId: opt.kioskId});
        }else if(!opt.index || opt.adjust){
            for (let [k, v] of this._seats) {
                if (v.status === 'empty') {
                    this._seats.set(k, {status: 'occupy', kioskId: opt.kioskId});
                    seatIndex = +k;
                    break;
                }
            }
        }

        if(!seatIndex)
            return Promise.reject({code: 'invalid_action', message: opt.index ? 'seat: ' + opt.index + ' has already be sit.' : 'have no seat to choose.'});

        let params = _.pick(opt, 'tableId', 'gameId');
        params.index = seatIndex;

        let data = _.pick(opt, 'kioskId', 'ip', 'port');

        return SeatModel.update(dbc, params, data).then(() => {
            this._seats.set(seatIndex, {status: 'seated', kioskId: opt.kioskId, remote: _.pick(opt, 'ip', 'port')});
            let cur = 0;
            for (let v of this._seats.values())
                if(v.status !== 'empty')cur++;

            return Promise.resolve({index: seatIndex, cur: cur});
        });
    }

    /**
     * leave seat
     * @param dbc
     * @param opt   {Object}    {index: Number}
     * @returns {*|Promise.<TResult>}
     */
    leave(dbc, opt){
        if(!this._seats.has(opt.index))
            return Promise.reject({code: 'invalid_call', message: 'error seat index: ' + opt.index});

        let data = {state: 'idle', kioskId: null, ip: '0.0.0.0', port: 0};
        return SeatModel.update(dbc, opt, data).then(() => {
            this._seats.set(opt.index, {status: 'empty'});
            let cur = 0;
            for (let v of this._seats.values())
                if(v.status !== 'empty')cur++;

            return Promise.resolve(cur);
        });
    }
}

module.exports = Seats;