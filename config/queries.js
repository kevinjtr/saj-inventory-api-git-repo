
const EQUIPMENT = "(SELECT * FROM EQUIPMENT WHERE DELETED != 1)"
const FORM_4900 = "(SELECT * FROM FORM_4900 WHERE DELETED != 1)"

const equipment_count = {
	employee:`SELECT COUNT(*) as EMPLOYEE_EQUIPMENT_COUNT, USER_EMPLOYEE_ID FROM ${EQUIPMENT} GROUP BY USER_EMPLOYEE_ID`,
	hra:`SELECT COUNT(*) as HRA_EQUIPMENT_COUNT, HRA_NUM FROM ${EQUIPMENT} GROUP BY HRA_NUM `
}

const registered_users = `SELECT u.id, u.user_level, e.first_name||' '||e.last_name as UPDATED_BY_FULL_NAME, ul.alias as user_level_alias, ul.name as user_level_name FROM registered_users u
LEFT JOIN EMPLOYEE e
on u.employee_id = e.id
LEFT JOIN USER_LEVEL ul
on u.user_level = ul.id `

const registered_users_all_cols = `SELECT u.*, e.first_name||' '||e.last_name as UPDATED_BY_FULL_NAME FROM registered_users u
LEFT JOIN EMPLOYEE e
on u.employee_id = e.id `

const employeesForRegistrationAssignment = `SELECT
e.ID,
e.FIRST_NAME,
e.LAST_NAME,
e.TITLE,
e.WORK_PHONE,
e.OFFICE_SYMBOL,
e.DISTRICT,
e.DIVISION,
e.EMAIL,
o.ALIAS as OFFICE_SYMBOL_ALIAS,
d.NAME as DIVISION_NAME,
dd.NAME as DISTRICT_NAME,
d.SYMBOL as DIVISION_SYMBOL,
dd.SYMBOL as DISTRICT_SYMBOL
FROM EMPLOYEE e
LEFT JOIN OFFICE_SYMBOL o
ON e.OFFICE_SYMBOL = o.id
LEFT JOIN DIVISION d
ON e.DIVISION = d.id
LEFT JOIN DISTRICT dd
ON e.DISTRICT = dd.id
WHERE e.DELETED != 1`



const employee = `SELECT
e.ID,
e.FIRST_NAME,
e.LAST_NAME,
e.TITLE,
e.WORK_PHONE,
o.ALIAS as OFFICE_SYMBOL_ALIAS,
e.OFFICE_SYMBOL,
e.office_location_id,
e.DIVISION,
e.DISTRICT,
ol.NAME as OFFICE_LOCATION_NAME,
eec.EMPLOYEE_EQUIPMENT_COUNT
FROM EMPLOYEE e
LEFT JOIN OFFICE_SYMBOL o
ON e.OFFICE_SYMBOL = o.id
LEFT JOIN (${equipment_count.employee}) eec
ON e.id = eec.user_employee_id
LEFT JOIN (${registered_users}) ur
on ur.id = e.updated_by
LEFT JOIN OFFICE_LOCATION ol
on ol.id = e.office_location_id `

const employee_registration = `SELECT
er.ID,
er.FIRST_NAME,
er.LAST_NAME,
er.TITLE,
er.WORK_PHONE,
er.EMAIL,
er.HRAS,
er.EDIPI,
er.STATUS_COMMENT,
er.FIRST_NAME_CAC,
er.LAST_NAME_CAC,
er.DIVISION as DIVISION,
er.DISTRICT as DISTRICT,
er.OFFICE_SYMBOL as OFFICE_SYMBOL,
dt.SYMBOL as DISTRICT_SYMBOL,
dt.NAME as DISTRICT_NAME,
dn.SYMBOL as DIVISION_SYMBOL,
dn.NAME as DIVISION_NAME,
os.ALIAS as OFFICE_SYMBOL_ALIAS,
CASE er.USER_TYPE WHEN '2' THEN 'HRA'
WHEN '4' THEN 'Regular' 
ELSE 'Other' END AS USER_TYPE_LABEL
FROM EMPLOYEE_REGISTRATION er
LEFT JOIN OFFICE_SYMBOL os
ON er.OFFICE_SYMBOL = os.id
LEFT JOIN DISTRICT dt
ON er.DISTRICT = dt.id
LEFT JOIN DIVISION dn
ON er.DIVISION = dn.id
WHERE er.DELETED = 2`

module.exports = {
	EQUIPMENT:EQUIPMENT,
	FORM_4900:FORM_4900,
	registered_users:registered_users,
	registered_users_all_cols:registered_users_all_cols,
	employee_officeSymbol: employee,
	employee_registration:employee_registration,
	employeesForRegistrationAssignment:employeesForRegistrationAssignment,
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
	e.WORK_PHONE as employee_work_phone,
	ol.NAME as employee_office_location_name
	FROM ${EQUIPMENT} eq
	LEFT JOIN employee e
	on eq.user_employee_id = e.id
	LEFT JOIN (${registered_users}) ur
	on ur.id = eq.updated_by
	LEFT JOIN OFFICE_LOCATION ol
	on ol.id = e.office_location_id `,
	hra_employee:`SELECT 
	h.hra_num,
	e.first_name || ' ' || e.last_name as hra_full_name,
	e.first_name hra_first_name,
	e.last_name hra_last_name,
	e.TITLE as hra_title,
	e.OFFICE_SYMBOL_alias as hra_office_symbol_alias,
	e.WORK_PHONE as hra_work_phone,
	hec.HRA_EQUIPMENT_COUNT,
	e.OFFICE_LOCATION_NAME as hra_office_location_name
	FROM hra h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by `,
	employeeByEDIPI: (edipi)=> (`SELECT
	e.ID,
	e.FIRST_NAME,
	e.LAST_NAME,
	e.OFFICE_SYMBOL,
	e.DISTRICT,
	e.DIVISION,
	o.ALIAS as OFFICE_SYMBOL_ALIAS,
	d.NAME as DIVISION_NAME,
	dd.NAME as DISTRICT_NAME
	FROM EMPLOYEE e
	LEFT JOIN OFFICE_SYMBOL o
	ON e.OFFICE_SYMBOL = o.id
	LEFT JOIN DIVISION d
	ON e.DIVISION = d.id
	LEFT JOIN DISTRICT dd
	ON e.DISTRICT = dd.id
	LEFT JOIN REGISTERED_USERS ru
	ON e.ID = ru.employee_id
	WHERE e.DELETED != 1 AND ru.edipi = ${edipi}`),
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
	employee_id_auth: (id) => (`select distinct e.id from employee e
	left join registered_users ru
	on ru.employee_id = e.id
	LEFT JOIN HRA H
	ON E.ID = H.EMPLOYEE_ID
	where office_symbol in (
			select os.id from hra h
			left join employee e
			on e.id = h.employee_id
			left join office_symbol os
			on os.id = e.office_symbol
			where e.id in (SELECT h.employee_id FROM HRA h
				left join employee e 
                on e.id = h.employee_id
				WHERE h.hra_num IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})
				union
				SELECT employee_id FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})
				)
    ) OR (select user_level from registered_users where id = 1 and user_level = 1) is not null OR
	 ((select user_level from registered_users where id = 1 and user_level in (9,11)) is not null AND H.HRA_NUM IS NULL AND E.OFFICE_SYMBOL IS NULL)
    UNION
    SELECT employee_id FROM registered_users WHERE id = ${id}`),

			//OR (e.office_symbol is null and ru.user_level in (1,11))
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