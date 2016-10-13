/**
 * Created by fp on 2016/10/13.
 */

const db = require('../libs/db');

class Table{
    constructor(){
        this._table = {};
    }

    load(){
        db.load().then(table => {
            this._table = table;
        }).catch();
    }
}

module.exports = Table;