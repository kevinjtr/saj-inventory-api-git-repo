const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');
const {dbSelectOptions} = require('../config/db-options');
const moment = require('moment')
const sendmail = require('sendmail')();
const new_version = "v0.9.8"
const message_type = "update_complete"
const when = "today November 16, 2022"

const subject = {
    maintenance: (obj) => `Notification: Inventory Application will be down ${obj.when} for scheduled maintenance.`,
    scheduled_update: (obj) => `Notification: Inventory Application will be down ${obj.when} for version update.`,
    update_complete: (obj) => `Notification: Inventory Application has been updated to ${new_version}.`,
}

const DateTimePrint = () => `Date/Time: ${moment(new Date()).format("MMMM DD, YYYY HH:mm:ss")}.<br/><br/>`

const html_body = {
  maintenance: (obj) => `Att: ${obj.first_name ? obj.first_name : ""} ${obj.last_name},<br/><br/>

    Inventory Application will be down ${obj.when} for maintenance.<br/><br/>

  -Inventory App Notifications`,
  scheduled_update: (obj) => `Att: ${obj.first_name ? obj.first_name : ""} ${obj.last_name},<br/><br/>

    You have received this email because you're currently registered on CESAJ Inventory Application.<br/><br/>
    
    Note: Inventory Application will be down ${obj.when} for ${new_version} update.<br/><br/>

    <strong>New Features:</strong><br/><br/>
    User Registration.<br/>
    ----New users can easily register directly from the Sign In Page.<br/><br/>
    ENG4900 Email notifications.<br/>
    ----HRAs and authorized users will recieve email alerts from the application on the status of a ENG4900 form.<br/><br/>
    Ability to turn ON/OFF email notifications.<br/>
    ----location: Click on User Information Icon on top right of screen and then "Email Notifications".<br/><br/>
    HRA users can now approve new user registrations from employees of their offices.<br/>
    ----Ex: when a new user tries to register with office CESAJ-EN-DG.<br/>
    ----Every HRA account tied to CESAJ-EN-DG will be allowed to approve new users.<br/><br/>
    Other small fixes were done to improve website.<br/><br/>  

  -Inventory App Notifications`,
  update_complete: (obj) => `Att: ${obj.first_name ? obj.first_name : ""} ${obj.last_name},<br/><br/>

    You have received this email because you're currently registered on CESAJ Inventory Application.<br/><br/>
    
    Note: Inventory Application has been updated to ${new_version}.<br/><br/>

    <strong>New Features:</strong><br/><br/>
    Dashboard.<br/>
    ----HRA and Authorized HRA Users can see if they have a ENG4900 form to sign.<br/>
    ----All Users will be able to see system annoucements and how many equipments they hold.<br/><br/>
    Equipment.<br/>
    ----A Map that displays equipment locations was added. You can enable it by selecting "Map" on the top right of the screen. By default "Table" is selected.<br/>
    ----Table Filtering: Cell widths are now bigger, making it easier to see the input text.<br/>
    ----All Users will be able to see equipments on the Map (Note: Only equipments that are assigned to employees with an office location will display).<br/>
    ----Export table report to Excel was added.<br/>
    ----All Users will have the ability to certify in "My Equipment" if they are holding an equipment for the current FY.<br/><br/>
    Account.<br/>
    ----On the top right user icon, select "MANAGE MY ACCOUNT" to change your user information (name, title, email, phone and office location).<br/><br/>
    Navbar User Interface was updated.<br/><br/>
    ENG4900.<br/>
    ----Bug fix: Unable to finish a ENG4900 "Transfer" when a Losing HRA tries to transfer equipments to a non-registered Gaining HRA account that also has no Authorized Users to handle their equipments.<br/><br/>
    Navbar User Interface was updated.<br/><br/>

  -Inventory App Notifications`,
}

async function massEmailAlert() {
  let connection
	try{
    if(process.env.NODE_ENV === "aws"){
      return "done"
    }
		const pool = oracledb.getPool('ADMIN');
		connection =  await pool.getConnection();

    let sql = `select e.first_name as "first_name", e.last_name as "last_name", e.email as "email", ru.notifications as "notifications" from registered_users ru
    left join employee e on e.id = ru.employee_id
    where e.email is not null and ru.notifications = 1`
  
    let result = await connection.execute(sql,{},dbSelectOptions)

    if(result.rows.length > 0){
        array_of_opts_obj = []

        for(const user of result.rows){
            const opts_obj = {...user, when: when}
            const obj_settings = {from: 'no-reply-inventory@usace.army.mil', to: user.email, subject:subject[message_type](opts_obj), html:html_body[message_type](opts_obj)}

            if(!array_of_opts_obj.includes(obj_settings.to)){
                //Will not send more than one email to a user.
                array_of_opts_obj.push(obj_settings.to)

                console.log(obj_settings)
                // sendmail(obj_settings, function(err, reply) {
                //   console.log(!err ? "email sent.": "")
                // });
            }
        }
    }

    return "done";
  }catch(err){
    console.log(err)
  } finally {
		if (connection) {
			try {
				await connection.close(); // Put the connection back in the pool
			} catch (err) {
				console.log(err)
			}
		}
	}
}

massEmailAlert()

//console.log("This should print first.")

//console.log(queryForSearch(1))

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