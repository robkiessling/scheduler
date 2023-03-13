

export function checkForDuplicates(array) {
    return new Set(array).size !== array.length;
}