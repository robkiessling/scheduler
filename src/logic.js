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
    markLunchPeriods();
}

/**
 * School ends early on Wednesday, so we mark its period 6 as "early release"
 */
function createEarlyReleaseDay() {
    let dowIndex = dowLookup['W'].index;
    let periodIndex = periodLookup['PER 6'].index;
    subjects.forEach((subject, subjectIndex) => {
        result[dowIndex][periodIndex][subjectIndex] = SPECIAL_CELLS.EARLY_RELEASE;
    });
}

/**
 * Reserve period 6 on fridays for events
 */
function createEventsPeriod() {
    let dowIndex = dowLookup['F'].index;
    let periodIndex = periodLookup['PER 6'].index;
    subjects.forEach((subject, subjectIndex) => {
        result[dowIndex][periodIndex][subjectIndex] = SPECIAL_CELLS.EVENTS;
    });
}

/**
 * Every grade level needs to find 2 consecutive periods where all classes for the grade are active
 * (this allows the teachers in that grade to meet with each other for 2 hours per week).
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
 * Tries to fit all of a grade's classes into 2 consecutive periods (starting with the period given in the parameters).
 *
 * It finds a match by iterating through all the permutations of the grade's classes, and seeing if the permutation
 * fits in the appropriate subjects for the period. If everything fits, the cells will be filled and each cell will
 * have a special 'group' attribute denoting the grade level meeting.
 *
 * Note: Currently we only include permutations where the classes are in consecutive subjects. This means that the
 *       order of the subjects actually affects things. It is implemented this way because that's how the old teacher
 *       seemed to do it (it makes it easier to display the actual group during rendering). It also reduces the total
 *       number of permutations we have to try.
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
    remainingArray.forEach(remains => putClassInNextOpenSlot(classLookup[remains.class]));

    // In order:
    // for (let [remainsId, remains] of Object.entries(remaining)) {
    //     putClassInNextOpenSlot(remains.class);
    // }
}

function putClassInNextOpenSlot(klass) {
    iterateDows(dow => {
        return iteratePeriods(period => {
            return iterateSubjects(subject => {
                if (canPutClassInSlot(klass, dow, period, subject)) {
                    putClassInSlot(klass, dow, period, subject);
                    return false; // Break early
                }
            });
        })
    });
}

function markLunchPeriods() {
    iterateDows(dow => {
        iterateSubjects(subject => {
            // Iterating periods in reverse order, since we want to try place lunch in the lowest priority period
            for(let i = periodPriority.length - 1; i >= 0; i--) {
                let period = periodLookup[periodPriority[i]];
                if (result[dow.index][period.index][subject.index] === null) {
                    result[dow.index][period.index][subject.index] = SPECIAL_CELLS.LUNCH;
                    break;
                }
            }
        });
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