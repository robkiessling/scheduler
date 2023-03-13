

export function checkForDuplicates(array) {
    return new Set(array).size !== array.length;
}

export function isFunction(value) {
    return typeof value === 'function';
}

// Builds an object while iterating over an array (similar to ruby's each_with_object method)
export function eachWithObject(array, initialObject = {}, callback) {
    return array.reduce((obj, element) => {
        callback(element, obj);
        return obj;
    }, initialObject);
}

// Returns a new object while transforming the object values (similar to ruby's transform_values method)
export function transformValues(obj, callback) {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, callback(v, k, i)]
        )
    );
}

// https://stackoverflow.com/a/12646864/4904996
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
