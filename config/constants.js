module.exports = {
    BLANKS_DEFAULT : 'includeBlanks',
    searchOptions : {
        'includes':'LIKE',
        'excludes':'NOT LIKE',
        'equals':'=',
        'notEquals':'!='
    },
    searchBlanks : {
        'includeBlanks':'',
        'excludeBlanks':'!=',
        'onlyBlanks':'='
    },
    blankAndOr : {
        'includeBlanks':'OR',
        'excludeBlanks':'AND',
        'onlyBlanks':'OR',
    },
    blankNull : {
        '=':'IS',
        '!=':'IS NOT',
    }
}