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
    }
}