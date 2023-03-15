import {
    SPECIAL_CELLS,
    result,
    periods, subjects,
    dowPriority, periodPriority, gradePriority, subjectPriority,
    dowLookup, periodLookup, gradeLookup, subjectLookup, classLookup,
    remaining, isRemaining, removeRemaining, addRemaining
} from "./index";
import {permutations, shuffleArray} from "./helpers";

export function layoutSchedule() {
    createEarlyReleaseDay();
    createGradeLevelMeetings();
    createSpecialsMeeting();
    randomizeRemaining();
    markLunchPeriods();
}

/**
 * School ends early on Wednesday, so we mark its final as "early release"
 */
function createEarlyReleaseDay() {
    let dowIndex = dowLookup['W'].index;
    let periodIndex = periods.length - 1;
    subjects.forEach((subject, subjectIndex) => {
        result[dowIndex][periodIndex][subjectIndex] = SPECIAL_CELLS.EARLY_RELEASE;
    });
}

/**
 * Need one period per week reserved for specials teachers to meet
 */
function createSpecialsMeeting() {
    let meetingCreated = false;
    iterateDows(dow => {
        if (meetingCreated) { return; }

        iteratePeriods(period => {
            if (meetingCreated) { return; }
            if (period.lunch) { return; }

            let canHaveMeeting = true;
            iterateSubjects(subject => {
                if (result[dow.index][period.index][subject.index] !== null) {
                    canHaveMeeting = false;
                }
            });

            if (canHaveMeeting) {
                subjects.forEach((subject, subjectIndex) => {
                    result[dow.index][period.index][subjectIndex] = SPECIAL_CELLS.SPECIALS_ARTIC;
                });
                meetingCreated = true;
            }
        });
    })
}

/**
 * Every grade level needs to find 2 consecutive periods where all classes for the grade are active
 * (this allows the teachers in that grade to meet with each other for 2 hours per week).
 */
function createGradeLevelMeetings() {
    iterateGrades(grade => {
        // Must have at least 2 different classes to hold grade level meetings
        if (grade.classIds.length <= 1) {
            return;
        }

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
    if (period.doNotStartArtic) {
        return false;
    }

    for (let offset = 0; offset <= subjects.length - grade.classIds.length; offset++) {
        let perms = permutations(grade.classIds);
        let group = `Grade ${grade.id}\n ARTIC`;

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
    // TODO Option: Give P and 6 lowest priority for SPECIAL

    // Random order:
    let remainingArray = Object.values(remaining);
    shuffleArray(remainingArray);
    remainingArray.forEach(remains => putClassInNextOpenSlot(classLookup[remains.class]));

    // Try to keep grades together:
    // Object.values(remaining).sort((a, b) => {
    //     return a.grade.localeCompare(b.grade) || a.subject.localeCompare(b.subject) || a.class.localeCompare(b.class);
    // }).forEach(remains => {
    //     putClassInNextOpenSlot(classLookup[remains.class]);
    // });
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
                if (period.lunch && result[dow.index][period.index][subject.index] === null) {
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
 *
 * The priority queue can have nested Array elements. A nested Array element means evaluate the Array at an equal priority.
 * For example, if the priority queue is: ['T','W','R', ['M','F']]
 * Iteration will proceed as:
 *   1) T
 *   2) W
 *   3) R
 *   4) 50% chance of either M or F
 *   5) whichever M or F wasn't used in step 4
 */
function iteratePriorityQueue(priorities, lookup, callback) {
    for(let i = 0; i < priorities.length; i++) {
        let priority = priorities[i];
        if (Array.isArray(priority)) {
            shuffleArray(priority);
            for (let j = 0; j < priority.length; j++) {
                const returnVal = callback(lookup[priority[j]], i+j);
                if (returnVal === false) { return false; }
            }
        }
        else {
            const returnVal = callback(lookup[priority], i);
            if (returnVal === false) { return false; }
        }
    }
}

function iterateGrades(callback) {
    iteratePriorityQueue(gradePriority, gradeLookup, callback);
}

function iterateDows(callback) {
    iteratePriorityQueue(dowPriority, dowLookup, callback);
}

function iteratePeriods(callback) {
    iteratePriorityQueue(periodPriority, periodLookup, callback);
}

function iterateSubjects(callback) {
    iteratePriorityQueue(subjectPriority, subjectLookup, callback);
}