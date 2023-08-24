const EQUIPMENT = "(SELECT * FROM EQUIPMENT WHERE DELETED != 1)"
const FORM_4900 = "(SELECT * FROM FORM_4900 WHERE DELETED != 1)"

const equipment_count = {
	employee:`SELECT COUNT(*) as EMPLOYEE_EQUIPMENT_COUNT, USER_EMPLOYEE_ID FROM ${EQUIPMENT} GROUP BY USER_EMPLOYEE_ID`,
	hra:`SELECT COUNT(*) as HRA_EQUIPMENT_COUNT, HRA_NUM FROM ${EQUIPMENT} GROUP BY HRA_NUM `
}
const registered_users = `SELECT u.id, u.user_level, e.first_name||' '||e.last_name as UPDATED_BY_FULL_NAME, ul.alias as user_level_alias, ul.name as user_level_name,
CASE WHEN (e.office_symbol is not null AND e.district is not null) THEN 'CE'||dis.symbol||'-'||os.alias ELSE '' END user_district_office, notifications 
FROM registered_users u
LEFT JOIN EMPLOYEE e
on u.employee_id = e.id
LEFT JOIN USER_LEVEL ul
on u.user_level = ul.id
left join office_symbol os
on os.id = e.office_symbol
left join district dis
on dis.id = e.district `

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
er.OFFICE_LOCATION_ID as OFFICE_LOCATION_ID,
er.OFFICE_SYMBOL as OFFICE_SYMBOL,
ol.name as OFFICE_LOCATION_NAME,
dt.SYMBOL as DISTRICT_SYMBOL,
dt.NAME as DISTRICT_NAME,
dn.SYMBOL as DIVISION_SYMBOL,
dn.NAME as DIVISION_NAME,
os.ALIAS as OFFICE_SYMBOL_ALIAS,
CASE er.USER_TYPE WHEN '2' THEN 'HRA'
WHEN '4' THEN 'Regular' 
ELSE 'Other' END AS USER_TYPE_LABEL
FROM EMPLOYEE_REGISTRATION er
LEFT JOIN OFFICE_LOCATION ol
on er.OFFICE_LOCATION_ID = ol.id
LEFT JOIN OFFICE_SYMBOL os
ON er.OFFICE_SYMBOL = os.id
LEFT JOIN DISTRICT dt
ON er.DISTRICT = dt.id
LEFT JOIN DIVISION dn
ON er.DIVISION = dn.id
WHERE er.DELETED = 2`

const hra_num_form_self = (id,name=false) => `SELECT 
h.hra_num ${name ? `, e.first_name||' '||e.last_name as full_name`: ""}
FROM (SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
LEFT JOIN (${employee}) e 
on h.employee_id = e.id
LEFT JOIN (${equipment_count.hra}) hec
on h.hra_num = hec.hra_num
LEFT JOIN (${registered_users}) ur
on ur.id = h.updated_by `

const hra_num_form_all = (id, name=false) => `SELECT 
h.hra_num ${name ? `, e.first_name||' '||e.last_name as full_name`: ""}
FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})
union
SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
LEFT JOIN (${employee}) e 
on h.employee_id = e.id
LEFT JOIN (${equipment_count.hra}) hec
on h.hra_num = hec.hra_num
LEFT JOIN (${registered_users}) ur
on ur.id = h.updated_by `

const hra_num_form_auth = (id, name=false) => `SELECT 
h.hra_num ${name ? `, e.first_name||' '||e.last_name as full_name`: ""}
FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id})) h
LEFT JOIN (${employee}) e 
on h.employee_id = e.id
LEFT JOIN (${equipment_count.hra}) hec
on h.hra_num = hec.hra_num
LEFT JOIN (${registered_users}) ur
on ur.id = h.updated_by `

const hra_num_form_auth_not_in_self = (id, name=false) => `SELECT 
h.hra_num ${name ? `, e.first_name||' '||e.last_name as full_name`: ""}
FROM (SELECT * FROM HRA WHERE HRA_NUM IN (SELECT HRA_NUM FROM HRA_AUTHORIZED_USERS WHERE registered_users_ID = ${id}) AND
HRA_NUM NOT IN (
	SELECT h.hra_num
	FROM (SELECT * FROM HRA WHERE EMPLOYEE_ID IN (SELECT EMPLOYEE_ID FROM registered_users WHERE ID = ${id})) h
	LEFT JOIN (${employee}) e 
	on h.employee_id = e.id
	LEFT JOIN (${equipment_count.hra}) hec
	on h.hra_num = hec.hra_num
	LEFT JOIN (${registered_users}) ur
	on ur.id = h.updated_by
)) h
LEFT JOIN (${employee}) e 
on h.employee_id = e.id
LEFT JOIN (${equipment_count.hra}) hec
on h.hra_num = hec.hra_num
LEFT JOIN (${registered_users}) ur
on ur.id = h.updated_by `

const hra_type = (type) => `SELECT h.hra_num as ${type}_hra_num,
e.first_name as ${type}_hra_first_name,
e.last_name as ${type}_hra_last_name,
e.first_name || ' ' || e.last_name as ${type}_hra_full_name,
e.work_phone as ${type}_hra_work_phone,
e.office_symbol as ${type}_hra_office_symbol,
e.office_symbol_alias as ${type}_hra_os_alias,
CASE WHEN ru.id is not null THEN 1 ELSE 0 END ${type}_hra_is_registered
from hra h
left join (${employee}) e
on h.employee_id = e.id
left join registered_users ru
on ru.employee_id = e.id `

const eng4900SearchQuery = (id) => `SELECT 
f.id as form_id,
f.form_signature_group_id as form_signature_group_id,
f.status as status,
f.file_storage_id,
f.individual_ror_prop,
fs.status as status_alias,
ra.alias as REQUESTED_ACTION,
f.LOSING_HRA as losing_hra_num,
f.updated_date,
CASE WHEN f.LOSING_HRA IN (${hra_num_form_all(id)}) THEN 1 ELSE 0 END originator,
CASE WHEN f.LOSING_HRA IN (${hra_num_form_all(id)}) THEN 1 ELSE 0 END is_losing_hra,
CASE WHEN f.GAINING_HRA IN (${hra_num_form_all(id)}) THEN 1 ELSE 0 END is_gaining_hra,
l_hra.losing_hra_first_name,
l_hra.losing_hra_last_name,
l_hra.losing_hra_first_name || ' ' || l_hra.losing_hra_last_name as losing_hra_full_name,
l_hra.losing_hra_office_symbol,
l_hra.losing_hra_work_phone,
l_hra.losing_hra_is_registered,
f.GAINING_HRA as gaining_hra_num,
g_hra.gaining_hra_first_name,
g_hra.gaining_hra_last_name,
g_hra.gaining_hra_first_name || ' ' || g_hra.gaining_hra_last_name as gaining_hra_full_name,
g_hra.gaining_hra_office_symbol,
g_hra.gaining_hra_work_phone,
g_hra.gaining_hra_is_registered,
f.DATE_CREATED,
f.FOLDER_LINK,
f.DOCUMENT_SOURCE,
eg.form_equipment_group_ID as equipment_group_id,
e.id as EQUIPMENT_ID, 
	e.BAR_TAG_NUM , 
	e.CATALOG_NUM , 
	e.BAR_TAG_HISTORY_ID , 
	e.MANUFACTURER , 
	e."MODEL", 
	e.CONDITION , 
	e.SERIAL_NUM , 
	e.ACQUISITION_DATE , 
	e.ACQUISITION_PRICE , 
	e.DOCUMENT_NUM, 
	e.ITEM_TYPE , 
	e.USER_EMPLOYEE_ID
	from ${FORM_4900} f
	LEFT JOIN form_equipment_group eg on eg.form_equipment_group_id = f.form_equipment_group_id
	LEFT JOIN form_equipment e on e.id = eg.form_equipment_id
	LEFT JOIN requested_action ra on ra.id = f.requested_action
	LEFT JOIN (${hra_type("gaining")}) g_hra on f.gaining_hra = g_hra.gaining_hra_num 
	LEFT JOIN ( ${hra_type("losing")}) l_hra on f.losing_hra = l_hra.losing_hra_num
	LEFT JOIN FORM_4900_STATUS fs on f.status = fs.id `	

const eng4900SearchQueryHraNum = () => `SELECT f.id as form_id
	from ${FORM_4900} f
	LEFT JOIN form_equipment_group eg on eg.form_equipment_group_id = f.form_equipment_group_id
	LEFT JOIN form_equipment e on e.id = eg.form_equipment_id
	LEFT JOIN requested_action ra on ra.id = f.requested_action
	LEFT JOIN (${hra_type("gaining")}) g_hra on f.gaining_hra = g_hra.gaining_hra_num 
	LEFT JOIN ( ${hra_type("losing")}) l_hra on f.losing_hra = l_hra.losing_hra_num
	LEFT JOIN FORM_4900_STATUS fs on f.status = fs.id `	

const whereEng4900SignFormAuth = (id) => `WHERE (f.GAINING_HRA IN (${hra_num_form_auth(id)}) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2)) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2) AND g_hra.gaining_hra_is_registered = 0 AND f.GAINING_HRA NOT IN (SELECT hra_num from hra_authorized_users where hra_num = f.GAINING_HRA))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.GAINING_HRA IN (${hra_num_form_auth(id)} ) AND F.STATUS IN (102) AND F.REQUESTED_ACTION in (1, 2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND F.STATUS IN (102, 104) AND F.REQUESTED_ACTION in (2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND F.STATUS IN (108) AND F.REQUESTED_ACTION in (4))) `

const whereEng4900SignFormSelf = (id) => `WHERE (f.GAINING_HRA IN (${hra_num_form_self(id)}) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2)) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2) AND g_hra.gaining_hra_is_registered = 0 AND f.GAINING_HRA NOT IN (SELECT hra_num from hra_authorized_users where hra_num = f.GAINING_HRA))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.GAINING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (102) AND F.REQUESTED_ACTION in (1, 2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (102, 104) AND F.REQUESTED_ACTION in (2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (108) AND F.REQUESTED_ACTION in (4))) `

const whereEng4900SignFormAuthNotInSelf = (id) => `WHERE (f.GAINING_HRA IN (${hra_num_form_auth(id)}) AND NOT f.GAINING_HRA IN (${hra_num_form_self(id)}) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2)) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND NOT f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2) AND g_hra.gaining_hra_is_registered = 0 AND f.GAINING_HRA NOT IN (SELECT hra_num from hra_authorized_users where hra_num = f.GAINING_HRA))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.GAINING_HRA IN (${hra_num_form_auth(id)} ) AND NOT f.GAINING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (102) AND F.REQUESTED_ACTION in (1, 2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND NOT f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (102, 104) AND F.REQUESTED_ACTION in (2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND NOT f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA IN (${hra_num_form_auth(id)} ) AND NOT f.LOSING_HRA IN (${hra_num_form_self(id)} ) AND F.STATUS IN (108) AND F.REQUESTED_ACTION in (4))) `

const whereEng4900SignFormWithHraNum = (id, hra_num) => `WHERE (f.GAINING_HRA = ${hra_num} AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2)) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2) AND g_hra.gaining_hra_is_registered = 0 AND f.GAINING_HRA NOT IN (SELECT hra_num from hra_authorized_users where hra_num = f.GAINING_HRA))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.GAINING_HRA = ${hra_num} AND F.STATUS IN (102) AND F.REQUESTED_ACTION in (1, 2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (102, 104) AND F.REQUESTED_ACTION in (2, 3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (3, 4, 5))) 
UNION (${eng4900SearchQuery(id)} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (108) AND F.REQUESTED_ACTION in (4))) `

const whereEng4900SignFormWithHraNumNoId = (hra_num) => `WHERE (f.GAINING_HRA = ${hra_num} AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2)) 
UNION (${eng4900SearchQueryHraNum()} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (2) AND g_hra.gaining_hra_is_registered = 0 AND f.GAINING_HRA NOT IN (SELECT hra_num from hra_authorized_users where hra_num = f.GAINING_HRA))) 
UNION (${eng4900SearchQueryHraNum()} WHERE (f.GAINING_HRA = ${hra_num} AND F.STATUS IN (102) AND F.REQUESTED_ACTION in (1, 2, 3, 4, 5))) 
UNION (${eng4900SearchQueryHraNum()} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (102, 104) AND F.REQUESTED_ACTION in (2, 3, 4, 5))) 
UNION (${eng4900SearchQueryHraNum()} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (106) AND F.REQUESTED_ACTION in (3, 4, 5))) 
UNION (${eng4900SearchQueryHraNum()} WHERE (f.LOSING_HRA = ${hra_num} AND F.STATUS IN (108) AND F.REQUESTED_ACTION in (4))) `

const hra_total_employees = (hra_num) => `select count(unique(eq.user_employee_id)) as total_employees, ${hra_num} as hra_num from hra h
left join employee e
on e.id = h.hra_num
left join equipment eq
on eq.hra_num = h.hra_num
where h.hra_num = ${hra_num} AND eq.user_employee_id is not null `;

const hra_total_equipments = (hra_num) => `select count(*) as total_equipments, ${hra_num} as hra_num from hra h
left join employee e
on e.id = h.hra_num
left join equipment eq
on eq.hra_num = h.hra_num
where h.hra_num = ${hra_num} `

const hra_total_employees_cert_current_fy = (hra_num) => `select count(unique(eq.bar_tag_num)) as total_employees_cert_current_fy, ${hra_num} as hra_num from hra h
left join employee e
on e.id = h.hra_num
left join equipment eq
on eq.hra_num = h.hra_num
where h.hra_num = ${hra_num} AND eq.user_employee_id is not null and
eq.status_date between TO_DATE(TO_CHAR(add_months(sysdate,-9),'YYYY')|| '' ||'-10-01','YYYY-MM-DD') AND TO_DATE(TO_CHAR(add_months(sysdate,3),'YYYY')|| '' ||'-09-01','YYYY-MM-DD') `

const last_login = (id) => `SELECT ru.edipi, uah.full_name, uah.date_accessed
FROM registered_users ru
LEFT JOIN user_access_history uah ON uah.edipi = ru.edipi
WHERE ru.id = ${id}
ORDER BY uah.date_accessed DESC
OFFSET CASE WHEN (SELECT COUNT(*) FROM user_access_history uah
left join registered_users ru
on ru.edipi = uah.edipi WHERE ru.id = ${id}) = 1 THEN 0 ELSE 1 END ROWS
FETCH NEXT 1 ROWS ONLY; `

const my_total_equipments = (id) => `select count(*) as my_total_equipments from registered_users ru
left join employee e
on e.id = ru.employee_id
left join equipment eq
on eq.user_employee_id = e.id
where ru.id = ${id} `

const my_equipments_cert_current_fy = (id) => `select count(*) as my_equipments_cert_current_fy  from registered_users ru
left join employee e
on e.id = ru.employee_id
left join equipment eq
on eq.user_employee_id = e.id
where ru.id = ${id} AND eq.status_date between TO_DATE(TO_CHAR(add_months(sysdate,-9),'YYYY')|| '' ||'-10-01','YYYY-MM-DD') AND TO_DATE(TO_CHAR(add_months(sysdate,3),'YYYY')|| '' ||'-09-01','YYYY-MM-DD') `

const system_annoucements = () => `select * from system_announcements order by id `

const getUserDashboardEquipment = (id) => `SELECT ru.id as "id", e.first_name as "first_name", e.last_name as "last_name", case when MAX(uah.date_accessed) is null then sysdate else MAX(uah.date_accessed) end as "last_login_string",
CASE WHEN my_total_equipments.my_total_equipments is null THEN 0 else my_total_equipments.my_total_equipments end as "my_equipments",
CASE WHEN my_equipments_cert_current_fy.my_equipments_cert_current_fy is null THEN 0 else my_equipments_cert_current_fy.my_equipments_cert_current_fy end as "my_equipments_cert",
round( (CASE WHEN (my_equipments_cert_current_fy.my_equipments_cert_current_fy is null) THEN 0 / (
CASE WHEN (my_total_equipments.my_total_equipments is null OR my_total_equipments.my_total_equipments = 0) THEN 1 else my_total_equipments.my_total_equipments end 
) else(
 my_equipments_cert_current_fy.my_equipments_cert_current_fy / (
 CASE WHEN (my_total_equipments.my_total_equipments is null OR my_total_equipments.my_total_equipments = 0) THEN 1 else my_total_equipments.my_total_equipments end)
)end ) * 100, 2) as "my_equipments_cert_porcentage"
FROM registered_users ru
LEFT JOIN (select uah.edipi, uah.full_name, uah.date_accessed as from registered_users ru
	left join user_access_history uah
	on uah.edipi = ru.edipi
	where ru.id = ${id}
	order by uah.date_accessed desc
	OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY) uah
ON ru.edipi = uah.edipi
LEFT JOIN (
SELECT ru.id, count(eq.id) as my_total_equipments
FROM registered_users ru
LEFT JOIN employee e
ON e.id = ru.employee_id
LEFT JOIN equipment eq
ON eq.user_employee_id = e.id
GROUP BY ru.id
) my_total_equipments
ON ru.id = my_total_equipments.id
LEFT JOIN (
SELECT ru.id, count(eq.id) as my_equipments_cert_current_fy
FROM registered_users ru
LEFT JOIN employee e
ON e.id = ru.employee_id
LEFT JOIN equipment eq
ON eq.user_employee_id = e.id
WHERE  eq.status_date between TO_DATE(TO_CHAR(add_months(sysdate,-9),'YYYY')|| '' ||'-10-01','YYYY-MM-DD') 
	AND TO_DATE(TO_CHAR(add_months(sysdate,3),'YYYY')|| '' ||'-09-01','YYYY-MM-DD')
GROUP BY ru.id
) my_equipments_cert_current_fy
ON ru.id = my_equipments_cert_current_fy.id
LEFT JOIN (
SELECT id, first_name, last_name from employee
) e
ON e.id = ru.employee_id
where ru.id = ${id}
GROUP BY ru.id, uah.full_name, e.first_name,e.last_name, my_total_equipments.my_total_equipments, 
  my_equipments_cert_current_fy.my_equipments_cert_current_fy `

  const getHraUserDashboardEquipment = (hra_num) => `select t1.hra_num as "hra_num", (case when t4.first_name is null then '' else t4.first_name||' ' end)||t4.last_name as "full_name",
  t1.total_employees as "total_employees", t2.total_equipments as "total_equipments", 
  case when t3.total_employees_cert_current_fy is null then 0 else t3.total_employees_cert_current_fy end as "total_equipments_cert",
  
  round( (CASE WHEN (t3.total_employees_cert_current_fy  is null) THEN 0 / (
  CASE WHEN t2.total_equipments is null OR t2.total_equipments = 0 THEN 1 else t2.total_equipments end 
  ) else(
  t3.total_employees_cert_current_fy  / (
  CASE WHEN t2.total_equipments is null OR t2.total_equipments = 0 THEN 1 else t2.total_equipments end)
  )end ) * 100, 2) as "total_equipments_cert_porcentage"
  
  from (select count(unique(eq.user_employee_id)) as total_employees, h.hra_num
  from hra h
  left join employee e
  on e.id = h.hra_num
  left join equipment eq
  on eq.hra_num = h.hra_num
  group by h.hra_num) t1
  left join
  (select count(unique(eq.id)) as total_equipments, h.hra_num
  from hra h
  left join employee e
  on e.id = h.hra_num
  left join equipment eq
  on eq.hra_num = h.hra_num
  group by h.hra_num) t2
  on t2.hra_num = t1.hra_num
  left join
  (select count(unique(eq.id)) as total_employees_cert_current_fy, h.hra_num
  from hra h
  left join employee e
  on e.id = h.hra_num
  left join equipment eq
  on eq.hra_num = h.hra_num
  where eq.user_employee_id is not null and
  eq.status_date between TO_DATE(TO_CHAR(add_months(sysdate,-9),'YYYY')|| '' ||'-10-01','YYYY-MM-DD') AND TO_DATE(TO_CHAR(add_months(sysdate,3),'YYYY')|| '' ||'-09-01','YYYY-MM-DD')
  group by h.hra_num) t3
  on t2.hra_num = t3.hra_num
  left join (select hra_num, e.first_name, e.last_name
  from hra h
  left join employee e
  on e.id = h.employee_id) t4
  on t4.hra_num = t1.hra_num
  where t1.hra_num = ${hra_num} `

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
	ol.NAME as employee_office_location_name,
	ol.latitude as employee_office_location_latitude,
	ol.longitude as employee_office_location_longitude
	FROM ${EQUIPMENT} eq
	LEFT JOIN employee e
	on eq.user_employee_id = e.id
	LEFT JOIN (${registered_users}) ur
	on ur.id = eq.updated_by
	LEFT JOIN OFFICE_LOCATION ol
	on ol.id = e.office_location_id `,
	hra_employee_edit_rights:`SELECT
	e.id as hra_employee_id,
	ur.updated_by_full_name,
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
	union
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
	hra_num_form_all: hra_num_form_all,
	hra_num_form_auth: hra_num_form_auth,
	hra_num_form_auth_not_in_self:hra_num_form_auth_not_in_self,
	hra_num_form_self: hra_num_form_self,
	employee_id_auth: (id) => (`select distinct e.id from employee e
	left join registered_users ru
	on ru.employee_id = e.id
	LEFT JOIN HRA H
	ON E.ID = H.EMPLOYEE_ID
	where (office_symbol in (
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
    	  ) AND (select user_level from registered_users where id = ${id} and user_level in (1,9,11)) is not null
	) OR (select user_level from registered_users where id = ${id} and user_level = 1) is not null OR
	 ((select user_level from registered_users where id = ${id} and user_level in (9,11)) is not null AND H.HRA_NUM IS NULL AND E.OFFICE_SYMBOL IS NULL)
    UNION
    SELECT employee_id FROM registered_users WHERE id = ${id}`),
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
	eng4900_losingHra: hra_type("losing"),
	// `SELECT h.hra_num as losing_hra_num,
	// 	e.first_name as losing_hra_first_name,
	// 	e.last_name as losing_hra_last_name,
	// 	e.first_name || ' ' || e.last_name as losing_hra_full_name,
	// 	e.work_phone as losing_hra_work_phone,
	// 	e.office_symbol as losing_hra_office_symbol,
	// 	e.office_symbol_alias as losing_hra_os_alias,
	// 	CASE WHEN ru.id is not null THEN 1 ELSE 0 END losing_hra_is_registered
	// 	from hra h
	// 	left join (${employee}) e
	// 	on h.employee_id = e.id
	// 	left join registered_users ru
	// 	on ru.employee_id = e.id `,
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
	eng4900_gainingHra: hra_type("gaining"),
	// `SELECT h.hra_num as gaining_hra_num,
	// 	e.first_name as gaining_hra_first_name,
	// 	e.last_name as gaining_hra_last_name,
	// 	e.first_name || ' ' || e.last_name as gaining_hra_full_name,
    //     e.work_phone as gaining_hra_work_phone,
	// 	e.office_symbol as gaining_hra_office_symbol,
	// 	e.office_symbol_alias as gaining_hra_os_alias,
	// 	CASE WHEN ru.id is not null THEN 1 ELSE 0 END gaining_hra_is_registered
	// 	from hra h
	// 	left join (${employee}) e
	// 	on h.employee_id = e.id
	// 	left join registered_users ru
	// 	on ru.employee_id = e.id `,
	eng4900SearchQuery: eng4900SearchQuery,
	whereEng4900SignFormAuth: whereEng4900SignFormAuth,
	whereEng4900SignFormSelf: whereEng4900SignFormSelf,
	whereEng4900SignFormAuthNotInSelf: whereEng4900SignFormAuthNotInSelf,
	whereEng4900SignFormWithHraNum: whereEng4900SignFormWithHraNum,
	hra_total_employees: hra_total_employees,
 	hra_total_equipments: hra_total_equipments,
	hra_total_employees_cert_current_fy: hra_total_employees_cert_current_fy,
	last_login: last_login,
	my_total_equipments: my_total_equipments,
	my_equipments_cert_current_fy: my_equipments_cert_current_fy,
	system_annoucements: system_annoucements,
	getUserDashboardEquipment: getUserDashboardEquipment,
	getHraUserDashboardEquipment: getHraUserDashboardEquipment,
};


// SELECT ru.id, e.first_name, e.last_name, MAX(uah.date_accessed) as last_login_date, 
//        CASE WHEN my_total_equipments.my_total_equipments is null THEN 0 else my_total_equipments.my_total_equipments end as my_total_equipments,
//        CASE WHEN my_equipments_cert_current_fy.my_equipments_cert_current_fy is null THEN 0 else my_equipments_cert_current_fy.my_equipments_cert_current_fy end as my_equipments_cert_current_fy,
//        round( (CASE WHEN (my_equipments_cert_current_fy.my_equipments_cert_current_fy is null) THEN 0 / (
//        CASE WHEN my_total_equipments.my_total_equipments is null THEN 0 else my_total_equipments.my_total_equipments end 
//        ) else(
//         my_equipments_cert_current_fy.my_equipments_cert_current_fy / (
//         CASE WHEN my_total_equipments.my_total_equipments is null THEN 0 else my_total_equipments.my_total_equipments end)
//        )end ) * 100, 2) as percentage
// FROM registered_users ru
// LEFT JOIN user_access_history uah
// ON ru.edipi = uah.edipi
// LEFT JOIN (
//   SELECT ru.id, count(*) as my_total_equipments
//   FROM registered_users ru
//   LEFT JOIN employee e
//   ON e.id = ru.employee_id
//   LEFT JOIN equipment eq
//   ON eq.user_employee_id = e.id
//   GROUP BY ru.id
// ) my_total_equipments
// ON ru.id = my_total_equipments.id
// LEFT JOIN (
//   SELECT ru.id, count(*) as my_equipments_cert_current_fy
//   FROM registered_users ru
//   LEFT JOIN employee e
//   ON e.id = ru.employee_id
//   LEFT JOIN equipment eq
//   ON eq.user_employee_id = e.id
//   WHERE  eq.status_date between TO_DATE(TO_CHAR(add_months(sysdate,-9),'YYYY')|| '' ||'-10-01','YYYY-MM-DD') 
//            AND TO_DATE(TO_CHAR(add_months(sysdate,3),'YYYY')|| '' ||'-09-01','YYYY-MM-DD')
//   GROUP BY ru.id
// ) my_equipments_cert_current_fy
// ON ru.id = my_equipments_cert_current_fy.id
// LEFT JOIN (
//   SELECT id, first_name, last_name from employee
// ) e
// ON e.id = ru.employee_id
// GROUP BY ru.id, uah.full_name, e.first_name,e.last_name, my_total_equipments.my_total_equipments, 
//          my_equipments_cert_current_fy.my_equipments_cert_current_fy;



// select t1.hra_num as "hra_num", t1.total_employees as "total_employees", t2.total_equipments as "total_equipments", 
// case when t3.total_employees_cert_current_fy is null then 0 else t3.total_employees_cert_current_fy end as "total_equipments_cert",

// round( (CASE WHEN (t3.total_employees_cert_current_fy  is null) THEN 0 / (
// CASE WHEN t2.total_equipments is null OR t2.total_equipments = 0 THEN 1 else t2.total_equipments end 
// ) else(
// t3.total_employees_cert_current_fy  / (
// CASE WHEN t2.total_equipments is null OR t2.total_equipments = 0 THEN 1 else t2.total_equipments end)
// )end ) * 100, 2) as "total_equipments_cert_porcentage"

// from (select count(unique(eq.user_employee_id)) as total_employees, h.hra_num from hra h
// left join employee e
// on e.id = h.hra_num
// left join equipment eq
// on eq.hra_num = h.hra_num
// group by h.hra_num) t1
// left join
// (select count(unique(eq.id)) as total_equipments, h.hra_num from hra h
// left join employee e
// on e.id = h.hra_num
// left join equipment eq
// on eq.hra_num = h.hra_num
// group by h.hra_num) t2
// on t2.hra_num = t1.hra_num
// left join
// (select count(unique(eq.id)) as total_employees_cert_current_fy, h.hra_num from hra h
// left join employee e
// on e.id = h.hra_num
// left join equipment eq
// on eq.hra_num = h.hra_num
// where eq.user_employee_id is not null and
// eq.status_date between TO_DATE(TO_CHAR(add_months(sysdate,-9),'YYYY')|| '' ||'-10-01','YYYY-MM-DD') AND TO_DATE(TO_CHAR(add_months(sysdate,3),'YYYY')|| '' ||'-09-01','YYYY-MM-DD')
// group by h.hra_num) t3
// on t2.hra_num = t3.hra_num
