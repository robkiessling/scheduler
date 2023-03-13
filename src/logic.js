import {
    SPECIAL_CELLS,
    result,
    subjects,
    gradePriority,
    dowLookup,
    periodLookup,
    gradeLookup,
    dowPriority,
    periodPriority,
    periods,
    isRemaining,
    remaining,
    classLookup,
    dows, removeRemaining, addRemaining
} from "./index";
import {permutations, shuffleArray} from "./helpers";

export function layoutSchedule() {
    applyEarlyRelease();
    applyEvents();
    applyGradeLevelMeetings();
    randomizeRemaining();
}

function applyEarlyRelease() {
    let dowIndex = dowLookup['W'].index;
    let periodIndex = periodLookup['PER 6'].index;
    subjects.forEach((subject, subjectIndex) => {
        result[dowIndex][periodIndex][subjectIndex] = SPECIAL_CELLS.EARLY_RELEASE;
    });
}

function applyEvents() {
    let dowIndex = dowLookup['F'].index;
    let periodIndex = periodLookup['PER 6'].index;
    subjects.forEach((subject, subjectIndex) => {
        result[dowIndex][periodIndex][subjectIndex] = SPECIAL_CELLS.EVENTS;
    });
}

function applyGradeLevelMeetings() {
    iterateGrades(grade => {
        let foundGradeMatch = false;
        iterateDows(dow => {
            if (foundGradeMatch) { return; }
            iteratePeriods(period => {
                if (foundGradeMatch) { return; }

                for (let offset = 0; offset <= subjects.length - grade.classIds.length; offset++) {
                    let perms = permutations(grade.classIds);
                    let group = `Grade ${grade.id}<br> ARTIC`;

                    perms.forEach(perm1 => {
                        if (foundGradeMatch) { return; }

                        if (permutationMatches(perm1, offset, dow, period.index)) {
                            applyPermutation(perm1, offset, dow, period.index, group);
                            perms.forEach(perm2 => {
                                if (foundGradeMatch) { return; }
                                if (permutationMatches(perm2, offset, dow, period.index + 1)) {
                                    applyPermutation(perm2, offset, dow, period.index + 1, group);
                                    // console.log(`placed ${grade.id} in ${period.index} / ${period.index+1}`)
                                    foundGradeMatch = true;
                                }
                            });
                            if (!foundGradeMatch) {
                                removePermutation(perm1, offset, dow, period.index);
                            }
                        }
                    });
                }
            });
        });
        if (!foundGradeMatch) {
            console.error(`Could not find a grade-level meeting for grade ${grade.id}`);
        }
    })
}

function permutationMatches(permutation, offset, dow, periodIndex) {
    if (periodIndex >= periods.length) {
        return false;
    }

    return permutation.every((classId, subjectOffset) => {
        let subjectIndex = offset + subjectOffset;
        return canPutClassInSlot(classLookup[classId], dow, periods[periodIndex], subjects[subjectIndex]);
    });
}

function applyPermutation(permutation, offset, dow, periodIndex, group) {
    permutation.forEach((classId, subjectOffset) => {
        let subjectIndex = offset + subjectOffset;
        putClassInSlot(classLookup[classId], dow, periods[periodIndex], subjects[subjectIndex], group)
    });
}

function removePermutation(permutation, offset, dow, periodIndex) {
    permutation.forEach((classId, subjectOffset) => {
        let subjectIndex = offset + subjectOffset;
        removeClassInSlot(classLookup[classId], dow, periods[periodIndex], subjects[subjectIndex])
    });
}

function randomizeRemaining() {
    // Random order:
    let remainingArray = Object.values(remaining);
    shuffleArray(remainingArray);
    remainingArray.forEach(remains => findNextOpenSlot(remains.class));

    // In order:
    // for (let [remainsId, remains] of Object.entries(remaining)) {
    //     findNextOpenSlot(remains.class);
    // }
}
function findNextOpenSlot(classId) {
    // for (let dowIndex = 0; dowIndex < result.length; dowIndex++) {
    //     for (let periodIndex = 0; periodIndex < result[dowIndex].length; periodIndex++) {
    //         for (let subjectIndex = 0; subjectIndex < result[dowIndex][periodIndex].length; subjectIndex++) {
    //             if (canPutClassInSlot(classLookup[classId], dows[dowIndex], periods[periodIndex], subjects[subjectIndex])) {
    //                 putClassInSlot(classLookup[classId], dows[dowIndex], periods[periodIndex], subjects[subjectIndex]);
    //                 return;
    //             }
    //         }
    //     }
    // }

    for (let dowP = 0; dowP < dowPriority.length; dowP++) {
        let dowIndex = dowLookup[dowPriority[dowP]].index;
        for (let periodP = 0; periodP < periodPriority.length; periodP++) {
            let periodIndex = periodLookup[periodPriority[periodP]].index;
            for (let subjectIndex = 0; subjectIndex < result[dowIndex][periodIndex].length; subjectIndex++) {
                if (canPutClassInSlot(classLookup[classId], dows[dowIndex], periods[periodIndex], subjects[subjectIndex])) {
                    putClassInSlot(classLookup[classId], dows[dowIndex], periods[periodIndex], subjects[subjectIndex]);
                    return;
                }
            }
        }
    }
}

function canPutClassInSlot(klass, dow, period, subject) {
    if (!isRemaining(klass.gradeId, subject.id, klass.id)) {
        return false;
    }

    if (period.blockGradeIds.includes(klass.gradeId)) {
        return false;
    }

    // class must not be doing something else at this time
    let classInUse = false;
    result[dow.index][period.index].forEach(slot => {
        if (slot && slot.classId === klass.id) {
            classInUse = true;
        }
    });
    if (classInUse) {
        return false;
    }

    // subject must have a different open lunch spot in the dow
    let hasOpenLunch = false;
    result[dow.index].forEach((slots, otherPeriodIndex) => {
        if (hasOpenLunch) { return; }

        let otherPeriod = periods[otherPeriodIndex];
        if (otherPeriod.lunch && period.index !== otherPeriod.index && slots[subject.index] === null) {
            hasOpenLunch = true;
        }
    });
    if (!hasOpenLunch) {
        return false;
    }

    // slot must be empty
    return result[dow.index][period.index][subject.index] === null;
}

function putClassInSlot(klass, dow, period, subject, group) {
    result[dow.index][period.index][subject.index] = {
        text: klass.id,
        classId: klass.id,
        color: gradeLookup[klass.gradeId].color,
        group: group
    };
    removeRemaining(klass.gradeId, subject.id, klass.id);
}
function removeClassInSlot(klass, dow, period, subject) {
    addRemaining(klass.gradeId, subject.id, klass.id);
    result[dow.index][period.index][subject.index] = null;
}


function iterateGrades(callback) {
    // standard order:
    // grades.forEach((grade, index) => callback(grade, index));

    // priority order:
    gradePriority.forEach((gradeId, index) => callback(gradeLookup[gradeId], index));
}
function iterateDows(callback) {
    dowPriority.forEach((dowId, index) => callback(dowLookup[dowId], index));
}
function iteratePeriods(callback) {
    periodPriority.forEach((periodId, index) => callback(periodLookup[periodId], index));
}