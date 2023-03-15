import $ from "jquery";
import {loadForm} from "./form";

const VERSION = 1; // Bumping this version invalidates old cached data

export function saveStateToLocal(state) {
    localStorage.setItem(storageKey(), JSON.stringify(state));
}

export function loadStateFromLocal() {
    let state = localStorage.getItem(storageKey());
    if (state) {
        loadForm(JSON.parse(state));
    }
    else {
        loadDefaultState();
    }
}

export function loadDefaultState() {
    loadForm({
        grades: defaultGrades,
        subjects: defaultSubjects
    });
}

$('#reset-config').off('click').on('click', evt => {
    evt.preventDefault();
    loadDefaultState();
});

function storageKey() {
    return `saved_state_${VERSION}`;
}

let defaultGrades = [
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
// let defaultGrades = [
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
let defaultSubjects = [
    { id: 'K-2 ART', blockTods: ['M','F'], blockGradeIds: ['3','4','5','6'] },
    { id: '3-6 ART', blockTods: [{dowId: 'W', periodIds: ['PER 1','PER 2']},'R','F'], blockGradeIds: ['P','K','1','2'] },
    { id: 'MUSIC', blockTods: [], blockGradeIds: [] },
    { id: 'PE', blockTods: [], blockGradeIds: [] },
    { id: 'LIBRARY', blockTods: [], blockGradeIds: [] },
    { id: 'LANGUAGE', blockTods: [], blockGradeIds: [] },
    { id: 'SPECIAL', blockTods: [], blockGradeIds: [] },
]

export let defaultDowPriority = [['T','W','R'], ['M','F']];
export let defaultPeriodPriority = ['PER 6','PER 7','PER 4','PER 3','PER 2','PER 1','PER 5'];

