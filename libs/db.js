/**
 * Created by fp on 2016/10/13.
 */

"use strict";
const mysql = require('mysql');
const cluster = require('./../server/lib/dbcluster.js');

class db {
    constructor() {
    }


    query() {
        let params = common.get_parameter(arguments, ['connection', 'sql']);
        let me = this;
        let _query = function (dbc, sql) {
            return new Promise(function (_res, _rej) {
                dbc.query(sql, function (err, result, fields) {
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
        return new Promise(function (resolve, reject) {
            let start = get_microtime();
            let dbc = params.connection;
            let isnew = false;
            let isselect = false;
            Promise.resolve().then(function () {
                if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.query) === 'function')
                    return Promise.resolve(dbc);
                else {
                    isnew = true;
                    return me.begin();
                }
            }).then(function (_dbc) {
                dbc = _dbc;
                if (params.sql.toUpperCase().startsWith('SELECT'))
                    isselect = true;
                return _query(dbc, params.sql);
            }).then(function (result) {
                if (isselect && common.empty(result)) {
                    return _timeout(100).then(function () {
                        return _query(dbc, params.sql);
                    });
                } else
                    return Promise.resolve(result);
            }).then(function (result) {
                if (isselect && common.empty(result)) {
                    return _timeout(100).then(function () {
                        return _query(dbc, params.sql);
                    });
                } else
                    return Promise.resolve(result);
            }).then(function (result) {
                if (isnew === true) {
                    return me.commit(dbc).then(function () {
                        me.destroy(dbc);
                        return Promise.resolve(result);
                    });
                } else
                    return Promise.resolve(result);
            }).then(function (result) {
                me.elapsedms = get_elapsedms(start);
                //console.log(me.lastquery, `last:${me.elapsedms}`);
                resolve(result);
            }).catch(function (err) {
                me.elapsedms = get_elapsedms(start);
                sql_error(err, params.sql);
                if (isnew === true) {
                    me.rollback(dbc).then(function () {
                        me.destroy(dbc);
                        reject(err);
                    });
                } else
                    reject(err);
            });
        })
    }

    cell() {
        let me = this;
        let params = common.get_parameter(arguments, ['connection', 'table', 'column', 'condition', 'order', 'offset', 'group', 'having']);
        if (common.empty(params.table))
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.cell'));
        else
            return new Promise(function (resolve, reject) {
                if (typeof (params.column) === 'object')
                    params.column = common.first(params.column).value;
                params.offset = common.tonumber(params.offset);
                let limit = common.empty(params.offset) ? 1 : {limit: 1, offset: params.offset};
                me.query(params.connection, get_selectsql(params.table, params.column, params.condition, params.order,
                    limit, params.group, params.having)).then(function (result) {
                    resolve(common.first(result[0]).value);
                }).catch(function (err) {
                    reject(err);
                });
            });
    }

    sum() {
        let args = Array.prototype.slice.call(arguments);
        if (args.length > 2) {
            if (typeof (args[2]) === 'object')
                args[2] = common.first(args[2]).value;
            args[2] = "{DB_SUM}" + args[2];
            return this.cell.apply(this, args);
        }
    }

    count() {
        let args = Array.prototype.slice.call(arguments);
        if (args.length > 2) {
            if (typeof (args[2]) === 'function') {
                args.push(args[2]);
                args[2] = "*";
            }
            if (typeof (args[2]) === 'object')
                args[2] = common.first(args[2]).value;
            args[2] = "{DB_COUNT}" + args[2];
            return this.cell.apply(this, args);
        }
    }

    one() {
        let me = this;
        let params = common.get_parameter(arguments, ['connection', 'table', 'column', 'condition', 'order', 'offset', 'group', 'having']);
        if (common.empty(params.table)) {
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.one'));
        } else {
            return new Promise(function (resolve, reject) {
                params.offset = common.tonumber(params.offset);
                var limit = common.empty(params.offset) ? 1 : {limit: 1, offset: params.offset};
                me.query(params.connection, get_selectsql(params.table, params.column,
                    params.condition, params.order, limit, params.group, params.having)).then(function (result) {
                    resolve(result[0]);
                }).catch(function (err) {
                    reject(err);
                })
            });
        }
    }

    oneforupdate() {
        let me = this;
        let params = common.get_parameter(arguments, ['connection', 'table', 'column', 'condition', 'order', 'offset', 'group', 'having']);
        if (common.empty(params.table)) {
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.one'));
        } else {
            return new Promise(function (resolve, reject) {
                params.offset = common.tonumber(params.offset);
                var limit = common.empty(params.offset) ? 1 : {limit: 1, offset: params.offset};
                me.query(params.connection, get_selectsql(params.table, params.column,
                        params.condition, params.order, limit, params.group, params.having) + ' for update').then(function (result) {
                    resolve(result[0]);
                }).catch(function (err) {
                    reject(err);
                })
            });
        }
    }

    onerow() {
        let me = this;
        let params = common.get_parameter(arguments, ['connection', 'table', 'column', 'condition', 'order', 'offset', 'group', 'having']);
        if (common.empty(params.table)) {
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.onerow'));
        } else {
            return new Promise(function (resolve, reject) {
                params.offset = common.tonumber(params.offset);
                var limit = common.empty(params.offset) ? 1 : {limit: 1, offset: params.offset};
                me.query(params.connection, get_selectsql(params.table, params.column, params.condition, params.order,
                    limit, params.group, params.having)).then(function (result) {
                    resolve(common.array_values(result[0]));
                }).catch(function (err) {
                    reject(err)
                });
            });
        }
    }

    select() {
        let me = this;
        let params = common.get_parameter(arguments, ['connection', 'table', 'column', 'condition', 'order', 'limit', 'group', 'having']);
        if (common.empty(params.table))
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.select'));
        else
            return new Promise(function (resolve, reject) {
                me.query(params.connection, get_selectsql(params.table, params.column, params.condition, params.order,
                    params.limit, params.group, params.having)).then(function (result) {
                    resolve(result);
                }).catch(function (err) {
                    reject(err);
                });
            });
    }

    insert() {
        let params = common.get_parameter(arguments, ['connection', 'table', 'data']);
        if (!common.empty(params.table))
            return this.query(params.connection, get_insertsql(params.table, params.data));
        else
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.insert'));
    }

    inserts() {
        let params = common.get_parameter(arguments, ['connection', 'table', 'fields', 'data']);
        if (!common.empty(params.table) && !common.empty(params.fields) && !common.empty(params.data) && common.isarray(params.fields) && common.isarray(params.data)) {
            var sql_inserts = get_inserts_sql(params.table, params.fields, params.data);
            if (sql_inserts !== false)
                return this.query(params.connection, get_inserts_sql(params.table, params.fields, params.data));
            else
                return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.inserts'));
        } else
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.inserts'));
    }

    update() {
        let params = common.get_parameter(arguments, ['connection', 'table', 'data', 'condition', 'order', 'limit']);
        if (!common.empty(params.table) && !common.empty(params.condition))
            return this.query(params.connection, get_updatesql(params.table, params.data, params.condition, params.order, params.limit));
        else
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.update'));
    }

    delete() {
        let params = common.get_parameter(arguments, ['connection', 'table', 'condition', 'order', 'limit']);
        if (!common.empty(params.table) && !common.empty(params.condition))
            return this.query(params.connection, get_deletesql(params.table, params.condition, params.order, params.limit));
        else
            return Promise.reject(new wrong('error', 'invalid_params', 'param invalid on db.delete'));
    }

    rollback(dbc) {
        let me = this;
        return new Promise(function (resolve, reject) {
            if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.rollback) === 'function')
                dbc.rollback(function () {
                    resolve(true);
                });
            else
                resolve(false);
        });
    }

    commit(dbc) {
        let me = this;
        return new Promise(function (resolve, reject) {
            if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.commit) === 'function')
                dbc.commit(function (err) {
                    if (err) {
                        me.rollback(dbc).then(function () {
                            reject(err);
                        });
                    } else
                        resolve(true);
                });
            else
                resolve(false);
        });
    }

    destroy(dbc) {
        if (dbc !== null)
            dbc = close_connection(dbc);
    }
}


const escape = function (value, auto, column) {
        if (typeof(value) !== 'string') value = common.tostring(value);
        var strescape = column === true ? mysql.escapeId(value) : mysql.escape(value);
        return auto === true ? strescape : strescape.substring(1, strescape.length - 1);
    },

    get_microtime = function () {
        return new Date().getTime();
    },

    get_elapsedms = function (start) {
        return (get_microtime() - parseFloat(start)) + ' ms';
    },

    get_colnm = function (dbcolnm, dbcola, alias, dbfnc) {
        var dbcolnow = '',
            regex_db = /^\{DB_([A-Z_]+)\}/i,
            regex_col = /^'(.+)'$/, matches = [],
            regex_iscol = /^`(.)^$/ig;
        if (matches = regex_col.exec(dbcolnm))
            dbcolnow = escape(matches[1], true);
        else {
            if (typeof (dbcolnm) !== 'string')
                dbcolnm = dbcolnm.toString();
            dbcolnm = dbcolnm.replace(/\./g, "`.`");
            if (matches = regex_db.exec(dbcolnm)) {
                switch (matches[1].toUpperCase()) {
                    case 'DISTINCT':
                        dbcolnow = "DISTINCT " + get_colnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'NO_CACHE':
                        dbcolnow = "SQL_NO_CACHE " + get_colnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'HIGH_PRIORITY':
                        dbcolnow = "HIGH_PRIORITY " + get_colnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'LOW_PRIORITY':
                        dbcolnow = "LOW_PRIORITY " + get_colnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'FNC':
                        dbcolnow = get_colnm(dbcolnm.replace(matches[0], ""), null, false, true);
                        break;

                    case 'VAL':
                        dbcolnow = get_colval(dbcolnm.replace(matches[0], ""), dbcolnm);
                        break;

                    case "SUM":
                        dbcolnow = "SUM(" + get_colnm(dbcolnm.replace(matches[0], ""), null, false, false) + ")";
                        break;

                    case "COUNT":
                        dbcolnm = dbcolnm.replace(matches[0], "");
                        dbcolnow = dbcolnm === "*" || dbcolnm === "" ? "COUNT(*)" : "COUNT(" + get_colnm(dbcolnm, null, false, false) + ")";
                        break;

                    case "NOW":
                        dbcolnow = "NOW()";
                        break;

                    case common.inarray(matches[1], common.range('A', 'Z')):
                        dbcolnow = get_colnm(dbcolnm.replace(matches[0], ""), null, false, true);
                        break;
                }
            } else if (dbfnc !== true && !regex_iscol.test(dbcolnm) && dbcolnm !== '*')
                dbcolnow = escape(dbcolnm, true, true);
            else
                dbcolnow = escape(dbcolnm);
            if (alias)
                dbcolnow += (typeof (dbcola) === 'string' && !common.isnumeric(dbcola) ? " AS " + escape(dbcola, true) : "");
        }
        return dbcolnow;
    },

    get_colval = function (dbcolval, dbcolnm) {
        if (dbcolval === null)
            return "NULL";
        else {
            if (typeof (dbcolval) === 'object' || common.isobj(dbcolval))
                dbcolval = JSON.stringify(dbcolval);
            var regex_db = /^\{DB_([A-Z_]+)\}/i, matches = regex_db.exec(dbcolval);
            if (!common.empty(matches)) {
                dbcolval = escape(dbcolval.replace(matches[0], ""));
                switch (matches[1].toUpperCase()) {
                    case 'COL':
                        return get_colnm(dbcolval);

                    case 'FNC':
                        return dbcolval;

                    case "NOW":
                        return "NOW()";

                    case "SUM":
                    case "COUNT":
                        return get_colnm(dbcolval);

                    case "TIME":
                        return "CURRENT_TIME()";

                    case "DATE":
                        return "CURRENT_DATE()";

                    case "INC":
                        dbcolval = parseFloat(dbcolval);
                        return get_colnm(dbcolnm) + " + " + dbcolval;

                    case "DEC":
                        dbcolval = parseFloat(dbcolval);
                        return get_colnm(dbcolnm) + " - " + dbcolval;

                    case "TIMES":
                        dbcolval = parseFloat(dbcolval);
                        return get_colnm(dbcolnm) + " * " + dbcolval;

                    case "DIV":
                        dbcolval = parseFloat(dbcolval);
                        return get_colnm(dbcolnm) + " / " + dbcolval;

                    case "POWER":
                        dbcolval = parseFloat(dbcolval);
                        return get_colnm(dbcolnm) + " ^ " + dbcolval;
                }
            } else
                return escape(dbcolval, true);
        }
    },

    get_cond = function (dname, dvalue, having) {
        var strdbcond = '';
        switch (typeof (dvalue)) {
            case 'object':
                var first = common.first(dvalue),
                    value = first.value,
                    key = first.key,
                    result = [];
                strdbcond = get_colnm(dname, null, null, having);
                switch (key.toUpperCase()) {
                    case "LIST":
                    case "IN":
                        if (typeof (value) === 'object' && !common.empty(value))
                            for (var vkey in value)
                                result.push(escape(value[vkey]));
                        strdbcond += " IN ('" + common.implode("','", result) + "')";
                        break;

                    case "XLIST":
                    case "XIN":
                        if (typeof (value) === 'object' && !common.empty(value))
                            for (var vkey in value)
                                result.push(escape(value[vkey]));
                        strdbcond += " NOT IN ('" + common.implode("','", result) + "')";
                        break;

                    case "BETWEEN":
                        value = common.array_values(value);
                        strdbcond += " BETWEEN " + escape(value[0], true) + " AND " + escape(value[1], true);
                        break;

                    case "XBETWEEN":
                        value = common.array_values($Value);
                        strdbcond += " NOT BETWEEN " + escape(value[0], true) + " AND " + escape(value[1], true);
                        break;

                    default:
                        strdbcond = "";
                }
                break;

            case 'number':
            case "string":
                var regex_db = /^\{DB_([A-Z]+)\}/, operator = " = ", matches = [];
                if (matches = regex_db.exec(dvalue)) {
                    switch (matches[1].toUpperCase()) {
                        case "NE":
                            operator = " != ";
                            break;
                        case "GE":
                            operator = " >= ";
                            break;
                        case "GT":
                            operator = " > ";
                            break;
                        case "LE":
                            operator = " <= ";
                            break;
                        case "LT":
                            operator = " < ";
                            break;
                        case "NNE":
                            operator = " <=> ";
                            break;
                        case "LIKE":
                            operator = " LIKE ";
                            break;
                        case "XLIKE":
                            operator = "NOT LIKE ";
                            break;
                        case "INULL":
                            operator = " IS NULL";
                            break;
                        case "XINULL":
                            operator = " IS NOT NULL";
                            break;
                    }
                    if (operator !== " = ")
                        dvalue = dvalue.replace(matches[0], "");
                }
                strdbcond = get_colnm(dname, null, null, having) + operator;
                strdbcond += operator.substr(operator.length - 1) === " " ? get_colval(dvalue, dname) : "";
                break;

            case 'NULL':
                strdbcond = get_colnm(dname) + " = null";
        }
        return strdbcond;
    },

    get_condition = function (dbcond, having) {
        var sdbcond = '';
        var regex_con = /(`?)([^\W]|[\w\d\-]+)(`?)(\s*)([\>=\<!]|LIKE|IS NOT NULL|IN|NOT IN|BETWEEN|NOT BETWEEN)(\s*)(('([^']*)')|[\d\.]|(\((.*)\))*)/ig;
        if (!common.empty(dbcond)) {
            //if (dbcond !== null && !common.isarray(dbcond) && typeof (dbcond) === 'object')
            //    dbcond = [dbcond];
            if (common.isarray(dbcond)) {
                var regex_op = /^\{DB_(OR|XOR|LB|RB|AND)\}$/i,
                    logic = true,
                    braket = 0,
                    matches = [];
                for (var i in dbcond) {
                    var key = '', value = '';
                    if (typeof (dbcond[i]) === 'string')
                        value = dbcond[i];
                    else if (typeof (dbcond[i]) === 'object' && !common.empty(dbcond[i])) {
                        var first = common.first(dbcond[i]);
                        key = first.key;
                        value = first.value;
                    } else
                        break;
                    matches = regex_op.exec(value);
                    if (typeof (value) === 'string' && !common.empty(matches)) {
                        switch (matches[1].toUpperCase()) {
                            case "OR":
                                sdbcond += " OR ";
                                logic = true;
                                break;

                            case "XOR":
                                sdbcond += " XOR ";
                                logic = true;
                                break;

                            case "LB":
                                sdbcond += (!logic ? " AND " : "") + "(";
                                braket++;
                                break;

                            case "RB":
                                if (braket > 0) {
                                    braket--;
                                    sdbcond += ")";
                                }
                                break;

                            default:
                                sdbcond += " AND ";
                                logic = true;
                                break;
                        }
                    } else {
                        if (!common.empty(key)) {
                            sdbcond += (!logic ? " AND " : "") + get_cond(key, value, having);
                            logic = false;
                        }
                    }
                }
                sdbcond = sdbcond.replace(/(\s+)(AND|OR|XOR|\()(\s+)$/i, "");
                if (braket > 0)
                    for (var i = braket; i > 0; i--)
                        sdbcond += ")";
            } else if (typeof (dbcond) === 'string' && regex_con.test(dbcond))
                sdbcond = dbcond;
        }
        return !common.empty(dbcond) ? (having ? " HAVING " : " WHERE ") + (common.isarray(dbcond) || typeof(dbcond) === 'string' ? sdbcond : "") : "";
    },

    get_colsql = function (dbcol, alias) {
        var sqlcol = "";
        if (typeof (alias) === 'undefined')
            alias = true;
        if (!common.empty(dbcol)) {
            switch (typeof (dbcol)) {
                case 'object':
                    for (var colalies in dbcol)
                        sqlcol += (sqlcol !== "" ? ", " : "") + get_colnm(dbcol[colalies], colalies,
                                alias);
                    break;

                case 'string':
                    sqlcol = get_colnm(dbcol, null, alias);
            }
        }
        return sqlcol;
    },

    get_group = function (group, having) {
        var sqlgroup = get_order(group, true);
        return !common.empty(sqlgroup) ? sqlgroup + get_having(having) : "";
    },

    get_having = function (having) {
        return !common.empty(having) ? get_condition(having, true) : "";
    },

    get_order = function (order, group) {
        var sqlorder = '';
        if (!common.empty(order)) {
            if (order !== null && !common.isarray(order) && typeof (order) === 'object')
                order = [order];
            if (common.isarray(order)) {
                var random = false;
                for (var i in order) {
                    var oname = '', otype = '';
                    if (typeof (order[i]) === 'string') {
                        oname = order[i];
                        if (oname === "RAND()") {
                            otype = oname;
                            oname = '';
                        } else
                            otype = "ASC";
                    } else if (typeof (order[i]) === 'object' && !common.empty(order[i])) {
                        var first = common.first(order[i]);
                        oname = first.key;
                        otype = first.value.toUpperCase();
                        if (otype === '{DB_RAND}')
                            otype = "RAND()";
                        else if (otype !== "DESC" && otype !== "RAND()")
                            otype = "ASC";
                        if (otype === "RAND()")
                            oname = "";
                    } else
                        break;
                    if (oname !== "")
                        oname = get_colnm(oname);
                    sqlorder += (sqlorder !== '' ? ", " : "") + (oname !== '' ? oname + ' ' : '') + otype;
                    if (otype === "RAND()") {
                        random = true;
                        break;
                    }
                }
            } else if (typeof (order) === 'string') {
                if (order.toUpperCase() === "{DB_RAND}" || order.toUpperCase() === "RAND()") {
                    random = true;
                    sqlorder = "RAND()";
                } else
                    sqlorder = get_colnm(order) + " ASC";
            }
            if (group === true && random === true && sqlorder !== '')
                sqlorder = sqlorder.substring(0, sqlorder.length - 8);
        }
        return sqlorder !== '' ? (group === true ? " GROUP BY " : " ORDER BY ") + sqlorder : "";
    },

    get_limit = function (limit) {
        var sqllimit = '';
        if (!common.empty(limit)) {
            var offset = 0, limited = 0;
            switch (typeof (limit)) {
                case "object":
                    if (limit !== null && !common.isarray(limit) && typeof (limit) === 'object')
                        limit = [limit];
                    if (common.isarray(limit)) {
                        limit = common.array_values(limit);
                        var item = 0;
                        limitobj:
                            if (limit.length > 1) {
                                for (var i in limit) {
                                    switch (item) {
                                        case 0:
                                            offset = parseFloat(limit[i]);
                                            break;

                                        case 1:
                                            limited = parseFloat(limit[i]);
                                            break;

                                        default:
                                            break limitobj;
                                    }
                                    item++;
                                }
                            } else
                                limited = parseFloat(limit[0]);
                    } else {
                        if (limit.hasOwnProperty("offset") || limit.hasOwnProperty("OFFSET"))
                            offset = limit.offset || limit.OFFSET;
                        if (limit.hasOwnProperty("limit") || limit.hasOwnProperty("LIMIT"))
                            limited = limit.limit || limit.LIMIT;
                    }
                    break;

                case "string":
                case "number":
                case "boolean":
                    limited = parseInt(limit, 10);
                    break;
            }
        }
        if (limited > 0)
            sqllimit += (sqllimit === '' ? '' : ' ') + "LIMIT " + limited;
        if (offset > 0)
            sqllimit += (sqllimit === '' ? '' : ' ') + "OFFSET " + offset;
        return ' ' + sqllimit;
    },

    get_tablesql = function (table) {
        if (typeof (table) === 'string' && table !== '') {
            //table = table.replace(/\./g, "`.`");
            //table = table.replace(/,/g, "`,`");
            return escape(table, true, true);
        } else
            return "";
    },

    get_deletesql = function (table, condition, order, limit) {
        return "DELETE FROM " + get_tablesql(table) + get_condition(condition) + get_order(order) + get_limit(limit);
    },

    get_insertsql = function (table, data) {
        var sqldata = '', sqlfields = '';
        for (var name in data) {
            sqlfields += (sqlfields !== '' ? ", " : "") + get_colnm(name);
            sqldata += (sqldata !== '' ? ", " : "") + get_colval(data[name], name);
        }
        return "INSERT INTO " + get_tablesql(table) + " (" + sqlfields + ") VALUES (" + sqldata + ")";
    },

    get_inserts_sql = function (table, fields, data) {
        var fieldcount = 0, sqlfields = '';
        if (!common.isarray(fields) || common.empty(fields) || !common.isarray(data) || common.empty(data))
            return false;
        for (var name in fields) {
            fieldcount++;
            sqlfields += (sqlfields !== '' ? ", " : "") + get_colnm(fields[name]);
        }
        var sql_insertsvals = '';
        for (var row in data) {
            var sql_insertsval = '';
            if (!common.empty(data[row]) && common.isarray(data[row]) && common.count(data[row]) === fieldcount) {
                for (var col in data[row])
                    sql_insertsval += (sql_insertsval === '' ? '' : ', ') + get_colval(data[row][col]);
                sql_insertsvals += (sql_insertsvals === '' ? '' : ', ') + '(' + sql_insertsval + ')';
            } else
                return false;
        }
        return "INSERT INTO " + get_tablesql(table) + " (" + sqlfields + ") VALUES " + sql_insertsvals;
    },

    get_updatesql = function (table, data, condition, order, limit) {
        var sqlsetdata = '';
        for (var name in data)
            sqlsetdata += (sqlsetdata !== '' ? ", " : "") + get_colnm(name) + " = " + get_colval(data[name], name);
        return "UPDATE " + get_tablesql(table) + " SET " + sqlsetdata + get_condition(condition) +
            get_order(order) + get_limit(limit);
    },

    get_copysql = function (srctable, dsttable, data, condition, order, limit, group, having) {
        if (!common.empty(srctable) && !common.empty(dsttable) && !common.empty(data) && (typeof (data) === 'object' || data === '*')) {
            var colsrc = [], coldes = [];
            if (data === '*') {
                return "INSERT INTO " + get_tablesql(dsttable) + " " + get_selectsql(srctable, "*", condition, order, limit, group, having);
            } else {
                for (var name in data) {
                    colsrc.push(name);
                    coldes.push(data[name]);
                }
                var sqlcolsrc = get_colsql(colsrc, false);
                return "INSERT INTO " + get_tablesql(dsttable) + "(" + sqlcolsrc + ") " +
                    get_selectsql(srctable, coldes, condition, order, limit, group, having);
            }
        } else
            return false;
    },

    get_selectsql = function (table, column, condition, order, limit, group, having) {
        return "SELECT " + get_colsql(column) + " FROM " + get_tablesql(table) +
            get_condition(condition) + get_group(group, having) +
            get_order(order) + get_limit(limit);
    },

    get_paging = function (perpage, total, now) {
        perpage = parseInt(perpage, 10);
        total = parseInt(total, 10);
        now = parseInt(now, 10);
        if (total > perpage && now > 0) {
            var pgtotal = ((total - (total % perpage)) / perpage);
            pgtotal += ((total % perpage > 0) ? 1 : 0);
            if (now > pgtotal)
                now = pgtotal;
            return {offset: now * perpage, limit: perpage};
        } else
            return {offset: 0, limit: 0};
    },

    get_connection = function () {
        return cluster.getconnection();
    },

    close_connection = function (dbc) {
        if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.release) === 'function')
            dbc.release();
        return null;
    },

    sql_error = function (err, sql) {
        syslog.error(`SQL ERROR: ${err.code}` + (!common.empty(sql) ? "\nSQL: " + sql : ''));
    };

module.exports = new db();