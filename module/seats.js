/**
 * Created by fp on 2016/10/21.
 */
const _ = require('underscore');
const Seat = require('../model/seat');

class Seats {
    constructor() {
        this._seats = new Map();
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

                    this._seats.set(seat.index, 'empty');
                });

                let insert = [];
                let fields = ['index', 'agentid', 'gameid', 'roomid', 'tableid', 'state', 'kioskid', 'updated', 'created'];
                // let now = common.datetimezoneformat(new Date(), configs.envconf().timezone);
                let now = +new Date();

                for (let i = 1; i <= table.maxkiosk; i++) {
                    if (seats[i] != 'empty') {
                        insert.push([i, table.agentid, table.gameid, table.roomid, table.tableid, 'idle', null, now, now]);
                        this._seats[i] = 'empty';
                    }
                }
                insert.length > 0 && all.push(Seat.insert(dbc, fields, insert));
            }


            if (updateIndex.length > 0) {//重置座位
                let data = {gameid: table.gameid, roomid: table.roomid, state: 'idle', kioskid: null, ip: '0.0.0.0', port: 0};
                all.push(Seat.update(dbc, {tableId: table.id, seatIndex: {IN: updateIndex}}, data));
            }

            return Promise.all(all).then(() => Promise.resolve(this._seats));
        });
    }

    /**
     * @param dbc
     * @param options
     *        kiosk:    player info         玩家信息
     *        index:    choose seat index   玩家选择的座位
     *        adjust:   adjust seat         在座位被抢时是否调剂
     * @return {Promise.<TResult>}
     */
    choose(dbc, opt){
        let seatIndex;
        if(this._seats.get(opt.index) === 'empty'){
            seatIndex = opt.index;
            this._seats.set(opt.index, 'occupy');
        }else if(!opt.index || opt.adjust){
            for (let [k, v] of this._seats) {
                if (v === 'empty') {
                    this._seats.set(k, 'occupy');
                    seatIndex = +k;
                    break;
                }
            }
        }

        if(!seatIndex)
            return Promise.reject(opt.index ? 'seat: ' + opt.index + ' has already be sit.' : 'have no seat to choose.');

        let params = _.pick(opt, 'gameid', 'tableid');
        params.seatindex = seatIndex;

        let data = _.pick(opt, 'kiosk_id', 'ip', 'port');
        data.state = 'seating';

        return Seats.update(dbc, params, data).then(() => {
            let cur = 0;
            for (let v of this._seats.values())
                if(v !== 'empty')cur++;

            return Promise.resolve(cur);
        });
    }
}

module.exports = Seats;