import './stylesheets/app.scss'
import 'remixicon/fonts/remixicon.css';
import {renderErrors, renderSchedules} from './rendering';
import {checkForDuplicates, eachWithObject, shuffleArray, downloadExcel} from "./helpers";
import {layoutSchedule} from "./logic";
import {getFormData} from "./form";
import {defaultDowPriority, defaultPeriodPriority, loadStateFromLocal, saveStateToLocal} from "./state";

export const SPECIAL_CELLS = {
    OOF: { text: '', color: '#aaa' },
    LUNCH: { text: 'LUNCH', color: '#aaa', borders: false },
    EARLY_RELEASE: { text: 'EARLY RELEASE', group: 'EARLY_RELEASE', mergeTopAndBottom: true, color: '#ddd' },
    SPECIALS_ARTIC: { text: 'SPECIALS ARTIC', group: 'SPECIALS_ARTIC', mergeTopAndBottom: true, color: '#D7B5A6' }
}

// TODO ------------- Move a lot of this stuff to state.js

// Note: blockGradeIds is accounted for canPutClassInSlot
export const periods = [
    { id: 'PER 1', timeRange: '8:10 - 8:55', blockGradeIds: [], lunch: false, header: "HOMEROOM 7:55 - 8:10" },
    { id: 'PER 2', timeRange: '9:00 - 9:45', blockGradeIds: [], lunch: false, header: " " },
    { id: 'PER 3', timeRange: '10:05 - 10:50', blockGradeIds: [], lunch: false, header: "RECESS 9:45 - 10:00" },
    { id: 'PER 4', timeRange: '10:55 - 11:40', blockGradeIds: ['P','K','1','2'], lunch: true, header: "LUNCH Lower 11:00 - 11:40 (K,1,2)" },
    { id: 'PER 5', timeRange: '11:45 - 12:25', blockGradeIds: ['3','4','5','6'], lunch: true, header: "LUNCH Upper 11:45 - 12:25 (3,4,5,6)" },
    { id: 'PER 6', timeRange: '12:30 - 1:15', blockGradeIds: [], lunch: false, header: " " },
    { id: 'PER 7', timeRange: '1:20 - 2:05', blockGradeIds: [], lunch: false, header: " " },
];

export const dows = [
    { id: 'M', name: 'Mon' },
    { id: 'T', name: 'Tues' },
    { id: 'W', name: 'Wed' },
    { id: 'R', name: 'Thurs' },
    { id: 'F', name: 'Fri' },
]

export let grades = [];
export let subjects = [];

export let dowPriority = [];
export let periodPriority = [];
export let gradePriority = [];
export let subjectPriority = [];

export let result;
export let remaining;

export let periodLookup;
export let dowLookup;
export let gradeLookup;
export let classLookup;
export let subjectLookup;

function initIndexes() {
    initIndex(periods);
    initIndex(dows);
    initIndex(grades);
    initIndex(subjects);
}

function initIndex(array) {
    array.forEach((record, index) => {
        record.index = index;
    })
}

function initLookups() {
    periodLookup = createLookup(periods);
    dowLookup = createLookup(dows);
    gradeLookup = createLookup(grades);
    subjectLookup = createLookup(subjects);

    classLookup = {};
    grades.forEach(grade => {
        grade.classIds.forEach(classId => {
            classLookup[classId] = {
                id: classId,
                gradeId: grade.id
            }
        })
    });
}

function createLookup(array) {
    return eachWithObject(array, {}, (record, lookup) => {
        lookup[record.id] = record;
    });
}

function initResult() {
    result = [];
    dows.forEach(dow => {
        let dowResult = [];
        periods.forEach(period => {
            let periodResult = [];
            subjects.forEach(subject => {
                periodResult.push(isSubjectBlocked(subject, dow, period) ? SPECIAL_CELLS.OOF : null);
            });
            dowResult.push(periodResult);
        });
        result.push(dowResult);
    });
}

function isSubjectBlocked(subject, dow, period) {
    let blocked = false;

    subject.blockTods.forEach(tod => {
        if (blocked) { return; }

        // note: tod can be a string like 'W' or an object of times-of-day, like {dowId: 'W', periodIds: ['PER 1','PER 2']}
        if (typeof tod === 'string' && tod === dow.id) {
            blocked = true;
        }
        else if (tod.dowId === dow.id && tod.periodIds.includes(period.id)) {
            blocked = true;
        }
    });

    return blocked;
}

function initRemaining() {
    remaining = {};
    grades.forEach(grade => {
        subjects.forEach(subject => {
            grade.classIds.forEach(classId => {
                if (!subject.blockGradeIds.includes(grade.id)) {
                    addRemaining(grade.id, subject.id, classId);
                }
            })
        });
    });
}

function remainingKey(gradeId, subjectId, classId) {
    return `${gradeId}.${subjectId}.${classId}`
}
export function isRemaining(gradeId, subjectId, classId) {
    return remaining[remainingKey(gradeId, subjectId, classId)] !== undefined;
}
export function removeRemaining(gradeId, subjectId, classId) {
    delete remaining[remainingKey(gradeId, subjectId, classId)]
}
export function addRemaining(gradeId, subjectId, classId) {
    remaining[remainingKey(gradeId, subjectId, classId)] = {
        grade: gradeId,
        subject: subjectId,
        "class": classId
    };
}

// TODO We are immediately initializing the grade ids so we can load the blockGradeIds element in subjectsList.
//      If we ever allow the user to add/remove grades we will have to update this. If a user modifies the grades it
//      needs to cascade to other form elements, e.g. updating the subject's "Exclude Grades" multi select.
export function initGrades(newGrades) {
    if (!grades.length) {
        grades = newGrades.map(grade => ({ id: grade.id }));
    }
}

function validateConfiguration() {
    let errors = [];

    if (checkForDuplicates(periods.map(period => period.id))) {
        errors.push("Multiple periods have the same id");
    }

    if (checkForDuplicates(dows.map(dow => dow.id))) {
        errors.push("Multiple DOWs have the same id");
    }

    if (checkForDuplicates(grades.map(grade => grade.id))) {
        errors.push("Multiple grades have the same name");
    }

    // if (checkForDuplicates(grades.map(grade => grade.color))) {
    //     errors.push("Multiple grades have the same color");
    // }

    let classIdCounts = {};
    grades.forEach(grade => grade.classIds.forEach(classId => {
        if (classIdCounts[classId] === undefined) { classIdCounts[classId] = 0; }
        classIdCounts[classId] += 1;
    }));
    for (let [id, count] of Object.entries(classIdCounts)) {
        if (count > 1) {
            errors.push(`There are multiple classes named ${id}`);
        }
    }

    if (checkForDuplicates(subjects.map(subject => subject.id))) {
        errors.push("Multiple subjects have the same name");
    }
    if (subjects.some(subject => subject.id === '')) {
        errors.push("Subjects cannot have a blank name");
    }

    return errors;
}

function randomizePriorities() {
    // dowPriority = defaultDowPriority.filter(priority => dows.some(dow => dow.id === priority));
    // periodPriority = defaultPeriodPriority.filter(priority => periods.some(period => period.id === priority));
    dowPriority = defaultDowPriority;
    periodPriority = defaultPeriodPriority;

    gradePriority = shuffleArray(grades.map(grade => grade.id));
    subjectPriority = shuffleArray(subjects.map(subject => subject.id));
}

export function generate(isTrial) {
    const formData = getFormData();
    grades = formData.grades;
    subjects = formData.subjects;

    let errors = validateConfiguration();
    if (errors.length) {
        renderErrors(errors);
        return errors;
    }

    saveStateToLocal(formData);

    randomizePriorities();

    initIndexes();
    initLookups();
    initResult();
    initRemaining();

    layoutSchedule();

    // Log errors for any slots remaining
    for (let [remainsId, remains] of Object.entries(remaining)) {
        errors.push(`${remains.subject} had no available times for class ${remains.class} (grade ${remains.grade})`)
    }

    // Do not bother rendering if there are errors and this is the first attempt of many
    if (isTrial && errors.length) { return errors; }

    renderSchedules();
    renderErrors(errors);

    return errors;
}

/**
 * Runs the generate function, but if errors occur it runs it again, up to n times total.
 *
 * This can be useful to reduce the likelyhood of a collision. E.g. if there is a 10% chance for a collision, sending
 * n = 2 will make it a 1% chance.
 *
 * Don't pass a value of n that's too high tho, otherwise it may take a long time to generate if the error % is high.
 */
export function generateN(n = 1) {
    let errors;

    for (let i = 0; i < n; i++) {
        errors = generate(i < n - 1);

        if (!errors.length) {
            return [];
        }
    }

    return errors;
}

loadStateFromLocal();
generateN(2);