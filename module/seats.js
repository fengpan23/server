/**
 * Created by fp on 2016/10/21.
 */
const _ = require('underscore');
const Util = require('../libs/util');
const Seat = require('../model/seat');

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

    init(dbc, table, reload){
        return Seat.find(dbc, {tableId: table.id}).then(seats => {
            let all = [];
            let updateIndex = [];

            if (reload) {
                seats.forEach(function (seat) {
                    if (seats[seat.index] == 'empty' && seat.state !== 'idle')
                        updateIndex.push(seat.index);
                });
            } else {
                seats.forEach(seat => {
                    if (seat.state !== 'idle' || seat.kioskid !== null || seat.agentid !== table.agentid || seat.gameid !== table.gameid || seat.roomid !== table.roomid)
                        updateIndex.push(seat.index);

                    this._seats.set(seat.index, {status:　'empty'});
                });

                let insert = [];
                let now = Util.formatDate(new Date(), process.env.TIMEZONE);

                for (let i = 1; i <= table.maxkiosk; i++) {
                    if (_.isEmpty(seats[i - 1])) {
                        insert.push([i, table.agentid, table.gameid, table.roomid, table.id, 'idle', 0, now, now]);
                        this._seats.set(i, {status: 'empty'});
                    }
                }
                let fields = ['index', 'agentId', 'gameId', 'roomId', 'tableId', 'state', 'kioskId', 'updated', 'created'];
                insert.length > 0 && all.push(Seat.insert(dbc, fields, insert));
            }

            if (updateIndex.length > 0) {       //重置座位
                let data = {gameId: table.gameid, roomId: table.roomid, state: 'idle', kioskId: null, ip: '0.0.0.0', port: 0};
                all.push(Seat.update(dbc, {tableId: table.id, index: {IN: updateIndex}}, data));
            }
            return Promise.all(all);
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

        return Seat.update(dbc, params, data).then(() => {
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
        return Seat.update(dbc, opt, data).then(() => {
            this._seats.set(opt.index, {status: 'empty'});
            let cur = 0;
            for (let v of this._seats.values())
                if(v.status !== 'empty')cur++;

            return Promise.resolve(cur);
        });
    }
}

module.exports = Seats;