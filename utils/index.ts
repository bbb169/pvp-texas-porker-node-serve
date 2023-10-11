const trimReg = /(^\s*)|(\s*$)/g;

/**
 * @param obj
 * @returns {boolean}
 */
export function isEmpty (obj: any): obj is undefined | null | '' {
    if (obj === undefined || obj === '' || obj === null) {
        return true;
    }
    if (typeof (obj) === 'string') {
        obj = obj.replace(trimReg, '');
        if (obj === '' || obj === null || obj === 'null' || obj === undefined || obj === 'undefined') {
            return true;
        }
        return false;
    } else if (typeof (obj) === 'undefined') {
        return true;
    } else if (typeof (obj) === 'object') {
        for (const value in obj) {
            return false;
        }
        return true;
    } else if (typeof (obj) === 'boolean') {
        return false;
    }
    return false;
}