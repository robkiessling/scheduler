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
    createEarlyReleaseDay();
    createEventsPeriod();
    createGradeLevelMeetings();
    randomizeRemaining();
}

function createEarlyReleaseDay() {
    let dowIndex = dowLookup['W'].index;
    let periodIndex = periodLookup['PER 6'].index;
    subjects.forEach((subject, subjectIndex) => {
        result[dowIndex][periodIndex][subjectIndex] = SPECIAL_CELLS.EARLY_RELEASE;
    });
}

function createEventsPeriod() {
    let dowIndex = dowLookup['F'].index;
    let periodIndex = periodLookup['PER 6'].index;
    subjects.forEach((subject, subjectIndex) => {
        result[dowIndex][periodIndex][subjectIndex] = SPECIAL_CELLS.EVENTS;
    });
}

/**
 * Every grade level needs to find 2 consecutive periods where all of its classes are active at the same time
 */
function createGradeLevelMeetings() {
    iterateGrades(grade => {
        let meetingCreated = false;

        iterateDows(dow => {
            if (meetingCreated) { return; }

            iteratePeriods(period => {
                if (meetingCreated) { return; }

                meetingCreated = createGradeLevelMeeting(grade, dow, period);
            });
        });
        
        if (!meetingCreated) {
            console.error(`Could not find a grade-level meeting for grade ${grade.id}`);
        }
    })
}

/**
 * Tries to fit all of a grade's classes into the given period (and the subsequent period).
 *
 * Find a match by going through all the permutations of the grade classes. Currently we only make permutations for
 * consecutive subjects - this makes it so we can display the group better during rendering, and it also reduces
 * the total number of permutations to try.
 *
 * Returns true if the meeting could be created, returns false if the combination is not possible.
 */
function createGradeLevelMeeting(grade, dow, period) {
    for (let offset = 0; offset <= subjects.length - grade.classIds.length; offset++) {
        let perms = permutations(grade.classIds);
        let group = `Grade ${grade.id}<br> ARTIC`;

        // There are 2 permutations going on - one for the current period and one for the subsequent period.
        for (let i = 0; i < perms.length; i++) {
            if (permutationMatches(perms[i], offset, dow, period.index)) {
                // If the 1st permutation matches, we apply it so we can then test if the 2nd permutation will
                // match in the subsequent period (we have to apply it because that affects canPutClassInSlot method).
                // If 2nd permutation does not match, we will undo the application of the 1st permutation.
                applyPermutation(perms[i], offset, dow, period.index, group);
                for (let j = 0; j < perms.length; j++) { 
                    if (permutationMatches(perms[j], offset, dow, period.index + 1)) {
                        applyPermutation(perms[j], offset, dow, period.index + 1, group);
                        return true;
                    }
                }
                removePermutation(perms[i], offset, dow, period.index);
            }
        }
    }
    return false;
}

// Returns true if the permutation of classes can all fit into their slots
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
        removeClassFromSlot(classLookup[classId], dow, periods[periodIndex], subjects[subjectIndex])
    });
}

function randomizeRemaining() {
    // Random order:
    let remainingArray = Object.values(remaining);
    shuffleArray(remainingArray);
    remainingArray.forEach(remains => putInNextOpenSlot(remains.class));

    // In order:
    // for (let [remainsId, remains] of Object.entries(remaining)) {
    //     putInNextOpenSlot(remains.class);
    // }
}

function putInNextOpenSlot(classId) {
    iterateDows(dow => {
        return iteratePeriods(period => {
            return iterateSubjects(subject => {
                if (canPutClassInSlot(classLookup[classId], dow, period, subject)) {
                    putClassInSlot(classLookup[classId], dow, period, subject);
                    return false; // Break early
                }
            });
        })
    });
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
function removeClassFromSlot(klass, dow, period, subject) {
    addRemaining(klass.gradeId, subject.id, klass.id);
    result[dow.index][period.index][subject.index] = null;
}





/**
 * The following iterators iterate through the records in a priority order. If the callback returns false, iteration
 * will cease and the iterator will also return false.
 */

function iterateGrades(callback) {
    for(let i = 0; i < gradePriority.length; i++) {
        const returnVal = callback(gradeLookup[gradePriority[i]], i);
        if (returnVal === false) { return false; }
    }
}

function iterateDows(callback) {
    for(let i = 0; i < dowPriority.length; i++) {
        const returnVal = callback(dowLookup[dowPriority[i]], i);
        if (returnVal === false) { return false; }
    }
}

function iteratePeriods(callback) {
    for(let i = 0; i < periodPriority.length; i++) {
        const returnVal = callback(periodLookup[periodPriority[i]], i);
        if (returnVal === false) { return false; }
    }
}

function iterateSubjects(callback) {
    for(let i = 0; i < subjects.length; i++) {
        const returnVal = callback(subjects[i], i);
        if (returnVal === false) { return false; }
    }
}