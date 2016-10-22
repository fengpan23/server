/**
 * Created by fp on 2016/10/21.
 */

const Seat = require('../model/seat');

class Seats {
    constructor() {
        this._seats = {};
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

                    this._seats[seat.index] = 'empty';
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
}

module.exports = Seats;