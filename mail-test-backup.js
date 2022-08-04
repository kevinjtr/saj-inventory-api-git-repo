const sendmail = require('sendmail')();
 
// sendmail({
//   from: 'no-reply@usace.army.mil',
//   to: 'kevin.l.alemany@usace.army.mil, brian.p.mulcahy@usace.army.mil, gabrielle.i.eurillo@usace.army.mil, jonathan.m.freed@usace.army.mil',
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