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
    /*
	USER ROLES:
		admin - full access to the system

		employee_1 - Considered a regular/standard user. Most users will be at this level. 
			View access to the home and equipment tabs. 

		employe_2 - Someone assisting with annual inventory/finding equipment but not making documents. 
			View access to the following tabs: home, equipment, annual inventory, hra, employee, ENG4900, and change history

		employee_3 - An authorized user. Someone who has permission to make documents and/or sign on behalf of an HRA holder. 
		             Typically a management assistant. 
			View access to the following tabs: home, equipment, annual inventory, hra, employee, ENG4900, change history, and authorized users
			Edit capabilites in the following tabs: annual inventory and ENG4900
		
		hra_1 - This is an HRA holder
			View access to the following tabs:  home, equipment, annual inventory, hra, employee, ENG4900, change history, and authorized users
			Edit capabilities in the following tabs: equipment, annual inventory, hra, employee, ENG4900, change history, and authorized users

*/
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