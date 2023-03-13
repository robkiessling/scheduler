import './stylesheets/app.scss'
import {renderRemaining, renderTable} from './rendering';
import {checkForDuplicates} from "./helpers";

export const OOF = 'OOF'
export const LUNCH = 'LUNCH'

export const periods = [
    { id: 'PER 1', timeRange: '8:10 - 8:55', blockGrades: [], lunch: false },
    { id: 'PER 2', timeRange: '9:00 - 9:45', blockGrades: [], lunch: false },
    { id: 'PER 3', timeRange: '10:05 - 10:50', blockGrades: [], lunch: false },
    { id: 'PER 4', timeRange: '10:55 - 11:40', blockGrades: ['P','K','1','2'], lunch: true },
    { id: 'Specials Lunch', timeRange: '11:45 - 12:25', blockGrades: ['3','4','5','6'], lunch: true },
    { id: 'PER 5', timeRange: '12:30 - 1:15', blockGrades: [], lunch: false },
    { id: 'PER 6', timeRange: '1:20 - 2:05', blockGrades: [], lunch: false },
];

export const dows = [
    { id: 'M', name: 'Mon' },
    { id: 'T', name: 'Tues' },
    { id: 'W', name: 'Wed' },
    { id: 'R', name: 'Thurs' },
    { id: 'F', name: 'Fri' },
]

export let grades = [
    // { id: 'P', color: 'lightpink', classes: ['P1'] },
    { id: 'K', color: 'indianred', classes: ['A1', 'A4', 'A5', 'A6'] },
    { id: '1', color: 'gold', classes: ['C2', 'C3', 'C4', 'C5'] },
    { id: '2', color: 'darkorange', classes: ['B2', 'B3', 'B4', 'B5'] },
    { id: '3', color: 'olivedrab', classes: ['B24', 'B25', 'B26'] },
    { id: '4', color: 'mediumpurple', classes: ['C24', 'C25', 'C26'] },
    { id: '5', color: 'plum', classes: ['C21', 'C22', 'C23'] },
    { id: '6', color: 'aqua', classes: ['B21', 'B22', 'B23'] },
];

export let subjects = [
    { id: 'K-2 ART', blockDows: ['M','F'], blockGrades: ['3','4','5','6'] },
    { id: '3-6 ART', blockDows: ['R','F'], blockGrades: ['P','K','1','2'] },
    { id: 'MUSIC', blockDows: [], blockGrades: [] },
    { id: 'PE', blockDows: [], blockGrades: [] },
    { id: 'LIBRARY', blockDows: [], blockGrades: [] },
    { id: 'LANGUAGE', blockDows: [], blockGrades: [] },
    { id: 'SPECIAL', blockDows: ['M','T','W','F'], blockGrades: [] }, // TODO forces special to a single day
];

export let dayPriority = ['T','W','R','M','F'];
export let periodPriority = ['PER 6','PER 5','Specials Lunch','PER 4','PER 3','PER 2','PER 1'];

export let result;
export let remaining;
export let classLookup;

function initResult() {
    result = [];
    dows.forEach(dow => {
        let dowResult = [];
        periods.forEach(period => {
            let periodResult = [];
            subjects.forEach(subject => {
                periodResult.push(subject.blockDows.includes(dow.id) ? OOF : null);
            });
            dowResult.push(periodResult);
        });
        result.push(dowResult);
    });
    console.log(result);
}

function initRemaining() {
    remaining = [];
    grades.forEach(grade => {
        subjects.forEach(subject => {
            grade.classes.forEach(klass => {
                if (!subject.blockGrades.includes(grade.id)) {
                    remaining.push({ grade: grade.id, subject: subject.id, "class": klass })
                }
            })
        });
    });
    console.log(remaining);
}
function initClassLookup() {
    classLookup = {};
    grades.forEach(grade => {
        grade.classes.forEach(klass => {
            classLookup[klass] = {
                id: klass,
                grade: grade.id,
                gradeColor: grade.color
            }
        })
    });
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
    let allClasses = [];
    grades.forEach(grade => grade.classes.forEach(klass => allClasses.push(klass)));
    if (checkForDuplicates(allClasses)) {
        console.error("Duplicates class ids found");
    }
    if (checkForDuplicates(subjects.map(subject => subject.id))) {
        console.error("Duplicate subject ids found");
    }
    dayPriority.forEach(dow => checkForeignKey(dow, dows));
    periodPriority.forEach(period => checkForeignKey(period, periods));
}

function checkForeignKey(id, table) {
    if (!table.some(record => record.id === id)) {
        console.error(`Could not find id '${id}' in the following table:`)
        console.error(table)
    }
}

validateInputs();
initResult();
initRemaining();
initClassLookup();
renderTable();
renderRemaining();