
import $ from "jquery";
import {classLookup, dows, LUNCH, OOF, periods, remaining, result, subjects} from "./index";

const $table = $('#output-table');
const $remaining = $('#remaining');

export function renderTable() {
    $table.empty();

    const $thead = $('<thead>').appendTo($table);
    let $tr = $('<tr>').appendTo($thead);
    $('<th>', { "class": "period-header" }).appendTo($tr); // over period name
    $('<th>', { "class": "subject-header" }).appendTo($tr); // over subject name
    dows.forEach(dow => {
        $('<th>', {
            html: dow.name,
            "class": "dow-header"
        }).appendTo($tr);
    })

    const $tbody = $('<tbody>').appendTo($table);

    periods.forEach((period, periodIndex) => {
        subjects.forEach((subject, subjectIndex) => {
            let cellClasses = [];
            if (subjectIndex === 0) {
                cellClasses.push('period-border');
            }

            $tr = $('<tr>').appendTo($tbody);
            $('<td>', { html: period.id, "class": cellClasses }).appendTo($tr);
            $('<td>', { html: subject.id, "class": cellClasses }).appendTo($tr);
            dows.forEach((dow, dowIndex) => {
                let cell = result[dowIndex][periodIndex][subjectIndex];
                if (cell === OOF) {
                    $('<td>', { html: 'OOF', style: 'background-color:grey;', "class": cellClasses }).appendTo($tr);
                }
                else if (cell === LUNCH) {
                    $('<td>', { html: 'LUNCH', style: 'background-color:grey;', "class": cellClasses }).appendTo($tr);
                }
                else if (classLookup[cell]) {
                    let klass = classLookup[cell];
                    $('<td>', { html: klass.id, style: `background-color:${klass.gradeColor};`, "class": cellClasses }).appendTo($tr);
                }
                else {
                    $('<td>', { html: '', "class": cellClasses }).appendTo($tr);
                }
            })
        });
    })
}

export function renderRemaining() {
    $remaining.empty();

    remaining.forEach(remain => {
        $('<span>', {
            html: JSON.stringify(remain)
        }).appendTo($remaining);
    })
}