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
    }
  };