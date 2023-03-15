import './stylesheets/app.scss'
import 'remixicon/fonts/remixicon.css';
import {renderErrors, renderSchedules} from './rendering';
import {checkForDuplicates, eachWithObject, shuffleArray, downloadExcel} from "./helpers";
import {layoutSchedule} from "./logic";
import {getFormData, loadForm} from "./form";

export const SPECIAL_CELLS = {
    OOF: { text: '', fullWidth: true, color: '#aaa' },
    LUNCH: { text: 'LUNCH', fullWidth: true, color: '#aaa' },
    EARLY_RELEASE: { text: 'EARLY RELEASE', group: 'EARLY_RELEASE', fullWidth: true, color: '#ddd' },
    SPECIALS_ARTIC: { text: 'SPECIALS ARTIC', group: 'SPECIALS_ARTIC', fullWidth: true, color: '#D7B5A6' }
}

// Note: blockGradeIds is accounted for canPutClassInSlot
export const periods = [
    { id: 'PER 1', timeRange: '8:10 - 8:55', blockGradeIds: [], lunch: false, header: "HOMEROOM 7:55 - 8:10" },
    { id: 'PER 2', timeRange: '9:00 - 9:45', blockGradeIds: [], lunch: false },
    { id: 'PER 3', timeRange: '10:05 - 10:50', blockGradeIds: [], lunch: false, header: "RECESS 9:45 - 10:00" },
    { id: 'PER 4', timeRange: '10:55 - 11:40', blockGradeIds: ['P','K','1','2'], lunch: true, header: "LUNCH Lower 11:00 - 11:40 (K,1,2)" },
    { id: 'Specials Lunch', timeRange: '11:45 - 12:25', blockGradeIds: ['3','4','5','6'], lunch: true, header: "LUNCH Upper 11:45 - 12:25 (3,4,5,6)" },
    { id: 'PER 5', timeRange: '12:30 - 1:15', blockGradeIds: [], lunch: false },
    { id: 'PER 6', timeRange: '1:20 - 2:05', blockGradeIds: [], lunch: false },
];

export const dows = [
    { id: 'M', name: 'Mon' },
    { id: 'T', name: 'Tues' },
    { id: 'W', name: 'Wed' },
    { id: 'R', name: 'Thurs' },
    { id: 'F', name: 'Fri' },
]

let initialGrades = [
    { id: 'P', color: '#568ef2', classIds: ['A3'] },
    { id: 'K', color: '#E06666', classIds: ['A1', 'A4', 'A5', 'A6'] },
    { id: '1', color: '#FFD966', classIds: ['C2', 'C3', 'C4', 'C5'] },
    { id: '2', color: '#FF9900', classIds: ['B2', 'B3', 'B4', 'B5'] },
    { id: '3', color: '#93C47D', classIds: ['B24', 'B25', 'B26'] },
    { id: '4', color: '#C38CDB', classIds: ['C24', 'C25', 'C26'] },
    { id: '5', color: '#EAD1DC', classIds: ['C21', 'C22', 'C23', 'C1'] },
    { id: '6', color: '#00FFFF', classIds: ['B21', 'B22'] },
];

/** alternate colors */
// let initialGrades = [
//     { id: 'P', color: '#81acdb', classIds: ['A3'] },
//     { id: 'K', color: '#E15759', classIds: ['A1', 'A4', 'A5', 'A6'] },
//     { id: '1', color: '#EDC948', classIds: ['C2', 'C3', 'C4', 'C5'] },
//     { id: '2', color: '#F28E2B', classIds: ['B2', 'B3', 'B4', 'B5'] },
//     { id: '3', color: '#59A14F', classIds: ['B24', 'B25', 'B26'] },
//     { id: '4', color: '#B07AA1', classIds: ['C24', 'C25', 'C26'] },
//     { id: '5', color: '#FF9DA7', classIds: ['C21', 'C22', 'C23', 'C1'] },
//     { id: '6', color: '#76B7B2', classIds: ['B21', 'B22'] },
// ];

// Note: blockTods is accounted for in result, blockGradeIds accounted for in remaining
let initialSubjects = [
    { id: 'K-2 ART', blockTods: ['M','F'], blockGradeIds: ['3','4','5','6'] },
    { id: '3-6 ART', blockTods: [{dowId: 'W', periodIds: ['PER 1','PER 2']},'R','F'], blockGradeIds: ['P','K','1','2'] },
    { id: 'MUSIC', blockTods: [], blockGradeIds: [] },
    { id: 'PE', blockTods: [], blockGradeIds: [] },
    { id: 'LIBRARY', blockTods: [], blockGradeIds: [] },
    { id: 'LANGUAGE', blockTods: [], blockGradeIds: [] },
    { id: 'SPECIAL', blockTods: [], blockGradeIds: [] },
]

let initialDowPriority = [['T','W','R'], ['M','F']];
let initialPeriodPriority = ['PER 5','PER 6','PER 4','PER 3','PER 2','PER 1','Specials Lunch'];

// TODO We are immediately initializing the grade ids so we can load the blockGradeIds element in subjectsList.
//      If we ever allow the user to add/remove grades we will have to update this. If a user modifies the grades it
//      needs to cascade to other form elements, e.g. updating the subject's "Exclude Grades" multi select.
export let grades = initialGrades.map(grade => ({ id: grade.id }));
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

function initPriorities() {
    // dowPriority = initialDowPriority.filter(priority => dows.some(dow => dow.id === priority));
    // periodPriority = initialPeriodPriority.filter(priority => periods.some(period => period.id === priority));
    dowPriority = initialDowPriority;
    periodPriority = initialPeriodPriority;

    gradePriority = shuffleArray(grades.map(grade => grade.id));
    subjectPriority = shuffleArray(subjects.map(subject => subject.id));
}

export function generate() {
    const formData = getFormData();
    grades = formData.grades;
    subjects = formData.subjects;

    let errors = validateConfiguration();
    if (errors.length) {
        renderErrors(errors);
        return;
    }

    initPriorities();

    initIndexes();
    initLookups();
    initResult();
    initRemaining();

    layoutSchedule();
    renderSchedules();

    // Log errors for any slots remaining
    for (let [remainsId, remains] of Object.entries(remaining)) {
        errors.push(`${remains.subject} had no remaining slots for class ${remains.class} (grade ${remains.grade})`)
    }

    renderErrors(errors);
}

loadForm({
    grades: initialGrades,
    subjects: initialSubjects
});