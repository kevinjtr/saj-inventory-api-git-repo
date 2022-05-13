//var exec = require('child_process').execFile;
//const XLSX = require('xlsx')
//const xml2js = require('xml2js');
const { PDFDocument } = require('pdf-lib')
const util = require('util')
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

                if(field.name == "inv_app_id"){
                    pdfField.enableReadOnly()
                }
            }
        }

        if(field.type == 'checkbox'){
            const pdfField = form.getCheckBox(field.name)
            if(field.data){
                pdfField.check()
            }
        }
    }

    const pdfBytes = await pdfDoc.save()

    await fs.promises.writeFile(path.join(__dirname,'./output/output_eng4900.pdf'), pdfBytes, () => {
        console.log('PDF created!')
    })
}

var create4900Json = async function(form_data){

    //   fs.writeFile('eng4900-form-data.json',JSON.stringify(form_data,null,2),function (err) {
    //     if (err) return console.log(err);
    //     console.log('eng4900-form-data saved!');
    //   })

    const keys = Object.keys(form_data)

    for(const key of keys){//remove null values.
        form_data[key] = form_data[key] ? form_data[key] : ""
    }

    let data = [
        {name: "inv_app_id", type:"textfield", data: 'IA4900-' + form_data.form_id},
        {name: "Issue", type:"checkbox", data: form_data.requested_action == "Issue"},
        {name: "Transfer", type:"checkbox", data: form_data.requested_action == "Transfer"},
        {name: "Repair", type:"checkbox", data: form_data.requested_action == "Repair"},
        {name: "Excess", type:"checkbox", data: form_data.requested_action == "Excess"},
        {name: "FOI", type:"checkbox", data: form_data.requested_action == "FOI"},
        {name: "Temporary Loan", type:"checkbox", data: false},
        {name: "Expiration Date", type:"date", data: ""},
        {name: "2a Name", type:"textfield", data: (form_data.losing_hra_first_name + ' ' + form_data.losing_hra_last_name).trim()},
        {name: "b Office Symbol_1", type:"textfield", data: form_data.losing_hra_os_alias},
        {name: "c. Hand Receipt Account Number_1", type:"textfield", data: form_data.losing_hra_num},
        {name: "d. Work Phone Number_1", type:"textfield", data: formatPhoneNumber(form_data.losing_hra_work_phone)},
        {name: "3a Name", type:"textfield", data: (form_data.gaining_hra_first_name + ' ' +form_data.gaining_hra_last_name).trim()},
        {name: "b. Office Symbol_2", type:"textfield", data: form_data.gaining_hra_os_alias},
        {name: "c. Hand Receipt Account Number_2", type:"textfield", data: form_data.gaining_hra_num},
        {name: "d. Work Phone Number_2", type:"textfield", data: formatPhoneNumber(form_data.gaining_hra_work_phone)},
        {name: "13a. ror_prop", type:"textfield", data: form_data.individual_ror_prop},
        
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
            {name: `10 ACQ DateRow${num}`, type:"date", data: equipment.acquisition_date ? moment(equipment.acquisition_date).format('yyyy-MM-DD') : ""},
            {name: `11 ACQ PriceRow${num}`, type:"textfield", data: equipment.acquisition_price},
            {name: `12 Document Number Control IDRow${num}`, type:"textfield", data: ""}
        ]
        
        data = [...data,...equipment_template]
    }

    await fillEng4900PDF(data)
}

module.exports = {
    create4900 : async (data) => {
        try{
            await create4900Json(data)
            return true
        }catch(err){
            console.log(err)
            return false
        }
    },
    ValidateEng4900Signature: async (pdf, person) => await eng4900Signature(pdf, person),
    // create4844: async (data) => {
    //     try {
    //         await create4844Json(data)
    //         return true
    //     } catch (err) {
    //         console.log(err)
    //         return false
    //     }
    // },
    // create48441: async (data) => {
    //     try {
    //         await create48441Json(data)
    //         return true
    //     } catch (err) {
    //         console.log(err)
    //         return false
    //     }

    // },
    // create4844_48441: async (data) => {
    //     try {
    //         await create4844_48441Json(data)
    //         return true
    //     } catch (err) {
    //         console.log(err)
    //         return false
    //     }
    // }
}

var fillENG4844PDF = async function (data) {
    const readFile = util.promisify(fs.readFile)
    function get4844PDF() {
        return readFile(path.join(__dirname, './forms/ENG Form 4844 Template.pdf'))
    }

    const file4844 = await get4844PDF()
    const pdfDoc4844 = await PDFDocument.load(file4844)
    const form4844 = pdfDoc4844.getForm()
    // Start here
    for (const field of data) {

        if (field.type == 'textfield' || field.type == 'date') {
            const pdfField = form4844.getTextField(field.name)
            if (field.data) {
                pdfField.setText(field.data.toString())
            }

            pdfField.enableReadOnly()
        }

    }

    const pdfBytes = await pdfDoc4844.save()
    fs.writeFile(path.join(__dirname, './output/output_eng4844.pdf'), pdfBytes, () => {
        console.log('4844 PDF created!')
    })
}

var create4844Json = async function (form_data_4844) {

    // fs.writeFile('eng4844-form-data.json', JSON.stringify(form_data_4844, null, 2), function (err) {
    //     if (err) return console.log(err);
    //     console.log('eng4844-form-data saved!');
    // })

    let data = [
        { name: "4844_ID", type: "textfield", data: 'IA4844-' + form_data_4844.ID },
        { name: "1_DOCUMENT_NUMBER", type: "textfield", data: form_data_4844.DOCUMENT_NUM },
        { name: "2_ACQUISITION_DATE", type: "date", data: form_data_4844.DATE_CREATED },
        { name: "3_PURCHASE_ORDER_NUMBER", type: "textfield", data: form_data_4844.PURCHASE_ORDER_NUM },
        { name: "4_FROM_VENDOR", type: "textfield", data: form_data_4844.VENDOR },
        { name: "5_COST_ACCOUNT", type: "textfield", data: form_data_4844.COST_ACCOUNT },
        { name: "6_REMARKS", type: "textfield", data: form_data_4844.REMARKS },
        { name: "7_BAR_TAG_NUMBER", type: "textfield", data: form_data_4844.BAR_TAG_NUM },
        { name: "8_CATALOG_NUMBER", type: "textfield", data: form_data_4844.CATALOG_NUM },
        { name: "9_OLD_TAG_NUMBER", type: "textfield", data: form_data_4844.OLD_TAG_NUM },
        { name: "10_NOUN_NOMENCLATURE", type: "textfield", data: form_data_4844.NOUN_NOMENCLATURE },
        { name: "11_SERIAL_NUMBER", type: "textfield", data: form_data_4844.SERIAL_NUM },
        { name: "12_LOCATION", type: "textfield", data: form_data_4844.LOCATION },
        { name: "13_ROOM", type: "textfield", data: form_data_4844.ROOM },
        { name: "14_HRA", type: "textfield", data: form_data_4844.HRA },
        { name: "15_AUTHORIZATION", type: "textfield", data: form_data_4844.AUTHORIZATION },
        { name: "16_FUNDING", type: "textfield", data: form_data_4844.FUNDING },
        { name: "17_CONDITION", type: "textfield", data: form_data_4844.CONDITION },
        { name: "18_UTILIZATION", type: "textfield", data: form_data_4844.UTILIZATION },
        { name: "19_VALUE", type: "textfield", data: form_data_4844.VALUE },
        { name: "21_NOMENCLATURE", type: "textfield", data: form_data_4844.ACCESSORY_NOMENCLATURE },
        { name: "22_VALUE", type: "textfield", data: form_data_4844.ACCESSORY_VALUE },
        { name: "23_A_DATE_YYYYMMDD", type: "textfield", data: form_data_4844.DATE },
        { name: "23_B_NAME_LAST_FIRST_TITLE", type: "textfield", data: form_data_4844.LAST_NAME + ", "+ form_data_4844.FIRST_NAME}
    ]

    fillENG4844PDF(data)

}

var fillENG48441PDF = async function (data) {
    const readFile48441 = util.promisify(fs.readFile)
    function get48441PDF() {
        return readFile48441(path.join(__dirname, './forms/ENG Form 4844-1 Template.pdf'))
    }

    const file48441 = await get48441PDF()
    const pdfDoc48441 = await PDFDocument.load(file48441)
    const form48441 = pdfDoc48441.getForm()
    // Start here
    for (const field of data) {

        if (field.type == 'textfield' || field.type == 'date') {
            const pdfField = form48441.getTextField(field.name)
            if (field.data) {
                pdfField.setText(field.data.toString())
            }

            pdfField.enableReadOnly()
        }

    }

    const pdfBytes = await pdfDoc48441.save()
    fs.writeFile(path.join(__dirname, './output/output_eng48441.pdf'), pdfBytes, () => {
        console.log('4844-1 PDF created!')
    })
}

var create48441Json = async function (form_data_48441) {

    // fs.writeFile('eng48441-form-data.json', JSON.stringify(form_data_48441, null, 2), function (err) {
    //     if (err) return console.log(err);
    //     console.log('eng48441-form-data saved!');
    // })

    let data = [
        { name: "4844_1_ID", type: "textfield", data: 'IA4844-1-' + form_data_48441.ID },
        { name: "1_CATALOG_NUMBER", type: "textfield", data: form_data_48441.CATALOG_NUM_1 },
        { name: "2_MAJOR_NOUN", type: "date", data: form_data_48441.MAJOR_NOUN },
        { name: "3_NOMENCLATURE", type: "textfield", data: form_data_48441.NOMENCLATURE },
        { name: "4_MANUFACTURER", type: "textfield", data: form_data_48441.MANUFACTURER },
        { name: "5_PART_NUMBER", type: "textfield", data: form_data_48441.PART_NUM },
        { name: "6_MODEL", type: "textfield", data: form_data_48441.MODEL },
        { name: "7_COLOR", type: "textfield", data: form_data_48441.COLOR },
        { name: "8_LENGTH", type: "textfield", data: form_data_48441.LENGTH },
        { name: "9_WIDTH", type: "textfield", data: form_data_48441.WIDTH },
        { name: "10_HEIGHT", type: "textfield", data: form_data_48441.HEIGHT },
        { name: "11_VALUE", type: "textfield", data: form_data_48441.VALUE_1 },
        { name: "12_CLASSIFICATION", type: "textfield", data: form_data_48441.CLASSIFICATION },
        { name: "13_PILIFERABLE_CODE", type: "textfield", data: form_data_48441.PILIFERABLE_CODE },
        { name: "14_REPORTABLE_ITEM_CONTROL_CODE", type: "textfield", data: form_data_48441.REPORTABLE_ITEM_CONTROL_CODE },
        { name: "15_EQUIPMENT_CONTROL_CODE", type: "textfield", data: form_data_48441.EQUIPMENT_CONTROL_CODE },
        { name: "16_LINE_ITEM_NUMBER", type: "textfield", data: form_data_48441.LINE_ITEM_NUM },
        { name: "17_LOGISTICS_CONTROL_CODE", type: "textfield", data: form_data_48441.LOGISTICS_CONTROL_CODE }
    ]

    fillENG48441PDF(data)

}

var fillENG4844_48441PDF = async function (data) {
    const readFile = util.promisify(fs.readFile)
    function get4844_48441PDF() {
        return readFile(path.join(__dirname, './forms/ENG Form 4844 and 4844-1 Template.pdf'))
    }

    const file4844_48441 = await get4844_48441PDF()
    const pdfDoc4844_48441 = await PDFDocument.load(file4844_48441)
    const form4844_48441 = pdfDoc4844_48441.getForm()
  
    for (const field of data) {

        if (field.type == 'textfield' || field.type == 'date') {
            const pdfField = form4844_48441.getTextField(field.name)
            if (field.data) {
                pdfField.setText(field.data.toString())
            }

            pdfField.enableReadOnly()
        }

    }

    const pdfBytes = await pdfDoc4844_48441.save()
    fs.writeFile(path.join(__dirname, './output/output_eng4844_48441.pdf'), pdfBytes, () => {
        console.log('4844 and 4844-1 PDF created!')
    })
}

var create4844_48441Json = async function (form_data_4844_48441) {

    // fs.writeFile('eng4844_48441-form-data.json', JSON.stringify(form_data_4844_48441, null, 2), function (err) {
    //     if (err) return console.log(err);
    //     console.log('eng4844-48441-form-data saved!');
    // })

    let data = [
        { name: "4844_ID", type: "textfield", data: 'IA4844-' + form_data_4844_48441.ID },
        { name: "1_DOCUMENT_NUMBER", type: "textfield", data: form_data_4844_48441.DOCUMENT_NUM },
        { name: "2_ACQUISITION_DATE", type: "date", data: form_data_4844_48441.DATE_CREATED },
        { name: "3_PURCHASE_ORDER_NUMBER", type: "textfield", data: form_data_4844_48441.PURCHASE_ORDER_NUM },
        { name: "4_FROM_VENDOR", type: "textfield", data: form_data_4844_48441.VENDOR },
        { name: "5_COST_ACCOUNT", type: "textfield", data: form_data_4844_48441.COST_ACCOUNT },
        { name: "6_REMARKS", type: "textfield", data: form_data_4844_48441.REMARKS },
        { name: "7_BAR_TAG_NUMBER", type: "textfield", data: form_data_4844_48441.BAR_TAG_NUM },
        { name: "8_CATALOG_NUMBER", type: "textfield", data: form_data_4844_48441.CATALOG_NUM },
        { name: "9_OLD_TAG_NUMBER", type: "textfield", data: form_data_4844_48441.OLD_TAG_NUM },
        { name: "10_NOUN_NOMENCLATURE", type: "textfield", data: form_data_4844_48441.NOUN_NOMENCLATURE },
        { name: "11_SERIAL_NUMBER", type: "textfield", data: form_data_4844_48441.SERIAL_NUM },
        { name: "12_LOCATION", type: "textfield", data: form_data_4844_48441.LOCATION },
        { name: "13_ROOM", type: "textfield", data: form_data_4844_48441.ROOM },
        { name: "14_HRA", type: "textfield", data: form_data_4844_48441.HRA },
        { name: "15_AUTHORIZATION", type: "textfield", data: form_data_4844_48441.AUTHORIZATION },
        { name: "16_FUNDING", type: "textfield", data: form_data_4844_48441.FUNDING },
        { name: "17_CONDITION", type: "textfield", data: form_data_4844_48441.CONDITION },
        { name: "18_UTILIZATION", type: "textfield", data: form_data_4844_48441.UTILIZATION },
        { name: "19_VALUE", type: "textfield", data: form_data_4844_48441.VALUE },
        { name: "21_NOMENCLATURE", type: "textfield", data: form_data_4844_48441.ACCESSORY_NOMENCLATURE },
        { name: "22_VALUE", type: "textfield", data: form_data_4844_48441.ACCESSORY_VALUE },
        { name: "23_A_DATE_YYYYMMDD", type: "textfield", data: form_data_4844_48441.DATE },
        { name: "23_B_NAME_LAST_FIRST_TITLE", type: "textfield", data: form_data_4844_48441.LAST_NAME + ", "+ form_data_4844_48441.FIRST_NAME},
        { name: "4844_1_ID", type: "textfield", data: 'IA4844-1-' + form_data_4844_48441.ID },
        { name: "1_CATALOG_NUMBER", type: "textfield", data: form_data_4844_48441.CATALOG_NUM_1 },
        { name: "2_MAJOR_NOUN", type: "date", data: form_data_4844_48441.MAJOR_NOUN },
        { name: "3_NOMENCLATURE", type: "textfield", data: form_data_4844_48441.NOMENCLATURE },
        { name: "4_MANUFACTURER", type: "textfield", data: form_data_4844_48441.MANUFACTURER },
        { name: "5_PART_NUMBER", type: "textfield", data: form_data_4844_48441.PART_NUM },
        { name: "6_MODEL", type: "textfield", data: form_data_4844_48441.MODEL },
        { name: "7_COLOR", type: "textfield", data: form_data_4844_48441.COLOR },
        { name: "8_LENGTH", type: "textfield", data: form_data_4844_48441.LENGTH },
        { name: "9_WIDTH", type: "textfield", data: form_data_4844_48441.WIDTH },
        { name: "10_HEIGHT", type: "textfield", data: form_data_4844_48441.HEIGHT },
        { name: "11_VALUE", type: "textfield", data: form_data_4844_48441.VALUE_1 },
        { name: "12_CLASSIFICATION", type: "textfield", data: form_data_4844_48441.CLASSIFICATION },
        { name: "13_PILIFERABLE_CODE", type: "textfield", data: form_data_4844_48441.PILIFERABLE_CODE },
        { name: "14_REPORTABLE_ITEM_CONTROL_CODE", type: "textfield", data: form_data_4844_48441.REPORTABLE_ITEM_CONTROL_CODE },
        { name: "15_EQUIPMENT_CONTROL_CODE", type: "textfield", data: form_data_4844_48441.EQUIPMENT_CONTROL_CODE },
        { name: "16_LINE_ITEM_NUMBER", type: "textfield", data: form_data_4844_48441.LINE_ITEM_NUM },
        { name: "17_LOGISTICS_CONTROL_CODE", type: "textfield", data: form_data_4844_48441.LOGISTICS_CONTROL_CODE }
    ]

    fillENG4844_48441PDF(data)

}

// const data4844 = {
//     "ID": 1,
//     "DATE_CREATED": "20211008",
//     "DOCUMENT_NUM": "DN987654",
//     "ACQUISITION_DATE": "20211008",
//     "PURCHASE_ORDER_NUM": "PO01234",
//     "VENDOR": "DELL",
//     "COST_ACCOUNT": "CA9876",
//     "REMARKS": "1234567890123456789012345",
//     "BAR_TAG_NUM": 12345,
//     "CATALOG_NUM": "357159",
//     "OLD_TAG_NUM": 12345,
//     "NOUN_NOMENCLATURE": "LAPTOP",
//     "SERIAL_NUM": "ABCD12345",
//     "LOCATION": "The Hallway END",
//     "ROOM": 123456,
//     "HRA": 907,
//     "AUTHORIZATION": "123456789012345",
//     "FUNDING": "C",
//     "CONDITION": "A",
//     "UTILIZATION": "M",
//     "VALUE": 2500,
//     "ACCESSORY_NOMENCLATURE": "1234567890123456789012345",
//     "ACCESSORY_VALUE": 1234567890123,
//     "DATE": "20211008",
//     "FIRST_NAME": "DAVID",
//     "LAST_NAME": "ROBAR"
//   }

// const data48441 = {
//     "ID": 1,
//     "CATALOG_NUM_1": "2021100823654",
//     "MAJOR_NOUN": "Laptop",
//     "NOMENCLATURE": "Laptop",
//     "MANUFACTURER": "Dell",
//     "PART_NUM": "5260",
//     "MODEL": "1234567890",
//     "COLOR": "Black & Brown",
//     "LENGTH": 968,
//     "WIDTH": 123,
//     "HEIGHT": 150,
//     "VALUE_1": "123.42",
//     "CLASSIFICATION": "NE",
//     "PILIFERABLE_CODE": "Y",
//     "REPORTABLE_ITEM_CONTROL_CODE": "0",
//     "EQUIPMENT_CONTROL_CODE": "90",
//     "LINE_ITEM_NUM": "123456",
//     "LOGISTICS_CONTROL_CODE": "A"
//   }

// const data4844_48441 = {
//     "ID": 1,
//     "DATE_CREATED": "20211008",
//     "DOCUMENT_NUM": "DN987654",
//     "ACQUISITION_DATE": "20211008",
//     "PURCHASE_ORDER_NUM": "PO01234",
//     "VENDOR": "DELL",
//     "COST_ACCOUNT": "CA9876",
//     "REMARKS": "1234567890123456789012345",
//     "BAR_TAG_NUM": 12345,
//     "CATALOG_NUM": "357159",
//     "OLD_TAG_NUM": 12345,
//     "NOUN_NOMENCLATURE": "LAPTOP",
//     "SERIAL_NUM": "ABCD12345",
//     "LOCATION": "The Hallway END",
//     "ROOM": 123456,
//     "HRA": 907,
//     "AUTHORIZATION": "123456789012345",
//     "FUNDING": "C",
//     "CONDITION": "A",
//     "UTILIZATION": "M",
//     "VALUE": 2500,
//     "ACCESSORY_NOMENCLATURE": "1234567890123456789012345",
//     "ACCESSORY_VALUE": 1234567890123,
//     "DATE": "20211008",
//     "FIRST_NAME": "DAVID",
//     "LAST_NAME": "ROBAR",
//     "CATALOG_NUM_1": "2021100823654",
//     "MAJOR_NOUN": "Laptop",
//     "NOMENCLATURE": "Laptop",
//     "MANUFACTURER": "Dell",
//     "PART_NUM": "5260",
//     "MODEL": "1234567890",
//     "COLOR": "Black & Brown",
//     "LENGTH": 968,
//     "WIDTH": 123,
//     "HEIGHT": 150,
//     "VALUE_1": "123.42",
//     "CLASSIFICATION": "NE",
//     "PILIFERABLE_CODE": "Y",
//     "REPORTABLE_ITEM_CONTROL_CODE": "0",
//     "EQUIPMENT_CONTROL_CODE": "90",
//     "LINE_ITEM_NUM": "123456",
//     "LOGISTICS_CONTROL_CODE": "A"
// }

/*
var createFilledEng4900 = async function (form_data) {
    console.log("updateXmlDirectory() start");

    let xml_string = await fs.promises.readFile("./config/config4900_new.bulkpdf", "utf8");

    parser.parseString(xml_string, async function (error, result) {
        if (error === null) {

            result.BulkPDF.Options[0].DataSource[0].Parameter[0] = result.BulkPDF.Options[0].DataSource[0].Parameter[0].replace('PATH', dir + '/data') //BulkPdf folder.
            result.BulkPDF.Options[0].OutputDir[0] = result.BulkPDF.Options[0].OutputDir[0].replace('PATH', __dirname) //output folder.
            result.BulkPDF.Options[0].PDF[0].Filepath[0] = result.BulkPDF.Options[0].PDF[0].Filepath[0].replace('PATH', __dirname) //forms folder.

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

var fillPDF = async function () {
    console.log("fillPDF() start");


    exec(path.join(dir + '/BulkPDFConsole.exe'), [dir + '/config4900wPath.bulkpdf'], function (err, data) {
        if (!err) console.log('pdf created successfuly.')
        console.log(data.toString());
    });
}

var createXlsx = async function (form_data) {
    console.log("createXlsx() start");
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");

    let data = [{
        "iventory_app_id": 'IA' + form_data.form_id,
        "Issue": form_data.requested_action == "Issue" ? "Yes" : "",
        "Transfer": form_data.requested_action == "Transfer" ? "Yes" : "",
        "Repair": form_data.requested_action == "Repair" ? "Yes" : "",
        "Excess": form_data.requested_action == "Excess" ? "Yes" : "",
        "FOI": form_data.requested_action == "FOI" ? "Yes" : "",
        "Temporary Loan": "",
        "Expiration Date": "",
        "2a. Name": form_data.losing_hra_first_name + ' ' + form_data.losing_hra_last_name,
        "b. Office Symbol_1": form_data.losing_hra_os_alias,
        "c. Hand Receipt Account Number_1": form_data.losing_hra_num,
        "d. Work Phone Number_1": formatPhoneNumber(form_data.losing_hra_work_phone),
        "3a Name": form_data.gaining_hra_first_name + ' ' + form_data.gaining_hra_last_name,
        "b. Office Symbol_2": form_data.gaining_hra_os_alias,
        "c. Hand Receipt Account Number_2": form_data.gaining_hra_num,
        "d. Work Phone Number_2": formatPhoneNumber(form_data.gaining_hra_work_phone),
        "13a. ror_prop": "",
    }]


    for (let i = 0; i < form_data.equipment_group.length; i++) {
        const num = i + 1
        const equipment = form_data.equipment_group[i]

        //console.log( equipment)

        data[0] = Object.assign(data[0], {
            [`4. Item No_Row_${num}`]: "",
            [`5 Bar Tag NoRow${num}`]: equipment.bar_tag_num,
            [`6 CatalogRow${num}`]: equipment.catalog_num,
            [`7 Nomenclature include make modelRow${num}`]: equipment.item_type,
            [`8 Cond CodeRow${num}`]: equipment.condition,
            [`9 Serial NumberRow${num}`]: equipment.serial_num,
            [`10 ACQ DateRow${num}`]: moment(equipment.acquisition_date).format('yyyy-MM-DD'),
            [`11 ACQ PriceRow${num}`]: equipment.acquisition_price,
            [`12 Document Number Control IDRow${num}`]: ""
        }
        )
    }
*/
// console.log(data)
/* this line is only needed if you are not adding a script tag reference */
//  if (typeof XLSX == 'undefined') XLSX = require('xlsx');

/* make the worksheet */
// var ws = XLSX.utils.json_to_sheet(data);

/* add to workbook */
// var wb = XLSX.utils.book_new();
// XLSX.utils.book_append_sheet(wb, ws, "People");

/* generate an XLSX file */
// XLSX.writeFile(wb, dir + "/data/data_to_pdf.xlsx");

// console.log('xlsx created successfuly.')
