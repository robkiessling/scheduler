import './stylesheets/app.scss'
import {renderRemaining, renderMasterSchedule} from './rendering';
import {checkForDuplicates, eachWithObject, shuffleArray} from "./helpers";
import {layoutSchedule} from "./logic";

export const SPECIAL_CELLS = {
    OOF: { text: 'OOF', fullWidth: true, color: '#aaa' },
    LUNCH: { text: 'LUNCH', fullWidth: true, color: '#aaa' },
    EARLY_RELEASE: { text: 'EARLY RELEASE', group: 'EARLY_RELEASE', fullWidth: true, color: '#ddd' },
    EVENTS: { text: 'EVENTS', group: 'EVENTS', fullWidth: true, color: '#888' }
}

// blockGradeIds accounted for canPutClassInSlot
export const periods = [
    { id: 'PER 1', timeRange: '8:10 - 8:55', blockGradeIds: [], lunch: false },
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

export let grades = [
    // { id: 'P', color: 'lightpink', classIds: ['P1'] },
    { id: 'K', color: 'indianred', classIds: ['A1', 'A4', 'A5', 'A6'] },
    { id: '1', color: 'gold', classIds: ['C2', 'C3', 'C4', 'C5'] },
    { id: '2', color: 'darkorange', classIds: ['B2', 'B3', 'B4', 'B5'] },
    { id: '3', color: 'olivedrab', classIds: ['B24', 'B25', 'B26'] },
    { id: '4', color: 'mediumpurple', classIds: ['C24', 'C25', 'C26'] },
    { id: '5', color: 'plum', classIds: ['C21', 'C22', 'C23'] },
    { id: '6', color: 'aqua', classIds: ['B21', 'B22', 'B23'] },
];
grades.forEach(grade => {
    grade.classIds = grade.classIds.map(classId => `${classId} (${grade.id})`);
});

// blockDowIds accounted for in result, blockGradeIds accounted for in remaining
export let subjects = [
    { id: 'K-2 ART', blockDowIds: ['M','F'], blockGradeIds: ['3','4','5','6'] },
    { id: '3-6 ART', blockDowIds: ['R','F'], blockGradeIds: ['P','K','1','2'] },
    { id: 'MUSIC', blockDowIds: [], blockGradeIds: [] },
    { id: 'PE', blockDowIds: [], blockGradeIds: [] },
    { id: 'LIBRARY', blockDowIds: [], blockGradeIds: [] },
    { id: 'LANGUAGE', blockDowIds: [], blockGradeIds: [] },
    { id: 'SPECIAL', blockDowIds: ['M'], blockGradeIds: [] }, // TODO forces special to a single day
];

export let dowPriority = ['T','W','R','M','F'];
// export let periodPriority = ['PER 6','PER 5','Specials Lunch','PER 4','PER 3','PER 2','PER 1'];
export let periodPriority = ['PER 6','PER 5','PER 4','PER 3','PER 2','PER 1','Specials Lunch'];

// TODO just setting biggest to smallest
// TODO Putting K last, so other grades can fill T/W/R morning first
export let gradePriority = ['2','1','K','3','4','5','6']; // causes an ARTIC on monday
// export let gradePriority = ['3','4','5','6','2','1','K'];
shuffleArray(gradePriority);

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
                periodResult.push(subject.blockDowIds.includes(dow.id) ? SPECIAL_CELLS.OOF : null);
            });
            dowResult.push(periodResult);
        });
        result.push(dowResult);
    });
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

function validateInputs() {
    if (checkForDuplicates(periods.map(period => period.id))) {
        console.error("Duplicate period ids found");
    }
    if (checkForDuplicates(dows.map(dow => dow.id))) {
        console.error("Duplicate dow ids found");
    }
    if (checkForDuplicates(grades.map(grade => grade.id))) {
        console.error("Duplicate grade ids found");
    }
    if (checkForDuplicates(grades.map(grade => grade.color))) {
        console.error("Duplicate grade colors found");
    }
    let allClassIds = [];
    grades.forEach(grade => grade.classIds.forEach(classId => allClassIds.push(classId)));
    if (checkForDuplicates(allClassIds)) {
        console.error("Duplicates class ids found");
    }
    if (checkForDuplicates(subjects.map(subject => subject.id))) {
        console.error("Duplicate subject ids found");
    }
    dowPriority.forEach(dow => checkForeignKey(dow, dows));
    periodPriority.forEach(period => checkForeignKey(period, periods));
}

function checkForeignKey(id, table) {
    if (!table.some(record => record.id === id)) {
        console.error(`Could not find id '${id}' in the following table:`)
        console.error(table)
    }
}

validateInputs();
initIndexes();
initLookups();
initResult();
initRemaining();
// renderRemaining();
layoutSchedule();
renderMasterSchedule();
renderRemaining();
