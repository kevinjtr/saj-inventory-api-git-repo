module.exports = {
    BLANKS_DEFAULT : 'displayBlanks',
    searchOptions : {
        'includes':'LIKE',
        'excludes':'NOT LIKE',
        'equals':'=',
        'notEquals':'!='
    },
    searchBlanks : {
        'displayBlanks':'',
        'hideBlanks':'!=',
        'onlyBlanks':'='
    },
    blankAndOr : {
        'displayBlanks':'OR',
        'hideBlanks':'AND',
        'onlyBlanks':'OR',
    },
    blankNull : {
        '=':'IS',
        '!=':'IS NOT',
    },
    REGISTERED_USERS_VIEW: {
        admin:{
            admin:{view:true, edit:true},
            home:{view:true, edit:true},
            equipment:{view:true, edit:true},
            annualinventory:{view:true, edit:true},
            hra:{view:true, edit:true},
            employee:{view:true, edit:true},
            eng4900:{view:true, edit:true},
            changehistory:{view:true, edit:true},
            authorizedusers:{view:true, edit:true},
            registrationviewer:{view:true,edit:true},
		    employee2:{view:true,edit:true}
        },
        employee_1:{
            admin:{view:false, edit:false},
            home: {view:true, edit:false},
            equipment: {view:true, edit:false},
            annualinventory: {view:false, edit:false},
            hra: {view:false, edit:false},
            employee: {view:true, edit:true},
            eng4900: {view:false, edit:false},
            changehistory: {view:false, edit:false},
            authorizedusers:{view:false, edit:false},
            registrationviewer:{view:false,edit:false},
            employee2:{view:false,edit:false}
        },
        employee_2:{
            admin:{view:false, edit:false},
            home: {view:true, edit:false},
            equipment: {view:true, edit:false},
            annualinventory: {view:true, edit:false},
            hra: {view:true, edit:false},
            employee: {view:true, edit:true},
            eng4900: {view:true, edit:false},
            changehistory: {view:true, edit:false},
            authorizedusers:{view:false, edit:false},
            registrationviewer:{view:false,edit:false},
            employee2:{view:false,edit:false}
        },
        employee_3:{
            admin:{view:false, edit:false},
            home: {view:true, edit:false},
            equipment: {view:true, edit:false},
            annualinventory: {view:true, edit:true},
            hra: {view:true, edit:false},
            employee: {view:true, edit:true},
            eng4900: {view:true, edit:true},
            changehistory: {view:true, edit:false},
            authorizedusers:{view:false, edit:false},
            registrationviewer:{view:false,edit:false},
            employee2:{view:false,edit:false}
        },
    /* 	employee_4:{
            admin:{view:false, edit:false},
            home: {view:true, edit:false},
            equipment: {view:true, edit:false},
            annualinventory: {view:true, edit:true},
            hra: {view:true, edit:true},
            employee: {view:true, edit:true},
            eng4900: {view:true, edit:true},
            changehistory: {view:true, edit:false},
            authorizedusers:{view:false, edit:false},
		    registrationviewer:{view:false,edit:false},
		    employee2:{view:false,edit:false}
        }, */
        hra_1:{
            admin:{view:false, edit:false},
            home: {view:true, edit:false},
            equipment: {view:true, edit:true},
            annualinventory: {view:true, edit:true},
            hra: {view:true, edit:true}, //should only be able to edit their HRA info but can view all HRAs
            employee: {view:true, edit:true}, // edit:false allow users to edit their own info
            eng4900: {view:true, edit:true},
            changehistory: {view:true, edit:true},
            authorizedusers:{view:true, edit:true},
            employee2:{view:true,edit:true},
            registeredusers:{view:true,edit:true},
            registrationviewer:{view:true,edit:true},
            employee2:{view:true,edit:true}
        },
        /* hra_2:{
            admin:{view:false, edit:false},
            home: {view:true, edit:false},
            equipment: {view:true, edit:true},
            annualinventory: {view:true, edit:true},
            hra: {view:true, edit:true},
            employee: {view:true, edit:true},
            eng4900: {view:true, edit:true},
            changehistory: {view:true, edit:true},
            authorizedusers:{view:true, edit:true},
            registrationviewer:{view:true,edit:true},
            employee2:{view:true,edit:true}
        }, */
    }
}