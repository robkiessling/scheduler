
import $ from "jquery";
import {classLookup, dows, SPECIAL_CELLS, periods, remaining, result, subjects} from "./index";

const $table = $('#output-table');
const $remaining = $('#remaining');

const showGroups = true;

export function renderTable() {
    $table.empty();

    const $thead = $('<thead>').appendTo($table);
    let $tr = $('<tr>').appendTo($thead);
    $('<th>', { "class": "period-header" }).appendTo($tr); // over period name
    $('<th>', { "class": "subject-header" }).appendTo($tr); // over subject name
    dows.forEach(dow => {
        $('<th>', {
            html: dow.name,
            "class": "dow-header",
            colspan: showGroups ? 2 : 1
        }).appendTo($tr);
    })

    const $tbody = $('<tbody>').appendTo($table);
    periods.forEach((period, periodIndex) => {
        subjects.forEach((subject, subjectIndex) => {
            let cellClasses = new Set(['dow-cell']);
            if (subjectIndex === 0) {
                cellClasses.add('period-border');
            }

            $tr = $('<tr>').appendTo($tbody);
            createTd({text: period.id}, cellClasses).appendTo($tr);
            createTd({text: subject.id}, cellClasses).appendTo($tr);
            dows.forEach((dow, dowIndex) => {
                let cell = result[dowIndex][periodIndex][subjectIndex];

                let isGroup = cell && cell.group;
                let startOfGroup = false;
                let groupSize = 0;
                if (isGroup) {
                    for (let i = 0; i < subjects.length; i++) {
                        let otherCell = result[dowIndex][periodIndex][i];
                        if (otherCell && otherCell.group === cell.group) {
                            if (groupSize === 0) {
                                startOfGroup = subjectIndex === i;
                            }
                            groupSize++;
                        }
                    }
                }

                !showGroups && isGroup ? cellClasses.add('bold') : cellClasses.delete('bold');

                if (isGroup && cell.fullWidth) {
                    if (startOfGroup) {
                        createTd(cell, cellClasses, groupSize).appendTo($tr);
                    }
                    // Do not create cells if not startOfGroup
                }
                else {
                    createTd(cell, cellClasses).appendTo($tr);

                    if (cell && cell.fullWidth) { return; }
                    if (!showGroups) { return; }

                    if (isGroup) {
                        if (startOfGroup) {
                            createTd({
                                text: cell.group,
                                color: cell.color
                            }, cellClasses, groupSize).appendTo($tr);
                        }
                        // Do not create cells if not startOfGroup
                    }
                    else {
                        createTd({text: ''}, cellClasses).appendTo($tr);
                    }
                }
            })
        });
    })
}

function createTd(cell, classSet, rowspan) {
    return $('<td>', {
        html: cell ? cell.text : '',
        style: cell && cell.color ? `background-color:${cell.color};` : undefined,
        "class": [...classSet].join(' '),
        colspan: cell && cell.fullWidth && showGroups ? 2 : undefined,
        rowspan: rowspan
    });
}

export function renderRemaining() {
    $remaining.empty();

    for (let [remainsId, remains] of Object.entries(remaining)) {
        $('<span>', {
            html: JSON.stringify(remains)
        }).appendTo($remaining);
    }
}