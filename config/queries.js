
const EQUIPMENT = "(SELECT * FROM EQUIPMENT WHERE DELETED != 1)"
const FORM_4900 = "(SELECT * FROM FORM_4900 WHERE DELETED != 1)"

const equipment_count = {
	employee:`SELECT COUNT(*) as EMPLOYEE_EQUIPMENT_COUNT, USER_EMPLOYEE_ID FROM ${EQUIPMENT} GROUP BY USER_EMPLOYEE_ID`,
	hra:`SELECT COUNT(*) as HRA_EQUIPMENT_COUNT, HRA_NUM FROM ${EQUIPMENT} GROUP BY HRA_NUM `
}

const registered_users = `SELECT u.id, u.user_level, e.first_name||' '||e.last_name as UPDATED_BY_FULL_NAME, ul.alias as user_level_alias FROM registered_users u
LEFT JOIN EMPLOYEE e
on u.employee_id = e.id
LEFT JOIN USER_LEVEL ul
on u.user_level = ul.id `

const registered_users_all_cols = `SELECT u.*, e.first_name||' '||e.last_name as UPDATED_BY_FULL_NAME FROM registered_users u
LEFT JOIN EMPLOYEE e
on u.employee_id = e.id `

const employee = `SELECT
e.ID,
e.FIRST_NAME,
e.LAST_NAME,
e.TITLE,
e.WORK_PHONE,
o.ALIAS as OFFICE_SYMBOL_ALIAS,
e.OFFICE_SYMBOL,
eec.EMPLOYEE_EQUIPMENT_COUNT
FROM EMPLOYEE e
LEFT JOIN OFFICE_SYMBOL o
ON e.OFFICE_SYMBOL = o.id
LEFT JOIN (${equipment_count.employee}) eec
ON e.id = eec.user_employee_id
LEFT JOIN (${registered_users}) ur
on ur.id = e.updated_by `

module.exports = {
	EQUIPMENT:EQUIPMENT,
	FORM_4900:FORM_4900,
	registered_users:registered_users,
	registered_users_all_cols:registered_users_all_cols,
	employee_officeSymbol: employee,
    equipment_employee: `SELECT
	eq.ID,
	eq.BAR_TAG_NUM,
	eq.CATALOG_NUM,
	eq.BAR_TAG_HISTORY_ID,
	eq.MANUFACTURER,
	eq.MODEL,
	eq.CONDITION,
	eq.SERIAL_NUM,
	eq.ACQUISITION_DATE,
	eq.ACQUISITION_PRICE,
	eq.DOCUMENT_NUM,
	eq.ITEM_TYPE,
	eq.HRA_NUM,
	e.id as employee_id,
	e.first_name || ' ' || e.last_name as employee_full_name,
	e.first_name employee_first_name,
	e.last_name employee_last_name,
	e.TITLE as employee_title,
	e.OFFICE_SYMBOL as employee_office_symbol,
	e.WORK_PHONE as employee_work_phone
	FROM ${EQUIPMENT} eq
	LEFT JOIN employee e
	on eq.user_employee_id = e.id
	LEFT JOIN (${registered_users}) ur
	on ur.id = eq.updated_by `,
	hra_employee:`SELECT 
	h.hra_num,
	e.first_name || ' ' || e.last_name as hra_full_name,
	e.first_name hra_first_name,
	e.last_name hra_last_name,
	e.TITLE as hra_title,
	e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	e.WORK_PHONE as hra_work_phone,
	hec.HRA_EQUIPMENT_COUNT
	FROM hra h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `,
	// hra_employee_form_all: (id) => (`SELECT 
	// h.hra_num,
	// e.first_name || ' ' || e.last_name as hra_full_name,
	// e.first_name hra_first_name,
	// e.last_name hra_last_name,
	// e.TITLE as hra_title,
	// e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	// e.WORK_PHONE as hra_work_phone,
	// hec.HRA_EQUIPMENT_COUNT
	// FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})
	// union all
	// SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
	// LEFT JOIN (${employee}) e 
	// on h.employee_id = e.id
	// LEFT JOIN (${equipment_count.hra}) hec
	// on h.hra_num = hec.hra_num
	// LEFT JOIN (${registered_users}) ur
	// on ur.id = h.updated_by`),
	hra_employee_form_all: (id) => (`SELECT 
	h.hra_num,
	e.first_name || ' ' || e.last_name as hra_full_name,
	e.first_name hra_first_name,
	e.last_name hra_last_name,
	e.TITLE as hra_title,
	e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	e.WORK_PHONE as hra_work_phone,
	hec.HRA_EQUIPMENT_COUNT
	FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})
	union all
	SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `),
	hra_employee_form_auth: (id) => (`SELECT 
	h.hra_num,
	e.first_name || ' ' || e.last_name as hra_full_name,
	e.first_name hra_first_name,
	e.last_name hra_last_name,
	e.TITLE as hra_title,
	e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	e.WORK_PHONE as hra_work_phone,
	hec.HRA_EQUIPMENT_COUNT
	FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})) h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `),
	hra_employee_form_self: (id) => (`SELECT 
	h.hra_num,
	e.first_name || ' ' || e.last_name as hra_full_name,
	e.first_name hra_first_name,
	e.last_name hra_last_name,
	e.TITLE as hra_title,
	e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	e.WORK_PHONE as hra_work_phone,
	hec.HRA_EQUIPMENT_COUNT
	FROM (SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `),
	hra_num_form_all: (id) => (`SELECT 
	h.hra_num
	FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})
	union all
	SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `),
	hra_num_form_auth: (id) => (`SELECT 
	h.hra_num
	FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})) h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `),
	hra_num_form_self: (id) => (`SELECT 
	h.hra_num
	FROM (SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `),
	// hra_employee_form_all:`SELECT 
	// h.hra_num,
	// e.first_name || ' ' || e.last_name as hra_full_name,
	// e.first_name hra_first_name,
	// e.last_name hra_last_name,
	// e.TITLE as hra_title,
	// e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	// e.WORK_PHONE as hra_work_phone,
	// hec.HRA_EQUIPMENT_COUNT
	// FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = 1)
	// union all
	// SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = 1)) h
	// LEFT JOIN (${employee}) e 
	// on h.employee_id = e.id
	// LEFT JOIN (${equipment_count.hra}) hec
	// on h.hra_num = hec.hra_num
	// LEFT JOIN (${registered_users}) ur
	// on ur.id = h.updated_by`,
	// hra_num_form_all:`SELECT 
	// h.hra_num
	// FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = 1)
	// union all
	// SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = 1)) h
	// LEFT JOIN (${employee}) e 
	// on h.employee_id = e.id
	// LEFT JOIN (${equipment_count.hra}) hec
	// on h.hra_num = hec.hra_num
	// LEFT JOIN (${registered_users}) ur
	// on ur.id = h.updated_by`,
	hra_employee_no_count:`SELECT 
	h.hra_num,
	e.id as hra_employee_id,
	e.first_name || ' ' || e.last_name as hra_full_name,
	e.first_name hra_first_name,
	e.last_name hra_last_name,
	e.TITLE as hra_title,
	e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	e.WORK_PHONE as hra_work_phone
	 FROM hra h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id `,
	// eng4900_losingHra:`(SELECT h.hra_num as losing_hra_num,
	// 	e.first_name as losing_hra_first_name,
	// 	e.last_name as losing_hra_last_name,
	// 	e.work_phone as losing_hra_work_phone,
    //     o.alias as losing_hra_os_alias
	// 	from hra h, employee e
    //     LEFT JOIN office_symbol o
    //     on e.office_symbol = o.id
	// 	WHERE h.employee_id = e.id)`,
	eng4900_losingHra:`SELECT h.hra_num as losing_hra_num,
		e.first_name as losing_hra_first_name,
		e.last_name as losing_hra_last_name,
		e.first_name || ' ' || e.last_name as losing_hra_full_name,
		e.work_phone as losing_hra_work_phone,
		e.office_symbol as losing_hra_office_symbol,
		e.office_symbol_alias as losing_hra_os_alias
		from hra h, (${employee}) e
		WHERE h.employee_id = e.id `,
	// eng4900_gainingHra:`(SELECT h.hra_num as gaining_hra_num,
	// 	e.first_name as gaining_hra_first_name,
	// 	e.last_name as gaining_hra_last_name,
    //     DECODE(e.work_phone, NULL, '(   )    -    ', 
    //     '(' || SUBSTR(e.work_phone, 0, 3) || ') ' || SUBSTR(e.work_phone, 4, 3) ||
    //     ' - ' || SUBSTR(e.work_phone, 7, 4)
    //     ) as gaining_hra_work_phone,
    //     o.alias as gaining_hra_os_alias
	// 	from hra h, employee e
    //     LEFT JOIN office_symbol o
    //     on e.office_symbol = o.id
	//     WHERE h.employee_id = e.id)`
	eng4900_gainingHra:`SELECT h.hra_num as gaining_hra_num,
		e.first_name as gaining_hra_first_name,
		e.last_name as gaining_hra_last_name,
		e.first_name || ' ' || e.last_name as gaining_hra_full_name,
        e.work_phone as gaining_hra_work_phone,
		e.office_symbol as gaining_hra_office_symbol,
		e.office_symbol_alias as gaining_hra_os_alias
		from hra h, (${employee}) e
        WHERE h.employee_id = e.id `
  };