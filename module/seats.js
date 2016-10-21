/**
 * Created by fp on 2016/10/21.
 */

const Seat = require('../model/seat');

class Seats {
    constructor(options) {
        this._seat = {};
    }

    init(dbc, table){
        return Seat.find(dbc, {tableId: table.id}).then(seats => {
            let updateindex = [];
            let insertindex = [];

            if (reload) {
                seats.forEach(function (seat) {
                    if (seats[seat.index] == 'empty' && seat.state !== 'idle')
                        updateindex.push(seat.index);
                });
            } else {
                seats.forEach(seat => {
                    if (seat.state !== 'idle' || seat.kioskid !== null || seat.agentid !== table.agentid || seat.gameid !== table.gameid || seat.roomid !== table.roomid)
                        updateindex.push(seat.index);
                    seats[seat.index] = 'empty';
                });
                let fields = ['index', 'agentid', 'gameid', 'roomid', 'tableid', 'state', 'kioskid', 'updated', 'created'];
                let data = [];
                let dbnow = common.datetimezoneformat(new Date(), configs.envconf().timezone);
                for (let i = 1; i <= table.maxkiosk; i++) {
                    if (seats[i] != 'empty') {
                        insertindex.push(i);

                        insertindex.forEach(function (index) {
                            data.push([i, table.agentid, table.gameid, table.roomid, table.tableid, 'idle', null, dbnow, dbnow]);
                        });
                        allarray.push(Seat.insert(dbc, fields, data));
                        seats[i] = 'empty';
                    }
                }
            }

            let allarray = [];
            if (updateindex.length > 0) {//重置座位
                let data = {
                    agentid: table.agentid,
                    gameid: table.gameid,
                    roomid: table.roomid,
                    state: 'idle',
                    kioskid: null,
                    ip: '0.0.0.0',
                    port: 0
                };
                allarray.push(seatmodel.updateseat(dbc, {tableid: tableid, seatindex: {IN: updateindex}}, data));
            }
            if (insertindex.length > 0) {//插入座位

            }
        });
    }
}
module.exports = Seats;