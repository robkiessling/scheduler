

export function checkForDuplicates(array) {
    return new Set(array).size !== array.length;
}

// Builds an object while iterating over an array (similar to ruby's each_with_object method)
export function eachWithObject(array, initialObject = {}, callback) {
    return array.reduce((obj, element) => {
        callback(element, obj);
        return obj;
    }, initialObject);
}

// Shuffle an array randomly
// https://stackoverflow.com/a/12646864/4904996
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Shuffle an array randomly according to seed value
// https://stackoverflow.com/a/53758827/4904996
export function shuffleArrayWithSeed(array, seed) {
    let m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {
        // Pick a remaining element…
        i = Math.floor(random(seed) * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
        ++seed;
    }

    return array;
}

function random(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// https://stackoverflow.com/a/20871714/4904996
export function permutations(inputArr) {
    let result = [];

    function permute(arr, m = []) {
        if (arr.length === 0) {
            result.push(m)
        } else {
            for (let i = 0; i < arr.length; i++) {
                let curr = arr.slice();
                let next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next))
            }
        }
    }

    permute(inputArr);

    return result;
}

// Adapted from https://stackoverflow.com/a/28348231
// TODO Unable to change filename from 'download.xls'
// TODO File is .xls not .xlsx, and shows a warning when opened in excel
export const downloadExcel = (function() {
    const uri = 'data:application/vnd.ms-excel;base64,';
    const template =
        '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
        '<head>' +
            '<!--[if gte mso 9]>' +
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
                        '<x:Name>{worksheet}</x:Name>' +
                        '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
                    '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>' +
                '</xml>' +
            '<![endif]-->' +
        '</head>' +
        '<body><table>{table}</table></body></html>';

    const base64 = function(s) {
        return window.btoa(unescape(encodeURIComponent(s)))
    }

    const format = function(s, c) {
        return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; })
    }

    return function(table, worksheetName = '') {
        const ctx = { worksheet: worksheetName, table: table.innerHTML };
        window.location.href = uri + base64(format(template, ctx));
    }
})();
