//var exec = require('child_process').execFile;
const { PDFDocument } = require('pdf-lib')
const util = require('util')
//const XLSX = require('xlsx')
//const xml2js = require('xml2js');
const fs = require('fs');
//const parser = new xml2js.Parser({ attrkey: "ATTR" });
const path = require('path')
const moment = require('moment')
//const dir = path.join(__dirname,'./BulkPdf')
const findIndex = require('lodash/findIndex');

const SIGN_DATE_FIELD_NAME = {
    ROR_PROP:"b Date",
    LOSING:"b Date_2",
    GAINING:"b Date_3",
    PBO_LOSING:"f Date",
    PBO_GAINING:"f Date_2",
    LOGISTICS_RECEIVED:"b Date_4",
    LOGISTICS_POSTED_BY:"b Date_5"
}

function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return null;
}

const eng4900Signature = async (pdf,person) => {

    const field_keys = Object.keys(SIGN_DATE_FIELD_NAME)
    const idx = findIndex(field_keys,function(k){return k == person.toUpperCase()})

    if(idx == -1 ) return false

    const newKeys = field_keys.filter(function(value, index, arr){ 
        return index <= idx && index > 0;//ignore ror_prop signature.
    });

    const readFile = util.promisify(fs.readFile)

    function getStuff() {
        return readFile(path.join(__dirname, pdf))
    }

    const file = await getStuff()
    const pdfDoc = await PDFDocument.load(file)
    const form = pdfDoc.getForm()
    let flag = true

    for(const key of newKeys){
        const pdfField = form.getTextField(SIGN_DATE_FIELD_NAME[key])
        const fieldText = pdfField.getText()
        const isFieldReadOnly = pdfField.isReadOnly()    

        flag = flag && (fieldText ? fieldText.length == 10 : false) && isFieldReadOnly
    }
    
    return flag
}

var fillEng4900PDF = async function(data){
    const readFile = util.promisify(fs.readFile)
    function getStuff() {
        return readFile(path.join(__dirname,'./forms/eng4900.pdf'))
    }

    const file = await getStuff()
    const pdfDoc = await PDFDocument.load(file)
    const form = pdfDoc.getForm()

    for(const field of data){

        if(field.type == 'textfield' || field.type == 'date'){
            const pdfField = form.getTextField(field.name)
            if(field.data){
                pdfField.setText(field.data.toString())
            }

            pdfField.enableReadOnly()
        }

        if(field.type == 'checkbox'){
            const pdfField = form.getCheckBox(field.name)
            if(field.data){
                pdfField.check()
            }

            pdfField.enableReadOnly()
        }
    }

    const pdfBytes = await pdfDoc.save()
        fs.writeFile(path.join(__dirname,'./output/output_eng4900.pdf'), pdfBytes, () => {
            console.log('PDF created!')
    })
 }

var create4900Json = async function(form_data){

      fs.writeFile('eng4900-form-data.json',JSON.stringify(form_data,null,2),function (err) {
        if (err) return console.log(err);
        console.log('eng4900-form-data saved!');
      })

    let data = [
        {name: "inv_app_id", type:"textfield", data: 'IA4900-' + form_data.form_id},
        {name: "Issue", type:"checkbox", data: form_data.requested_action == "Issue"},
        {name: "Transfer", type:"checkbox", data: form_data.requested_action == "Transfer"},
        {name: "Repair", type:"checkbox", data: form_data.requested_action == "Repair"},
        {name: "Excess", type:"checkbox", data: form_data.requested_action == "Excess"},
        {name: "FOI", type:"checkbox", data: form_data.requested_action == "FOI"},
        {name: "Temporary Loan", type:"checkbox", data: false},
        {name: "Expiration Date", type:"date", data: ""},
        {name: "2a Name", type:"textfield", data: form_data.losing_hra_first_name + ' ' + form_data.losing_hra_last_name},
        {name: "b Office Symbol_1", type:"textfield", data: form_data.losing_hra_os_alias},
        {name: "c. Hand Receipt Account Number_1", type:"textfield", data: form_data.losing_hra_num},
        {name: "d. Work Phone Number_1", type:"textfield", data: formatPhoneNumber(form_data.losing_hra_work_phone)},
        {name: "3a Name", type:"textfield", data: form_data.gaining_hra_first_name + ' ' +form_data.gaining_hra_last_name},
        {name: "b. Office Symbol_2", type:"textfield", data: form_data.gaining_hra_os_alias},
        {name: "c. Hand Receipt Account Number_2", type:"textfield", data: form_data.gaining_hra_num},
        {name: "d. Work Phone Number_2", type:"textfield", data: formatPhoneNumber(form_data.gaining_hra_work_phone)},
        {name: "13a. ror_prop", type:"textfield", data: ""},
    ]


    for(let i=0;i<form_data.equipment_group.length;i++){
        const num = i + 1
        const equipment = form_data.equipment_group[i]
        const equipment_template = [
            {name: `4. Item No_Row_${num}`, type:"textfield", data: ""},
            {name: `5 Bar Tag NoRow${num}`, type:"textfield", data: equipment.bar_tag_num},
            {name: `6 CatalogRow${num}`, type:"textfield", data: equipment.catalog_num},
            {name: `7 Nomenclature include make modelRow${num}`, type:"textfield", data: equipment.item_type},
            {name: `8 Cond CodeRow${num}`, type:"textfield", data:  equipment.condition},
            {name: `9 Serial NumberRow${num}`, type:"textfield", data: equipment.serial_num},
            {name: `10 ACQ DateRow${num}`, type:"date", data: moment(equipment.acquisition_date).format('yyyy-MM-DD')},
            {name: `11 ACQ PriceRow${num}`, type:"textfield", data: equipment.acquisition_price},
            {name: `12 Document Number Control IDRow${num}`, type:"textfield", data: ""}
        ]
        
        data = [...data,...equipment_template]
    }
    fillEng4900PDF(data)
}

module.exports = {
        handleData : async (data) => {
            try{
                await create4900Json(data)
                return true
            }catch(err){
                console.log(err)
                return false
            }
        },
        ValidateEng4900Signature: async (pdf, person) => await eng4900Signature(pdf, person),
}

// var createFilledEng4900 = async function(form_data){
//     console.log("updateXmlDirectory() start");

//     let xml_string = await fs.promises.readFile("./config/config4900_new.bulkpdf", "utf8");

//     parser.parseString(xml_string, async function(error, result) {
//         if(error === null) {

//             result.BulkPDF.Options[0].DataSource[0].Parameter[0] = result.BulkPDF.Options[0].DataSource[0].Parameter[0].replace('PATH', dir + '/data') //BulkPdf folder.
//             result.BulkPDF.Options[0].OutputDir[0] = result.BulkPDF.Options[0].OutputDir[0].replace('PATH',__dirname) //output folder.
//             result.BulkPDF.Options[0].PDF[0].Filepath[0] = result.BulkPDF.Options[0].PDF[0].Filepath[0].replace('PATH',__dirname) //forms folder.

//             var builder = new xml2js.Builder();
//             var xml = builder.buildObject(result);

//             //console.log(xml)

//             await fs.promises.writeFile(path.join(__dirname, './BulkPdf/config4900wPath.bulkpdf'), xml)
//             .then(async () => {
//                 console.log('xml created successfully.')
//                 createXlsx(form_data)
//             })
//             .catch(err => {
//                 logger.error(err); 
//             })
//         //    console.log(result.BulkPDF.Options[0].DataSource[0].Parameter[0].replace('PATH',__dirname))
//         //    console.log(result.BulkPDF.Options[0].OutputDir[0].replace('PATH',__dirname))
//         //     console.log(result.BulkPDF.Options[0].PDF[0].Filepath[0].replace('PATH',__dirname) )
//         }
//         else {
//             console.log(error);
//         }
//     });
// }

// var createXlsx = async function(form_data){
//     console.log("createXlsx() start");
//     var wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");

//     let data = [{
//         "iventory_app_id" : 'IA' + form_data.form_id,
//         "Issue" : form_data.requested_action == "Issue" ? "Yes" : "",
//         "Transfer": form_data.requested_action ==  "Transfer" ? "Yes" : "",
//         "Repair": form_data.requested_action == "Repair" ? "Yes" : "",
//         "Excess": form_data.requested_action == "Excess" ? "Yes" : "",
//         "FOI": form_data.requested_action == "FOI" ? "Yes" : "",
//         "Temporary Loan": "",
//         "Expiration Date": "",
//         "2a. Name": form_data.losing_hra_first_name + ' ' + form_data.losing_hra_last_name,
//         "b. Office Symbol_1": form_data.losing_hra_os_alias,
//         "c. Hand Receipt Account Number_1": form_data.losing_hra_num,
//         "d. Work Phone Number_1": formatPhoneNumber(form_data.losing_hra_work_phone),
//         "3a Name": form_data.gaining_hra_first_name + ' ' +form_data.gaining_hra_last_name,
//         "b. Office Symbol_2": form_data.gaining_hra_os_alias,
//         "c. Hand Receipt Account Number_2": form_data.gaining_hra_num,
//         "d. Work Phone Number_2": formatPhoneNumber(form_data.gaining_hra_work_phone),
//         "13a. ror_prop": "",
// }]


//     for(let i=0;i<form_data.equipment_group.length;i++){
//         const num = i + 1
//         const equipment = form_data.equipment_group[i]

//         //console.log( equipment)

//         data[0] = Object.assign(data[0],{
//             [`4. Item No_Row_${num}`]: "",
//             [`5 Bar Tag NoRow${num}`]: equipment.bar_tag_num,
//             [`6 CatalogRow${num}`]: equipment.catalog_num,
//             [`7 Nomenclature include make modelRow${num}`]: equipment.item_type,
//             [`8 Cond CodeRow${num}`]: equipment.condition,
//             [`9 Serial NumberRow${num}`]: equipment.serial_num,
//             [`10 ACQ DateRow${num}`]: moment(equipment.acquisition_date).format('yyyy-MM-DD'),
//             [`11 ACQ PriceRow${num}`]: equipment.acquisition_price,
//             [`12 Document Number Control IDRow${num}`]: ""}
//         )
//     }

//     console.log(data)
//     /* this line is only needed if you are not adding a script tag reference */
//     if(typeof XLSX == 'undefined') XLSX = require('xlsx');

//     /* make the worksheet */
//     var ws = XLSX.utils.json_to_sheet(data);

//     /* add to workbook */
//     var wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "People");

//     /* generate an XLSX file */
//     XLSX.writeFile(wb, dir + "/data/data_to_pdf.xlsx");

//     console.log('xlsx created successfuly.')

//     fillPDF()
// }

// var fillPDF = async function(){
//    console.log("fillPDF() start");
   

//    exec(path.join(dir + '/BulkPDFConsole.exe'), [dir + '/config4900wPath.bulkpdf'],function(err, data) {  
//         if(!err) console.log('pdf created successfuly.')
//         console.log(data.toString());                       
//     });  
// }
