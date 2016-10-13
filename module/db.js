/**
 * Created by fp on 2016/10/13.
 */
//数据库集�?
"use strict";
const config = require('./../../utils/config.js');

const Mysql = require('mysql');

class DB {
    constructor() {
        let me = this;
        let dbclusterconf = config.commonconf().dbcluster;
        let dbconf = config.envconf().db;

        this._cluster = Mysql.createPoolCluster(dbclusterconf.cluster);

        if (dbconf.hasOwnProperty('nodes') && !common.empty(dbconf.nodes) && typeof(dbconf.nodes) === 'object')
            for (var name in dbconf.nodes)
                this.dbcluster.add(name, dbconf.nodes[name]);
        me.dbcluster.on('remove', function (nodeid) {
            setTimeout(function(){
                let _dbconf = config.envconf().db;
                if (typeof(_dbconf.nodes) === 'object' && _dbconf.nodes.hasOwnProperty(nodeid)){
                    me.dbcluster.add(nodeid, _dbconf.nodes[nodeid]);
                    syslog.log('Mysql Node reload, reload node ' + nodeid);
                }
            }, config.commonconf().settimeout.reloaddbnode);
            syslog.error('Mysql Node error, removed node ' + nodeid); // nodeId = SLAVE1
        });
    }

    begin() {
        return new Promise((resolve, reject) => {
            this.getConnection()
            .then(dbc => {
                this.query(dbc, "SET AUTOCOMMIT=0").then(() => {
                    dbc.beginTransaction(err => err ? reject(err) : resolve(dbc));
                }).catch(err => {
                    this.destroy(dbc);
                    reject(err);
                });
            }).catch(reject);
        });
    }

    query(dbc, sql) {
        let params = common.get_parameter(arguments, ['connection', 'sql']);
        let me = this;
        let _query = function (dbc, sql) {
            return new Promise(function (_res, _rej) {
                let select = sql.toUpperCase().startsWith('SELECT')

                dbc.query(sql, function (err, result) {
                    me.lastquery = params.sql;
                    if (err)
                        _rej(err);
                    else
                        _res(result);
                });
            });
        };
        let _timeout = function (ms) {
            return new Promise(function (_res, _rej) {
                setTimeout(function () {
                    _res();
                }, ms)
            });
        };

        return new Promise((resolve, reject) => {
            let isNew = false;
            Promise.resolve().then(() => {
                if (dbc && typeof dbc === 'object' && typeof (dbc.query) === 'function') {
                    return Promise.resolve(dbc);
                }else{
                    isNew = true;
                    return this.begin();
                }
            }).then(_dbc => {
                dbc = _dbc;
                return _query(dbc, sql);
            }).then(result => {
                if (isNew === true) {
                    return this.commit(dbc).then(() => {
                        this.destroy(dbc);
                        return resolve(result);
                    });
                } else
                    return resolve(result);
            }).catch(err => {
                if (isNew === true) {
                    this.rollback(dbc).then(() => {
                        this.destroy(dbc);
                        reject(err);
                    });
                } else
                    reject(err);
            });
        })
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            this._cluster.getConnection((err, conn) => {
                err ? reject(err) : resolve(conn);
            });
        });
    }


    end() {
        let me = this;
        return new Promise(function (resolve, reject) {
            me.dbcluster.end(function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        })
    }

}

module.exports = new DB();