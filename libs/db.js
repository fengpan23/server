/**
 * Created by fp on 2016/10/13.
 */
"use strict";
const _ = require('underscore');
const mysql = require('mysql');
const common = require('common');

class DB {
    constructor() {
    }

    query(dbc, sql) {
        let _query = function (dbc, sql) {
            return new Promise((resolve, reject) => {
                let times = 0, isSelect = sql.toUpperCase().startsWith('SELECT');
                function q(){
                    dbc.query(sql, (err, result) => {
                        if(err){
                            reject(err)
                        } else {
                            if (!result && isSelect && times++ < 3){
                                _timeout(100).then(q);
                            }else{
                                resolve(result);
                            }
                        }
                    });
                }
                q();
            });
        };
        let _timeout = function (ms) {
            return new Promise(_res => {
                setTimeout(_res, ms);
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

    cell(connection, table, column, condition, order, offset, group, having) {
        if (table)
            return new Promise((resolve, reject) => {
                if (typeof column === 'object'){
                    column = common.first(column);
                    column = column && common.first(column).value;
                }
                let limit = offset ? {limit: 1, offset: +offset} : 1;
                this.query(connection, getSelectSql(table, column, condition, order, limit, group, having)).then(result => {
                    let res = common.first(result[0]);
                    resolve(res && res.value);
                }).catch(reject);
            });
        else
            return Promise.reject('param invalid on db.cell');
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

    one(connection, table, column, condition, order, offset, group, having) {
        console.log('condition: ', condition);
        let limit = offset ? {limit: 1, offset: +offset} : 1;
        return this.query(connection, getSelectSql(table, column, condition, order, limit, group, having)).then(result => {
            return Promise.resolve(result[0]);
        })
    }

    oneForUpdate(connection, table, column, condition, order, offset, group, having) {
        if (table) {
            return new Promise((resolve, reject) => {
                let limit = offset ? 1 : {limit: 1, offset: +offset};
                this.query(connection, getSelectSql(table, column, condition, order, limit, group, having) + ' for update').then(result => {
                    resolve(result[0]);
                }).catch(reject);
            });
        }else
            return Promise.reject('param invalid on db.oneForUpdate');
    }

    oneRow(connection, table, column, condition, order, offset, group, having) {
        if (table) {
            let limit = offset ? {limit: 1, offset: +offset} : 1;
            return this.query(connection, getSelectSql(table, column, condition, order, limit, group, having));
        }else
            return Promise.reject('param invalid on db.oneRow');
    }

    select(connection, table, column, condition, order, limit, group, having) {
        if (table)
            return this.query(connection, getSelectSql(table, column, condition, order, limit, group, having));
        else
            return Promise.reject('param invalid on db.select');
    }

    insert(connection, table, data) {
        if (table)
            return this.query(connection, getInsertSql(table, data));
        else
            return Promise.reject('param invalid on db.insert');
    }

    inserts(connection, table, fields, data) {
        if (table && fields && _.isArray(fields) && _.isArray(data)) {
            let sql = getInsertsSql(table, fields, data);
            if (sql)
                return this.query(connection, sql);
            else
                return Promise.reject('param invalid get sql on db.inserts');
        } else
            return Promise.reject('param invalid on db.inserts');
    }

    update(connection, table, data, condition, order, limit) {
        if (table && condition)
            return this.query(connection, getUpdateSql(table, data, condition, order, limit));
        else
            return Promise.reject( 'param invalid on db.update');
    }

    delete(connection, table, condition, order, limit) {
        if (table && condition)
            return this.query(connection, getDeleteSql(table, condition, order, limit));
        else
            return Promise.reject('param invalid on db.delete');
    }

    rollback(dbc) {
        return new Promise(resolve => {
            if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.rollback) === 'function')
                dbc.rollback(() => {
                    resolve(true);
                });
            else
                resolve(false);
        });
    }

    commit(dbc) {
        return new Promise((resolve, reject) => {
            if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.commit) === 'function'){
                dbc.commit(err => {
                    err ? this.rollback(dbc).then(() => reject(err)) :　resolve(true);
                });
            }else{
                resolve(false);
            }
        });
    }

    destroy(dbc) {
        if (dbc !== null)
            closeConnection(dbc);
    }
}

    function escape(value, auto, column) {
        if (typeof(value) !== 'string') value = value.toString();
        let strEscape = column === true ? mysql.escapeId(value) : mysql.escape(value);
        return auto === true ? strEscape : strEscape.substring(1, strEscape.length - 1);
    }

    function getColnm(dbcolnm, dbcola, alias, dbfnc) {
        let dbcolnow = '',
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
                        dbcolnow = "DISTINCT " + getColnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'NO_CACHE':
                        dbcolnow = "SQL_NO_CACHE " + getColnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'HIGH_PRIORITY':
                        dbcolnow = "HIGH_PRIORITY " + getColnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'LOW_PRIORITY':
                        dbcolnow = "LOW_PRIORITY " + getColnm(dbcolnm.replace(matches[0], ""), null, false, false);
                        break;

                    case 'FNC':
                        dbcolnow = getColnm(dbcolnm.replace(matches[0], ""), null, false, true);
                        break;

                    case 'VAL':
                        dbcolnow = getColVal(dbcolnm.replace(matches[0], ""), dbcolnm);
                        break;

                    case "SUM":
                        dbcolnow = "SUM(" + getColnm(dbcolnm.replace(matches[0], ""), null, false, false) + ")";
                        break;

                    case "COUNT":
                        dbcolnm = dbcolnm.replace(matches[0], "");
                        dbcolnow = dbcolnm === "*" || dbcolnm === "" ? "COUNT(*)" : "COUNT(" + getColnm(dbcolnm, null, false, false) + ")";
                        break;

                    case "NOW":
                        dbcolnow = "NOW()";
                        break;

                    case common.range('A', 'Z').indexOf(matches[1]) > -1:
                        dbcolnow = getColnm(dbcolnm.replace(matches[0], ""), null, false, true);
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
    }

    function getColVal(dbcolval, dbcolnm) {
        if (dbcolval === null)
            return "NULL";
        else {
            if (typeof (dbcolval) === 'object' || _.isObject(dbcolval))
                dbcolval = JSON.stringify(dbcolval);
            let regex_db = /^\{DB_([A-Z_]+)\}/i, matches = regex_db.exec(dbcolval);
            if (matches) {
                dbcolval = escape(dbcolval.replace(matches[0], ""));
                switch (matches[1].toUpperCase()) {
                    case 'COL':
                        return getColnm(dbcolval);
                    case 'FNC':
                        return dbcolval;
                    case "NOW":
                        return "NOW()";
                    case "SUM":
                    case "COUNT":
                        return getColnm(dbcolval);
                    case "TIME":
                        return "CURRENT_TIME()";
                    case "DATE":
                        return "CURRENT_DATE()";
                    case "INC":
                        dbcolval = parseFloat(dbcolval);
                        return getColnm(dbcolnm) + " + " + dbcolval;
                    case "DEC":
                        dbcolval = parseFloat(dbcolval);
                        return getColnm(dbcolnm) + " - " + dbcolval;
                    case "TIMES":
                        dbcolval = parseFloat(dbcolval);
                        return getColnm(dbcolnm) + " * " + dbcolval;
                    case "DIV":
                        dbcolval = parseFloat(dbcolval);
                        return getColnm(dbcolnm) + " / " + dbcolval;
                    case "POWER":
                        dbcolval = parseFloat(dbcolval);
                        return getColnm(dbcolnm) + " ^ " + dbcolval;
                }
            } else
                return escape(dbcolval, true);
        }
    }

    function getCond(dname, dvalue, having) {
        let str = '';
        switch (typeof dvalue) {
            case 'object':
                let first = common.first(dvalue),
                    value = first.value,
                    key = first.key,
                    result = [];
                str = getColnm(dname, null, null, having);
                switch (key.toUpperCase()) {
                    case "LIST":
                    case "IN":
                        if (typeof (value) === 'object' && !common.empty(value))
                            for (let vkey in value)
                                result.push(escape(value[vkey]));
                        str += " IN ('" + common.implode("','", result) + "')";
                        break;
                    case "XLIST":
                    case "XIN":
                        if (typeof (value) === 'object' && !common.empty(value))
                            for (let vkey in value)
                                result.push(escape(value[vkey]));
                        str += " NOT IN ('" + common.implode("','", result) + "')";
                        break;
                    case "BETWEEN":
                        value = common.array_values(value);
                        str += " BETWEEN " + escape(value[0], true) + " AND " + escape(value[1], true);
                        break;
                    case "XBETWEEN":
                        value = common.array_values($Value);
                        str += " NOT BETWEEN " + escape(value[0], true) + " AND " + escape(value[1], true);
                        break;
                    default:
                        str = "";
                }
                break;
            case 'number':
            case "string":
                let regex_db = /^\{DB_([A-Z]+)\}/, operator = " = ", matches = [];
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
                str = getColnm(dname, null, null, having) + operator;
                str += operator.substr(operator.length - 1) === " " ? getColVal(dvalue, dname) : "";
                break;
            case 'NULL':
                str = getColnm(dname) + " = null";
        }
        return str;
    }

    function getCondition(cond, having) {
        let sdb = '';
        let regex_con = /(`?)([^\W]|[\w\d\-]+)(`?)(\s*)([\>=\<!]|LIKE|IS NOT NULL|IN|NOT IN|BETWEEN|NOT BETWEEN)(\s*)(('([^']*)')|[\d\.]|(\((.*)\))*)/ig;
        if (cond) {
            if (_.isArray(cond)) {
                let regex_op = /^\{DB_(OR|XOR|LB|RB|AND)\}$/i, logic = true, braket = 0, matches;
                for (let i in cond) {
                    let key = '', value = '';
                    if (typeof (cond[i]) === 'string')
                        value = cond[i];
                    else if (typeof (cond[i]) === 'object' && !_.isEmpty(cond[i])) {
                        let first = common.first(cond[i]);
                        key = first.key;
                        value = first.value;
                    } else
                        break;
                    matches = regex_op.exec(value);
                    if (typeof (value) === 'string' && matches) {
                        switch (matches[1].toUpperCase()) {
                            case "OR":
                                sdb += " OR ";
                                logic = true;
                                break;

                            case "XOR":
                                sdb += " XOR ";
                                logic = true;
                                break;

                            case "LB":
                                sdb += (!logic ? " AND " : "") + "(";
                                braket++;
                                break;

                            case "RB":
                                if (braket > 0) {
                                    braket--;
                                    sdb += ")";
                                }
                                break;

                            default:
                                sdb += " AND ";
                                logic = true;
                                break;
                        }
                    } else {
                        if (key) {
                            sdb += (!logic ? " AND " : "") + getCond(key, value, having);
                            logic = false;
                        }
                    }
                }
                sdb = sdb.replace(/(\s+)(AND|OR|XOR|\()(\s+)$/i, "");
                if (braket > 0)
                    for (let i = braket; i > 0; i--)
                        sdb += ")";
            } else if (typeof (cond) === 'string' && regex_con.test(cond))
                sdb = cond;
        }
        return cond ? (having ? " HAVING " : " WHERE ") + (_.isArray(cond) || typeof(cond) === 'string' ? sdb : "") : "";
    }

    function getColSql(dbCol, alias) {
        let sql = "";
        if (typeof alias === 'undefined')
            alias = true;
        if (dbCol) {
            switch (typeof (dbCol)) {
                case 'object':
                    for (let c in dbCol)
                        sql += (sql !== "" ? ", " : "") + getColnm(dbCol[c], c, alias);
                    break;
                case 'string':
                    sql = getColnm(dbCol, null, alias);
            }
        }
        return sql;
    }

    function getGroup(group, having) {
        let sql = getOrder(group, true);
        return _.isEmpty(sql) ? "" : sql + getHaving(having);
    }

    function getHaving(having) {
        return _.isEmpty(having) ? getCondition(having, true) : "";
    }

    function getOrder(order, group) {
        let sql = '', random = false;
        if (order) {
            if (order !== null && !common.isarray(order) && typeof (order) === 'object')
                order = [order];
            if (_.isArray(order)) {
                for (let i in order) {
                    let oname = '', otype = '';
                    if (typeof (order[i]) === 'string') {
                        oname = order[i];
                        if (oname === "RAND()") {
                            otype = oname;
                            oname = '';
                        } else
                            otype = "ASC";
                    } else if (typeof (order[i]) === 'object' && !common.empty(order[i])) {
                        let first = common.first(order[i]);
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
                        oname = getColnm(oname);
                    sql += (sql !== '' ? ", " : "") + (oname !== '' ? oname + ' ' : '') + otype;
                    if (otype === "RAND()") {
                        random = true;
                        break;
                    }
                }
            } else if (typeof (order) === 'string') {
                if (order.toUpperCase() === "{DB_RAND}" || order.toUpperCase() === "RAND()") {
                    random = true;
                    sql = "RAND()";
                } else
                    sql = getColnm(order) + " ASC";
            }
            if (group === true && random === true && sql !== '')
                sql = sql.substring(0, sql.length - 8);
        }
        return sql !== '' ? (group === true ? " GROUP BY " : " ORDER BY ") + sql : "";
    }

    function getLimit(limit) {
        let sql = '';
        if (limit) {
            let offset = 0, limited = 0;
            switch (typeof limit) {
                case "object":
                    if (limit !== null && !_.isArray(limit)){
                        limit = [limit];
                    }else if (_.isArray(limit)) {
                        console.error('comm.....');
                        limit = common.array_values(limit);
                        let item = 0;
                        limitAnchor:
                            if (limit.length > 1) {
                                for (let i in limit) {
                                    switch (item) {
                                        case 0:
                                            offset = parseFloat(limit[i]);
                                            break;
                                        case 1:
                                            limited = parseFloat(limit[i]);
                                            break;
                                        default:
                                            break limitAnchor;
                                    }
                                    item++;
                                }
                            } else
                                limited = parseFloat(limit[0]);
                    } else {
                        if (limit.hasOwnProperty("offset") || limit.hasOwnProperty("OFFSET"))
                            offset = limit.offset || limit['OFFSET'];
                        if (limit.hasOwnProperty("limit") || limit.hasOwnProperty("LIMIT"))
                            limited = limit.limit || limit['LIMIT'];
                    }
                    break;
                case "string":
                case "number":
                case "boolean":
                    limited = parseInt(limit, 10);
                    break;
            }
            if (limited > 0)
                sql += (sql === '' ? '' : ' ') + "LIMIT " + limited;
            if (offset > 0)
                sql += (sql === '' ? '' : ' ') + "OFFSET " + offset;
        }
        return ' ' + sql;
    }

    function getTableSql(table) {
        if (typeof (table) === 'string' && table !== '') {
            return escape(table, true, true);
        } else
            return "";
    }

    function getDeleteSql(table, condition, order, limit) {
        return "DELETE FROM " + getTableSql(table) + getCondition(condition) + getOrder(order) + getLimit(limit);
     }

    function getInsertSql(table, data) {
        let sqlData = '', fields = '';
        for (let name in data) {
            fields += (fields !== '' ? ", " : "") + getColnm(name);
            sqlData += (sqlData !== '' ? ", " : "") + getColVal(data[name], name);
        }
        return "INSERT INTO " + getTableSql(table) + " (" + fields + ") VALUES (" + sqlData + ")";
    }

    function getInsertsSql(table, fields, data) {
        let fieldCount = 0, sqlFields = '';
        if (!_.isArray(fields) || !fields || !_.isArray(data) || _.isEmpty(data))
            return false;
        for (let name in fields) {
            fieldCount++;
            sqlFields += (sqlFields !== '' ? ", " : "") + getColnm(fields[name]);
        }
        let values = '';
        for (let row in data) {
            let val = '';
            if (data[row] && _.isArray(data[row]) && common.count(data[row]) === fieldCount) {
                for (let col in data[row])
                    val += (val === '' ? '' : ', ') + getColVal(data[row][col]);
                values += (values === '' ? '' : ', ') + '(' + val + ')';
            } else
                return false;
        }
        return "INSERT INTO " + getTableSql(table) + " (" + fields + ") VALUES " + values;
    }

    function getUpdateSql(table, data, condition, order, limit) {
        let sqlSetData = '';
        for (let name in data)
            sqlSetData += (sqlSetData !== '' ? ", " : "") + getColnm(name) + " = " + getColVal(data[name], name);

        return "UPDATE " + getTableSql(table) + " SET " + sqlSetData + getCondition(condition) + getOrder(order) + getLimit(limit);
    }

    function getCopySql(srcTable, dstTable, data, condition, order, limit, group, having) {
        if (srcTable && dstTable && data && (typeof data === 'object' || data === '*')) {
            let colSrc = [], colDes = [];
            if (data === '*') {
                return "INSERT INTO " + getTableSql(dstTable) + " " + getSelectSql(srcTable, "*", condition, order, limit, group, having);
            } else {
                for (let name in data) {
                    colSrc.push(name);
                    colDes.push(data[name]);
                }
                return "INSERT INTO " + getTableSql(dstTable) + "(" + getColSql(colSrc, false) + ") " + getSelectSql(srcTable, colDes, condition, order, limit, group, having);
            }
        } else
            return false;
    }

    function getSelectSql(table, column, condition, order, limit, group, having) {
        return "SELECT " + getColSql(column) + " FROM " + getTableSql(table) +
            getCondition(condition) + getGroup(group, having) +
            getOrder(order) + getLimit(limit);
    }

    function getPaging(perPage, total, now) {
        perPage = parseInt(perPage, 10);
        total = parseInt(total, 10);
        now = parseInt(now, 10);
        if (total > perPage && now > 0) {
            let totalPage = ((total - (total % perPage)) / perPage);
            totalPage += ((total % perPage > 0) ? 1 : 0);
            if (now > totalPage)
                now = totalPage;
            return {offset: now * perPage, limit: perPage};
        } else
            return {offset: 0, limit: 0};
    }

    function closeConnection(dbc) {
        if (typeof (dbc) === 'object' && dbc !== null && typeof (dbc.release) === 'function')
            dbc.release();
    }

module.exports = new DB();