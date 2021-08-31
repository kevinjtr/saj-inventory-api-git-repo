module.exports = () => {
    const and_function = (q) => q != '' ? 'AND' : ''
    const or_function = (q) => q != '' ? 'OR' : ''

    return{
        and_ : and_function,
        or_ : or_function,
        andOR_single : {
            'includes':and_function,
            'excludes':and_function,
            'equals':and_function,
            'notEquals':and_function
        },
        andOR_multiple : {
            'includes':or_function,
            'excludes':and_function,
            'equals':or_function,
            'notEquals':and_function
        }
    }
};

