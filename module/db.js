/**
 * Created by fp on 2016/10/13.
 */
"use strict";
const Log = require('log')();

const Mysql = require('mysql');
const db = require('../libs/db');

class DB {
    constructor(options) {
        this._cluster = Mysql.createPoolCluster(options.cluster);
        for (var name in options.nodes)
            this._cluster.add(name, options.nodes[name]);

        this._cluster.on('remove', id => {
            Log.error('Mysql cluster error, removed node ' + id); // nodeId = SLAVE1
        });
    }

    begin() {
        return new Promise((resolve, reject) => {
            this.getConnection().then(dbc => {
                this.query(dbc, "SET AUTOCOMMIT=0").then(() => {
                    dbc.beginTransaction(err => err ? reject(err) : resolve(dbc));
                }).catch(err => {
                    this.destroy(dbc);
                    reject(err);
                });
            }).catch(reject);
        });
    }


    over(dbc){
        return db.commit(dbc).then(success => {
            return success ? Promise.resolve(db.destroy(dbc)) : Promise.reject('db commit fail, please try again later');
        });
    }


    close(dbc){
        return db.rollback(dbc).then(success => {
            return success ? Promise.resolve(db.destroy(dbc)) : Promise.reject('db close fail, please try again later');
        });
    }


    query(dbc, sql) {
       return db.query(dbc, sql);
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            this._cluster.getConnection((err, conn) => {
                err ? reject(err) : resolve(conn);
            });
        });
    }

    end() {
        return new Promise((resolve, reject) => {
            this._cluster.end(err => {
                err ? reject(err) : resolve();
            });
        });
    }

}
module.exports = DB;