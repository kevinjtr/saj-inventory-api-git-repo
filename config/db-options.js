const oracledb = require('oracledb');
module.exports = {
    dbSelectOptions : {
        outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
        // extendedMetaData: true,               // get extra metadata
        // prefetchRows:     100,                // internal buffer allocation size for tuning
        // fetchArraySize:   100                 // internal buffer allocation size for tuning
    },
    eqDatabaseColNames: {
        'hraNum':{name:'eq_emp.hra_num',type:'string'},
        'bartagNum':{name:'bar_tag_num',type:'string'},
        'hraName': {name:"hra_full_name",type:'string'},
        'itemType':{name:'item_type',type:'string'},
        'employeeName':{name:"employee_full_name",type:'string'},
    },
    eng4900DatabaseColNames: {
        'id':{name:'f.id',type:'string'},
        'requestedAction':{name:'ra.alias',type:'string'},
        'losingHra': {name:"losing_hra",type:'string'},
        'losingHraName': {name:"losing_hra_full_name",type:'string'},
        'gainingHra':{name:'gaining_hra',type:'string'},
        'gainingHraName':{name:'gaining_hra_full_name',type:'string'},
        'bartagNum':{name:"bar_tag_num",type:'string'},
        'itemType':{name:"item_type",type:'string'},
        'dateCreated':{name:"date_created",type:'date'},
        'catalogNum':{name:"catalog_num",type:'string'},
        'acqPrice':{name:"acquisition_price",type:'string'},
        'serialNum':{name:"serial_num",type:'string'},
    }
  };