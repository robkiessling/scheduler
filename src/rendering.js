
import $ from "jquery";
import {dows, periods, remaining, result, subjects} from "./index";

const PERIOD_HEADER_COLOR = 'moccasin';

const $table = $('#output-table');
const $remaining = $('#remaining');

const showGroups = true;

export function renderMasterSchedule() {
    $table.empty();

    const $thead = $('<thead>').appendTo($table);
    let $tr = $('<tr>').appendTo($thead);
    $('<th>', { "class": "period-header" }).appendTo($tr); // over period name
    $('<th>', { "class": "subject-header" }).appendTo($tr); // over subject name
    dows.forEach(dow => {
        $('<th>', {
            html: dow.name,
            "class": "dow-header start-of-dow",
            colspan: showGroups ? 2 : 1
        }).appendTo($tr);
    })

    const $tbody = $('<tbody>').appendTo($table);
    periods.forEach((period, periodIndex) => {
        if (period.header) {
            $tr = $('<tr>', {}).appendTo($tbody);
            createTd({
                text: period.header,
                color: PERIOD_HEADER_COLOR,
                colspan: 2 + (showGroups ? subjects.length * 2 : subjects.length)
            }, ['period-border']).appendTo($tr);
        }

        subjects.forEach((subject, subjectIndex) => {
            let cellClasses = new Set(['dow-cell', 'nowrap']);
            if (subjectIndex === 0) {
                cellClasses.add('period-border');
            }

            $tr = $('<tr>').appendTo($tbody);
            createTd({text: period.id}, cellClasses).appendTo($tr);
            createTd({text: subject.id}, cellClasses).appendTo($tr);
            dows.forEach((dow, dowIndex) => {
                let cell = result[dowIndex][periodIndex][subjectIndex];

                // A group is a set of consecutive cells with the same 'group' attribute
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
                cellClasses.add('start-of-dow');

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

                    cellClasses.delete('start-of-dow');
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
    let colspan;
    if (cell && cell.fullWidth && showGroups) {
        colspan = 2;
    }
    if (cell && cell.colspan) {
        colspan = cell.colspan;
    }

    return $('<td>', {
        html: cell ? cell.text : '',
        style: cell && cell.color ? `background-color:${cell.color};` : undefined,
        "class": classSet ? [...classSet].join(' ') : undefined,
        colspan: colspan,
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