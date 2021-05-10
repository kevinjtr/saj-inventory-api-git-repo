
const equipment_count = {
	employee:`SELECT COUNT(*) as EMPLOYEE_EQUIPMENT_COUNT, USER_EMPLOYEE_ID FROM EQUIPMENT GROUP BY USER_EMPLOYEE_ID`,
	hra:`SELECT COUNT(*) as HRA_EQUIPMENT_COUNT, HRA_NUM FROM EQUIPMENT GROUP BY HRA_NUM`
}

const employee = `SELECT
e.ID,
e.FIRST_NAME,
e.LAST_NAME,
e.TITLE,
e.OFFICE_SYMBOL,
e.WORK_PHONE,
o.ALIAS as OFFICE_SYMBOL_ALIAS,
eec.EMPLOYEE_EQUIPMENT_COUNT
FROM EMPLOYEE e
LEFT JOIN OFFICE_SYMBOL o
ON e.OFFICE_SYMBOL = o.id
LEFT JOIN (${equipment_count.employee}) eec
ON e.id = eec.user_employee_id`

module.exports = {
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
	eq.INDIVIDUAL_ROR_PROP,
	eq.ITEM_TYPE,
	eq.HRA_NUM,
	e.id as employee_id,
	e.first_name || ' ' || e.last_name as employee_full_name,
	e.first_name employee_first_name,
	e.last_name employee_last_name,
	e.TITLE as employee_title,
	e.OFFICE_SYMBOL as employee_office_symbol,
	e.WORK_PHONE as employee_work_phone
	FROM equipment eq
	LEFT JOIN employee e
    on eq.user_employee_id = e.id`,
	hra_employee:`SELECT 
	h.hra_num,
	e.id as hra_employee_id,
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
	on h.hra_num = hec.hra_num`,
	// eng4900_losingHra:`(SELECT h.hra_num as losing_hra_num,
	// 	e.first_name as losing_hra_first_name,
	// 	e.last_name as losing_hra_last_name,
	// 	e.work_phone as losing_hra_work_phone,
    //     o.alias as losing_hra_os_alias
	// 	from hra h, employee e
    //     LEFT JOIN office_symbol o
    //     on e.office_symbol = o.id
	// 	WHERE h.employee_id = e.id)`,
	eng4900_losingHra:`(SELECT h.hra_num as losing_hra_num,
		e.first_name as losing_hra_first_name,
		e.last_name as losing_hra_last_name,
		e.work_phone as losing_hra_work_phone,
		e.office_symbol as losing_hra_office_symbol
		from hra h, employee e
		WHERE h.employee_id = e.id)`,
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
	eng4900_gainingHra:`(SELECT h.hra_num as gaining_hra_num,
		e.first_name as gaining_hra_first_name,
		e.last_name as gaining_hra_last_name,
        e.work_phone as gaining_hra_work_phone,
        e.office_symbol as gaining_hra_office_symbol
		from hra h, employee e
        WHERE h.employee_id = e.id)`
  };