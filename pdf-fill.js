var exec = require('child_process').execFile;
const XLSX = require('xlsx')
const xml2js = require('xml2js');
const fs = require('fs');
const parser = new xml2js.Parser({ attrkey: "ATTR" });
const path = require('path')
const moment = require('moment')
const dir = path.join(__dirname,'./BulkPdf')

function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return null;
  }

var createFilledEng4900 = async function(form_data){
    console.log("updateXmlDirectory() start");

    let xml_string = await fs.promises.readFile("./config/config4900_new.bulkpdf", "utf8");

    parser.parseString(xml_string, async function(error, result) {
        if(error === null) {

            result.BulkPDF.Options[0].DataSource[0].Parameter[0] = result.BulkPDF.Options[0].DataSource[0].Parameter[0].replace('PATH', dir + '/data') //BulkPdf folder.
            result.BulkPDF.Options[0].OutputDir[0] = result.BulkPDF.Options[0].OutputDir[0].replace('PATH',__dirname) //output folder.
            result.BulkPDF.Options[0].PDF[0].Filepath[0] = result.BulkPDF.Options[0].PDF[0].Filepath[0].replace('PATH',__dirname) //forms folder.

            var builder = new xml2js.Builder();
            var xml = builder.buildObject(result);

            //console.log(xml)

            await fs.promises.writeFile(path.join(__dirname, './BulkPdf/config4900wPath.bulkpdf'), xml)
            .then(async () => {
                console.log('xml created successfully.')
                createXlsx(form_data)
            })
            .catch(err => {
                logger.error(err); 
            })
        //    console.log(result.BulkPDF.Options[0].DataSource[0].Parameter[0].replace('PATH',__dirname))
        //    console.log(result.BulkPDF.Options[0].OutputDir[0].replace('PATH',__dirname))
        //     console.log(result.BulkPDF.Options[0].PDF[0].Filepath[0].replace('PATH',__dirname) )
        }
        else {
            console.log(error);
        }
    });
}

var fillPDF = async function(){
   console.log("fillPDF() start");
   

   exec(path.join(dir + '/BulkPDFConsole.exe'), [dir + '/config4900wPath.bulkpdf'],function(err, data) {  
        if(!err) console.log('pdf created successfuly.')
        console.log(data.toString());                       
    });  
}

var createXlsx = async function(form_data){
    console.log("createXlsx() start");
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");

    let data = [{
        "iventory_app_id" : 'IA' + form_data.form_id,
        "Issue" : form_data.requested_action == "Issue" ? "Yes" : "",
        "Transfer": form_data.requested_action ==  "Transfer" ? "Yes" : "",
        "Repair": form_data.requested_action == "Repair" ? "Yes" : "",
        "Excess": form_data.requested_action == "Excess" ? "Yes" : "",
        "FOI": form_data.requested_action == "FOI" ? "Yes" : "",
        "Temporary Loan": "",
        "Expiration Date": "",
        "2a. Name": form_data.losing_hra_first_name + ' ' + form_data.losing_hra_last_name,
        "b. Office Symbol_1": form_data.losing_hra_os_alias,
        "c. Hand Receipt Account Number_1": form_data.losing_hra_num,
        "d. Work Phone Number_1": formatPhoneNumber(form_data.losing_hra_work_phone),
        "3a Name": form_data.gaining_hra_first_name + ' ' +form_data.gaining_hra_last_name,
        "b. Office Symbol_2": form_data.gaining_hra_os_alias,
        "c. Hand Receipt Account Number_2": form_data.gaining_hra_num,
        "d. Work Phone Number_2": formatPhoneNumber(form_data.gaining_hra_work_phone),
        "13a. ror_prop": "",
}]


    for(let i=0;i<form_data.equipment_group.length;i++){
        const num = i + 1
        const equipment = form_data.equipment_group[i]

        //console.log( equipment)

        data[0] = Object.assign(data[0],{
            [`4. Item No_Row_${num}`]: "",
            [`5 Bar Tag NoRow${num}`]: equipment.bar_tag_num,
            [`6 CatalogRow${num}`]: equipment.catalog_num,
            [`7 Nomenclature include make modelRow${num}`]: equipment.item_type,
            [`8 Cond CodeRow${num}`]: equipment.condition,
            [`9 Serial NumberRow${num}`]: equipment.serial_num,
            [`10 ACQ DateRow${num}`]: moment(equipment.acquisition_date).format('yyyy-MM-DD'),
            [`11 ACQ PriceRow${num}`]: equipment.acquisition_price,
            [`12 Document Number Control IDRow${num}`]: ""}
        )
    }

    console.log(data)
    /* this line is only needed if you are not adding a script tag reference */
    if(typeof XLSX == 'undefined') XLSX = require('xlsx');

    /* make the worksheet */
    var ws = XLSX.utils.json_to_sheet(data);

    /* add to workbook */
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "People");

    /* generate an XLSX file */
    XLSX.writeFile(wb, dir + "/data/data_to_pdf.xlsx");

    console.log('xlsx created successfuly.')

    fillPDF()
}

module.exports = function(){
    return {
        handleData : (data) => {
            createFilledEng4900(data)
    }
}
}();
