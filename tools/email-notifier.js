//const oracledb = require('oracledb');
//const dbConfig = require('../dbconfig.js');
const {dbSelectOptions} = require('../config/db-options');
const moment = require('moment')
const sendmail = require('sendmail')();

const ACTION_BY_STATUS = {
  2:  {label:"Individual/Vendor", type:"individual_vendor"},
  3:  {label:"Individual/Vendor", type:"individual_vendor"},
  4:  {label:"Losing HRA", type:"losing_hra"},
  5:  {label:"Losing HRA", type:"losing_hra"},
  6:  {label:"Gaining HRA", type:"gaining_hra"},
  7:  {label:"Gaining HRA", type:"gaining_hra"},
  8:  {label:"Logistics", type:"logistics"},
  8:  {label:"Logistics", type:"logistics"},
  10: {label:"PBO", type:"pbo"},
  11: {label:"PBO", type:"pbo"},
}

const STEPS_TO_SIGN_FORM = `To sign this document, please execute the following steps:<br/><br/>
    Go to Corps Inventory Control Application - https://sajgis.saj.usace.army.mil/inventory.<br/>
    Click on ENG4900.<br/>
    Click on SIGN FORMS.<br/>
    Click on the "View PDF" Icon of your form record to download document.<br/>
    Open PDF and sign.<br/>
    Click "Upload PDF" to upload signed document.<br/>
    Select "Completed..." and attach signed PDF or "Form Reject" if you do not approve.<br/><br/>
    If you have already signed your document, please disregard this email.`

const printEquipmentsWithBreaks = (elements) => {
  let str = ""
  for(let i=0; i<elements.length; i++){
    str += `${elements[i].information}.<br/>`
  }
  return str
}

const HraIssueSignatureTypeLabel = (obj) => {
    if(obj.requested_action_alias ==  "Issue"){
      return "Individual/Vendor"
    }else if(obj.hra_type == "losing_hra"){ 
      return "Losing HRA"
    }else if(obj.hra_type == "gaining_hra"){
      return "Gaining HRA"
    }
    return ""
}

const subject = {
  form_4900_issue_complete: (obj) => `Notification: ENG4900 - ${obj.id} has been completed.`,
  form_4900_issue_signature_required_notification: (obj) => `Notification: ENG4900 - ${obj.id} ${obj.action == obj.hra_type ? `needs ${obj.notify_is_hra ? "your" : "HRA"}` : `was sent to HRA for`} signature.`,
  form_4900_issue_signature_completed_notification: (obj) => `Notification: ENG4900 - ${obj.id} was signed.`,
  form_4900_issue_signature_rejected_notification: (obj) => `Notification: ENG4900 - ${obj.id} was rejected.`,

  form_4900_trf_complete: (obj) => `Notification: ENG4900 - ${obj.id} has been completed.`,
  form_4900_trf_signature_required_notification: (obj) => `Notification: ENG4900 - ${obj.id} ${obj.action == obj.hra_type ? `needs ${obj.notify_is_hra ? "your" : "HRA"}` : `was sent to HRA for`} signature.`,
  form_4900_trf_signature_completed_notification: (obj) => `Notification: ENG4900 - ${obj.id} was signed.`,
  form_4900_trf_signature_rejected_notification: (obj) => `Notification: ENG4900 - ${obj.id} was rejected.`,

  form_4900_excess_complete: (obj) => `Notification: ENG4900 - ${obj.id} has been completed.`,
  form_4900_excess_signature_required_notification: (obj) => `Notification: ENG4900 - ${obj.id} needs signature.`,
  form_4900_excess_signature_completed_notification: (obj) => `Notification: ENG4900 - ${obj.id} was signed.`,
  form_4900_excess_signature_rejected_notification: (obj) => `Notification: ENG4900 - ${obj.id} was rejected`,
}

const DateTimePrint = (obj) => `${obj.updated_date ? `Date/Time: ${moment(obj.updated_date).format("MMMM DD, YYYY HH:mm:ss")}.<br/><br/>` : ""}`

const html_body = {

  form_4900_issue_complete: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ENG4900 "${obj.requested_action_alias}" form (${obj.id}) has been completed.<br/><br/>

  HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Completed by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>
  -Inventory App Notifications`,
  form_4900_issue_signature_required_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ENG4900 "${obj.requested_action_alias}" form (${obj.id}) ${obj.notify_is_hra ? `needs your ${HraIssueSignatureTypeLabel(obj)}`: `requires ${HraIssueSignatureTypeLabel(obj)}`} signature.<br/><br/>

  HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Updated by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  ${STEPS_TO_SIGN_FORM}<br/><br/>

  -Inventory App Notifications`,
  form_4900_issue_signature_rejected_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was rejected.<br/><br/>

  Signature Type: ${ACTION_BY_STATUS[obj.previous_status].label}.<br/><br/>

  HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}<br/><br/>
  
  ${obj.notify_employee_id != obj.updated_by_employee_id ? `Rejected by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  -Inventory App Notifications`,

  form_4900_trf_complete: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ENG4900 "${obj.requested_action_alias}" form (${obj.id}) has been completed.<br/><br/>

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/><br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Completed by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>
  -Inventory App Notifications`,
  form_4900_trf_signature_required_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ${obj.action == obj.hra_type ? (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) ${obj.notify_is_hra ? `needs your ${ACTION_BY_STATUS[obj.status].label} signature`: `requires ${ACTION_BY_STATUS[obj.status].label} signature`}.<br/><br/>`
  ) : (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was sent to ${ACTION_BY_STATUS[obj.status].label} for signature.<br/><br/>`
  )}

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/><br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Updated by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  ${STEPS_TO_SIGN_FORM}<br/><br/>

  -Inventory App Notifications`,
  form_4900_trf_signature_completed_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ${obj.action == obj.hra_type ? (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was signed ${obj.notify_is_hra ? "on your behalf": ""}.<br/><br/>`
  ) : (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was sent to ${ACTION_BY_STATUS[obj.status].label} ${obj.notify_is_hra ? "on your behalf": ""}.<br/><br/>`
  )}

  Signature Type: ${ACTION_BY_STATUS[obj.status].label}.<br/><br/>

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/><br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Signed by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  ${STEPS_TO_SIGN_FORM}<br/><br/>

  -Inventory App Notifications`,
  form_4900_trf_signature_rejected_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ${obj.action == obj.hra_type ? (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was rejected${obj.notify_is_hra ? "on your behalf": ""}.<br/><br/>`
  ) : (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was rejected.<br/><br/>`
  )}

  Signature Type: ${ACTION_BY_STATUS[obj.previous_status].label}.<br/><br/>

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/><br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Rejected by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  ${STEPS_TO_SIGN_FORM}<br/><br/>

  -Inventory App Notifications`,

  form_4900_excess_complete: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ENG4900 "${obj.requested_action_alias}" form (${obj.id}) has been completed.<br/><br/>

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Completed by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>
  -Inventory App Notifications`,
  form_4900_excess_signature_required_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>
  
  ENG4900 "${obj.requested_action_alias}" form (${obj.id}) needs${obj.hra_type == obj.action && ACTION_BY_STATUS[obj.status].type == obj.action && obj.notify_is_hra ? " your": ""} ${ACTION_BY_STATUS[obj.status].label} signature.<br/><br/>

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Updated by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  ${STEPS_TO_SIGN_FORM}<br/><br/>

  -Inventory App Notifications`,
  form_4900_excess_signature_completed_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ${obj.action == obj.hra_type ? (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was signed ${obj.notify_is_hra ? "on your behalf": ""}.<br/><br/>`
  ) : (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was sent to ${ACTION_BY_STATUS[obj.status].label} ${obj.notify_is_hra ? "on your behalf": ""}.<br/><br/>`
  )}

  Signature Type: ${ACTION_BY_STATUS[obj.status].label}.<br/><br/>

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Signed by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  -Inventory App Notifications`,
  form_4900_excess_signature_rejected_notification: (obj) => `Att: ${obj.notify_first_name ? obj.notify_first_name : ""} ${obj.notify_last_name},<br/><br/>

  ${obj.action == obj.hra_type ? (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was rejected${obj.notify_is_hra ? "on your behalf": ""}.<br/><br/>`
  ) : (
    `ENG4900 "${obj.requested_action_alias}" form (${obj.id}) was rejected.<br/><br/>`
  )}

  Signature Type: ${ACTION_BY_STATUS[obj.previous_status].label}.<br/><br/>

  Losing HRA Account: ${obj.losing_hra_num} - ${obj.losing_hra_first_name ? obj.losing_hra_first_name : ""} ${obj.losing_hra_last_name}.<br/>
  Gaining HRA Account: ${obj.gaining_hra_num} - ${obj.gaining_hra_first_name ? obj.gaining_hra_first_name : ""} ${obj.gaining_hra_last_name}.<br/><br/>

  ${obj.updated_by_employee_id != obj.notify_employee_id ? `Rejected by: ${obj.updated_by_first_name ? obj.updated_by_first_name : ""} ${obj.updated_by_last_name}.<br/><br/>` : ""}

  ${DateTimePrint(obj)}

  Equipment list:<br/>
  ${printEquipmentsWithBreaks(obj.equipments)}<br/>

  -Inventory App Notifications`,

  // losing_hra_signature_required: (obj) => `Att: ${obj.hra_full_name},<br/><br/>
  // You have a new form awaiting signature.`,

  // gaining_hra_signature_required: (obj) => `Att: ${obj.hra_full_name},<br/><br/>
  // You have a new form awaiting signature.`,

  // losing_hra_auth_user_signed_form: "",
  // gaining_hra_auth_user_signed_form: "",

  // hra_signature_required_reminder:"",
  // auth_user_signature_required_reminder:"",

  // form_rejected_by_losing_hra:"",
  // form_rejected_by_gaining_hra:"",

  // new_user_registration_pending:""
}

module.exports = {
  form4900EmailAlert: async function (id, connection) {
    //const id = 190;
    //const connection =  await oracledb.getConnection(dbConfig);
    
    let sql = `select requested_action as "requested_action", ra.alias as "requested_action_alias", losing_hra as "losing_hra", gaining_hra as "gaining_hra", updated_by as "last_update", CASE WHEN status > 100 THEN status - 100 ELSE status END "status", f_last.previous_status as "previous_status" from form_4900 f
    left join requested_action ra on ra.id = f.requested_action 
    left join (select fh.id, CASE WHEN fh.status > 100 THEN fh.status - 100 ELSE fh.status END previous_status from form_4900_history fh
                where fh.id = :0 and updated_date = (select max(updated_date) from form_4900_history where id = :0)) f_last on f.id = f_last.id
    where f.id = :0`
  
    let result = await connection.execute(sql,[id],dbSelectOptions)
  
    if(result.rows.length > 0){
      const {status, previous_status, requested_action, requested_action_alias, losing_hra, gaining_hra, last_update} = result.rows[0]
      let hras = []
      let message_type = ""
      let action = ""
      let form_complete = false
      
  
      switch(requested_action_alias) {
        case "Issue":// 1
  
          if(status == 2){
            //alert gaining_hra signature required if he did not update the form.
            hras = ["gaining_hra"]
            action = "gaining_hra"
            message_type = "form_4900_issue_signature_required_notification"
          }else if(status == 3){
            //alert gaining_hra of new equipment received.
            hras = ["gaining_hra"]
            action = "gaining_hra"
            message_type = "form_4900_issue_complete"
            form_complete = true
          }else if(status == 12){
            //alert gaining_hra of rejected form.
            hras = ["gaining_hra"]
            action = "gaining_hra"
            message_type = "form_4900_issue_signature_rejected_notification"
          }
  
          break;
  
        case "Transfer":// 2
        case "Repair":// 3
        case "FOI":// 4
          if(status == 4){
            //alert losing_hra signature required if he did not update the form.
            hras = ["losing_hra"]
            action = "losing_hra"
            message_type = "form_4900_trf_signature_required_notification"
  
          }else if(status == 5){
            //alert losing_hra of signed form if done by authorized user.
            hras = ["losing_hra"]
            action = "losing_hra"
            message_type = "form_4900_trf_signature_completed_notification"
  
          }else if(status == 6){
            //alert gaining_hra signature required.
            hras = ["losing_hra","gaining_hra"]
            action = "gaining_hra"
            message_type = "form_4900_trf_signature_required_notification"
  
          }else if(status == 7){
            //alert gaining_hra of signed form and new equipments recieved.
            hras = ["losing_hra","gaining_hra"]
            action = "losing_hra"
            message_type = "form_4900_trf_complete"
            form_complete = true
  
          }else if(status == 12){
            //alert losing_hra of rejected form.
            hras = ["losing_hra"]
            action = "losing_hra"
            message_type = "form_4900_trf_signature_rejected_notification"
  
            if(previous_status == 6){
              hras.push("gaining_hra")
            }
  
          }
  
          break;
  
        case "Excess":// 5
  
          if(status == 4){
            //alert losing_hra signature required if he did not update the form.
            hras = ["losing_hra"]
            action = "losing_hra"
            message_type = "form_4900_excess_signature_required_notification"
  
          }else if(status == 5){
            //alert losing_hra of signed form if done by authorized user.
            hras = ["losing_hra"]
            action = "losing_hra"
            message_type = "form_4900_excess_signature_completed_notification"
  
          }else if(status == 6){
            //alert gaining_hra signature required.
            hras = ["losing_hra","gaining_hra"]
            action = "gaining_hra"
            message_type = "form_4900_excess_signature_required_notification"
  
          }else if(status == 7){
            //alert gaining_hra of signed form and new equipments recieved.
            hras = ["losing_hra","gaining_hra"]
            action = "losing_hra"
            message_type = "form_4900_excess_signature_completed_notification"
  
          }else if(status == 8){
            hras = ["losing_hra","gaining_hra"]
            action = "losing_hra"
            message_type = "form_4900_excess_signature_required_notification"
  
          }else if(status == 9){
            //alert losing_hra of equipment discarted.
            hras = ["losing_hra","gaining_hra"]
            action = "losing_hra"
            message_type = "form_4900_excess_complete"
            form_complete = true
  
          }else if(status == 12){
              //alert losing_hra of rejected form.
              hras = ["losing_hra"]
              action = "losing_hra"
              message_type = "form_4900_excess_signature_rejected_notification"
  
              if(previous_status == 6){
                hras.push("gaining_hra")
              } 
          }
  
          break;
      }
  
      //console.log(`status: ${status}, previous_status: ${previous_status}, action: ${action}, requested_action: ${requested_action_alias}`)
  
      if(message_type){
        let sql_hra = ""
  
        for(const hra of hras){
          sql_hra = (sql_hra != "" ? `${sql_hra} UNION ` : '')
          const l_or_g = (hra == "losing_hra" ? "l" : "g")
  
          //Query will fetch HRA if he did not update the form. 
          //Query will fetch HRA Authorized Users which updated the form on any previous step.
          //Query will fetch every registered HRA and authorized users who updated the completed form.
  
          sql_hra += `select f.updated_date as "updated_date", '${hra}' as "hra_type", f.id as "id", e_ub.id as "updated_by_employee_id", e_ub.first_name as "updated_by_first_name", e_ub.last_name as "updated_by_last_name", hl.hra_num as "losing_hra_num", el.id as "losing_hra_employee_id", el.first_name as "losing_hra_first_name", el.last_name as "losing_hra_last_name", hg.hra_num as "gaining_hra_num", eg.id as "gaining_hra_employee_id", eg.first_name as "gaining_hra_first_name", eg.last_name as "gaining_hra_last_name", e${l_or_g}.id as "notify_employee_id", e${l_or_g}.first_name as "notify_first_name", e${l_or_g}.last_name as "notify_last_name", e${l_or_g}.email as "notify_email", 1 as "notify_is_hra" from (select id, requested_action, losing_hra, gaining_hra, updated_by, updated_date, CASE WHEN status > 100 THEN status - 100 ELSE status END status from form_4900
            where id = :0) f
            left join hra hl on f.losing_hra = hl.hra_num
            left join employee el on el.id = hl.employee_id
            left join registered_users rul on el.id = rul.employee_id
            left join hra hg on f.gaining_hra = hg.hra_num
            left join employee eg on eg.id = hg.employee_id
            left join registered_users rug on eg.id = rug.employee_id
            left join registered_users ru_ub on ru_ub.id = f.updated_by
            left join employee e_ub on e_ub.id = ru_ub.employee_id
            where ${form_complete ? "" : `not f.updated_by = ru${l_or_g}.id and`} e${l_or_g}.email is not null and not ru${l_or_g}.notifications = 0
            UNION
            select f.updated_date as "updated_date", '${hra}' as "hra_type", f.id as "id", e_ub.id as "updated_by_employee_id", e_ub.first_name as "updated_by_first_name", e_ub.last_name as "updated_by_last_name", hl.hra_num as "losing_hra_num", el.id as "losing_hra_employee_id", el.first_name as "losing_hra_first_name", el.last_name as "losing_hra_last_name", hg.hra_num as "gaining_hra_num", eg.id as "gaining_hra_employee_id", eg.first_name as "gaining_hra_first_name", eg.last_name as "gaining_hra_last_name", e.id as "notify_employee_id", e.first_name as "notify_first_name", e.last_name as "notify_last_name", e.email as "notify_email", 0 as "notify_is_hra" from (select id, requested_action, losing_hra, gaining_hra, updated_by, updated_date, CASE WHEN status > 100 THEN status - 100 ELSE status END status from form_4900
            where id = :0) f
            left join hra_authorized_users hau on f.${hra} = hau.hra_num
            left join registered_users ru on ru.id = hau.registered_users_id
            left join employee e on e.id = ru.employee_id
            left join hra hl on f.losing_hra = hl.hra_num
            left join employee el on el.id = hl.employee_id
            left join registered_users rul on el.id = rul.employee_id
            left join hra hg on f.gaining_hra = hg.hra_num
            left join employee eg on eg.id = hg.employee_id
            left join registered_users rug on eg.id = rug.employee_id
            left join registered_users ru_ub on ru_ub.id = f.updated_by
            left join employee e_ub on e_ub.id = ru_ub.employee_id
            where ru.id in (select distinct updated_by from form_4900_history ffh where ffh.id = :0 ${form_complete ? "" : `and not ffh.updated_by = f.updated_by`}
            union select distinct updated_by from form_4900 ff where ff.id = :0 ${form_complete ? "" : `and not ff.updated_by = f.updated_by`}) and e.email is not null and not ru.notifications = 0
            `
        }
  
        console.log(sql_hra.replace(/:0/g,id))
  
        result = await connection.execute(sql_hra,[id],dbSelectOptions)
        
        if(result.rows.length > 0){
  
          let sql_equipments = `select fe.bar_tag_num || ' - ' || fe.item_type as "information" from form_4900 f
          left join form_equipment_group feg on feg.form_equipment_group_id = f.form_equipment_group_id
          join form_equipment fe on fe.id = feg.form_equipment_id
          where f.id = :0`
  
          const result_equipment = await connection.execute(sql_equipments,[id],dbSelectOptions)
          let array_of_opts_obj = []
  
          if(result_equipment.rows.length > 0){
            for(const user of result.rows){
              //user.notify_email
              const opts_obj = {...user, equipments: result_equipment.rows, requested_action_alias: requested_action_alias, hra_type:user.hra_type, action: action, status:status, previous_status:previous_status}
              const obj_settings = {from: 'no-reply-inventory@usace.army.mil', to:user.notify_email, subject:subject[message_type](opts_obj), html:html_body[message_type](opts_obj)}
  
              if(!array_of_opts_obj.includes(obj_settings.to)){
                //Will not send more than one email to a user.
                array_of_opts_obj.push(obj_settings.to)
                //console.log(obj_settings)
                const s = {...obj_settings, to: 'kevin.l.alemany@usace.army.mil'}
  
                //console.log(s)
                sendmail(s, function(err, reply) {
                  //console.log(err && err.stack);
                  //console.dir(reply);
  
                  console.log(!err ? "email sent.": "")
                });
              }
              //else{
                //console.log('-- discarted email --',user,obj_settings,"-- END --")
              //}
            }
          }
        }//else{
          //console.log("no emails sent.")
        //}
      }//else{
        //console.log("no emails sent.")
      //}
    }

    return "done";
  }
};




//form4900EmailAlert()

//console.log("This should print first.")

//console.log(queryForSearch(1))
//const connection =  await oracledb.getConnection(dbConfig);

//Cases:
//Notice: You have a new ENG4900 form that requires your signature.
//Notice: A signed ENG4900 form was uploaded under your name.
//Notice: You have recieved N Equipments from HRA ... 

//Reminder: You have a ENG4900 form that requires your signature.
//Reminder: HRA ... has not signed ENG4900 form.


// sendmail({
//   from: 'no-reply@usace.army.mil',
//   to: 'kevin.l.alemany@usace.army.mil',
//   subject: 'Hello from the Inventory Application - test email',
//   html: `Hello Hello Hello,<br/><br/>

//   You are receiving this email because you are part of the develoment of the Inventory Application for CESAJ.<br/><br/>

//   Let Kevin Alemany know if you recieved this email.<br/><br/>

//   ░░░░░░░░░░░░░░░░░░░░░░█████████<br/>
//   ░░███████░░░░░░░░░░███▒▒▒▒▒▒▒▒███<br/>
//   ░░█▒▒▒▒▒▒█░░░░░░░███▒▒▒▒▒▒▒▒▒▒▒▒▒███<br/>
//   ░░░█▒▒▒▒▒▒█░░░░██▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒██<br/>
//   ░░░░█▒▒▒▒▒█░░░██▒▒▒▒▒██▒▒▒▒▒▒██▒▒▒▒▒███<br/>
//   ░░░░░█▒▒▒█░░░█▒▒▒▒▒▒████▒▒▒▒████▒▒▒▒▒▒██<br/>
//   ░░░█████████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒██<br/>
//   ░░░█▒▒▒▒▒▒▒▒▒▒▒▒█▒▒▒▒▒▒▒▒▒█▒▒▒▒▒▒▒▒▒▒▒██<br/>
//   ░██▒▒▒▒▒▒▒▒▒▒▒▒▒█▒▒▒██▒▒▒▒▒▒▒▒▒▒██▒▒▒▒██<br/>
//   ██▒▒▒███████████▒▒▒▒▒██▒▒▒▒▒▒▒▒██▒▒▒▒▒██<br/>
//   █▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒█▒▒▒▒▒▒████████▒▒▒▒▒▒▒██<br/>
//   ██▒▒▒▒▒▒▒▒▒▒▒▒▒▒█▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒██<br/>
//   ░█▒▒▒███████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒██<br/>
//   ░██▒▒▒▒▒▒▒▒▒▒████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒█<br/>
//   ░░████████████░░░█████████████████<br/><br/>

//   Thank you!
//   `,
// }, function(err, reply) {
//   console.log(err && err.stack);
//   console.dir(reply);
// });

// sendmail({
//     from: 'no-reply@usace.army.mil',
//     to: 'kevin.l.alemany@usace.army.mil',
//     subject: 'Corps Inventory: new document awaiting signature',
//     html: `Att: Kevin Alemany<br/><br/>

//     You are receiving this email because you have a new document awaiting signature.<br/><br/>

// To sign this document, please execute the following steps:<br/><br/>

// Go to Corps Inventory Control Application - https://sajgis.saj.usace.army.mil/inventory.<br/>
// Click on ENG4900.<br/>
// Click on Sign Tab.<br/>
// Click "View PDF" Icon to download document.<br/>
// Open PDF and sign.<br/>
// Click "Upload PDF" to upload signed document.<br/>
// Select "Completed..." and attach signed PDF or "Form Reject" if you do not approve.<br/><br/>

// If you have already signed your document, please disregard this email.`,
//   }, function(err, reply) {
//     console.log(err && err.stack);
//     console.dir(reply);
// });