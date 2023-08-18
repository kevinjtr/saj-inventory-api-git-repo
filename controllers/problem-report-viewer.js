'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const { propNamesToLowerCase, objectDifference } = require('../tools/tools');
const { dbSelectOptions } = require('../config/db-options');
const { rightPermision } = require('./validation/tools/user-database')
const AUTO_COMMIT = { ADD: true, UPDATE: true, DELETE: false }
const BANNED_COLS = ['ID']
const filter = require('lodash/filter')

const arraytoObject = (array, param) => {
    let obj = {}
    for (const elem of array) {
        const val = elem[param]
        obj[val] = elem

    }
    return obj
}
//SELECT * FROM PROBLEMS_REPORTED
exports.index = async function (req, res) {
    let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
        const {edit_rights} = req
        let result = await connection.execute(`SELECT * FROM PROBLEMS_REPORTED WHERE DELETED = 'No' ORDER BY DATE_REPORTED DESC`, {}, dbSelectOptions)
        result.rows = propNamesToLowerCase(result.rows)


        res.status(200).json({
            status: 200,
            error: false,
            message: 'Successfully get single data!',
            data: result.rows,
            editable: edit_rights
        });

    } catch (err) {
        console.log(err)
        res.status(400).json({
            status: 400,
            error: true,
            message: 'No data found!',
            data: [],
            editable: false
        });

    } finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};

//UPDATE PROBLEMS_REPORTED DATA
exports.update = async function (req, res) {  
    let columnErrors = { rows: {}, errorFound: false }
    const { edipi } = req.headers.cert
    let connection
	try{
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();
        const { changes, undo } = req.body.params


        for (const row in changes) {

            if (changes.hasOwnProperty(row)) {
                columnErrors.rows[row] = {}
                const { newData, oldData } = changes[row];
                const cells = newData && oldData ? { new: objectDifference(oldData, newData, 'tableData'), old: oldData } : newData

                const keys = cells.new ? Object.keys(cells.new) : []
                cells.update = {}
                let cols = ''
                const cell_id = cells.old ? cells.old.id : cells.id

                let result = await connection.execute(`SELECT * FROM PROBLEMS_REPORTED WHERE ID = :0`, [cell_id], dbSelectOptions)

                result = await connection.execute(`SELECT column_name FROM all_tab_cols WHERE table_name = 'PROBLEMS_REPORTED'`, {}, dbSelectOptions)

                if (result.rows.length > 0) {

                    //Add column for updated by in PROBLEMS_REPORTED table
                    if (keys.length > 0) {

                        result.rows = filter(result.rows, function (c) { return !BANNED_COLS.includes(c.COLUMN_NAME) })
                        let col_names = result.rows.map(x => x.COLUMN_NAME.toLowerCase())

                        for (let i = 0; i < keys.length; i++) {
                            if (col_names.includes(keys[i])) {
                                const comma = i && cols ? ', ' : ''
                                cols = cols + comma + keys[i] + ' = :' + keys[i]
                                cells.update[keys[i]] = keys[i].toLowerCase().includes('date') && !keys[i].toLowerCase().includes('updated_') ? new Date(cells.new[keys[i]]) :
                                    (typeof cells.new[keys[i]] == 'boolean') ? (cells.new[keys[i]] ? 1 : 2) : cells.new[keys[i]]
                            }

                            if (i == keys.length - 1 && typeof edipi != 'undefined' && !keys.includes('updated_by')) {
                                result = await connection.execute('SELECT * FROM registered_users WHERE EDIPI = :0', [edipi], dbSelectOptions)
                                if (result.rows.length > 0) {
                                    const registered_users_id = result.rows[0].ID
                                    const comma = cols ? ', ' : ''
                                    cols = cols + comma + 'updated_by = :updated_by'
                                    cells.update['updated_by'] = registered_users_id
                                }
                            }
                        }

                        let query = `UPDATE PROBLEMS_REPORTED SET ${cols}
                                    WHERE ID = ${cells.old.id}`

                        result = await connection.execute(query, cells.update, { autoCommit: AUTO_COMMIT.UPDATE })
                    }

                    return (
                        res.status(200).json({
                            status: 200,
                            error: false,
                            message: 'Successfully update data ',
                            data: [],//req.body,
                            columnErrors: columnErrors
                        })
                    )
                }

            }
        }

        return (
            res.status(200).json({
                status: 200,
                error: true,
                message: 'Could not update data',
                data: [],
                columnErrors: columnErrors
            })
        )
    } catch (err) {
        console.log(err);
        res.status(400).json({
            status: 400,
            error: true,
            columnErrors: columnErrors,
            message: 'Cannot delete data'
        });
    } finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
};