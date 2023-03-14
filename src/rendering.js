
import $ from "jquery";
import 'jquery-ui/ui/widgets/tabs.js';
import {dows, periods, remaining, result, subjects} from "./index";

const PERIOD_HEADER_COLOR = 'moccasin';

const $output = $('#outputs');
let outputTabsInitialized = false;
let currentTabIndex = 0;

const $remaining = $('#remaining');

const showGroups = true;

export function renderSchedules() {
    if (outputTabsInitialized) {
        $output.tabs('destroy');
        $output.empty();
    }

    $('<ul>', { id: "output-tabs" }).appendTo($output);

    let { $table: $masterTable } = createTab(`output-tab-master`, 'Master Schedule');
    renderMasterSchedule($masterTable);

    subjects.forEach(subject => {
        let { $table } = createTab(`output-tab-${subject.id.replace(/\s/g, "")}`, subject.id);
        renderSubjectSchedule($table, subject);
    });

    $output.tabs({
        active: currentTabIndex,
        activate: (event, ui) => {
            currentTabIndex = ui.newTab.index();
        }
    });

    outputTabsInitialized = true;
}

function createTab(tabId, tabName) {
    let $tab = $(`<li><a href="#${tabId}">${tabName}</a></li>`).appendTo($output.find('#output-tabs'));

    let $tabContent = $('<div>', {
        id: tabId,
        "class": 'tab-content'
    }).appendTo($output);

    let $table = $('<table>', {
        "class": 'output-table'
    }).appendTo($tabContent);

    return {
        $tab: $tab,
        $table: $table
    }
}

function renderSubjectSchedule($table, subject) {
    const $thead = $('<thead>').appendTo($table);
    let $tr = $('<tr>').appendTo($thead);
    $('<th>', { "class": "period-header" }).appendTo($tr); // over period name
    dows.forEach(dow => {
        $('<th>', {
            html: dow.name,
            "class": "dow-header start-of-dow"
        }).appendTo($tr);
    });

    const $tbody = $('<tbody>').appendTo($table);
    periods.forEach((period, periodIndex) => {
        if (period.header) {
            $tr = $('<tr>', {}).appendTo($tbody);
            createTd({
                text: period.header,
                color: PERIOD_HEADER_COLOR
            }, ['period-border'], 2 + subjects.length).appendTo($tr);
        }

        let cellClasses = new Set(['dow-cell', 'nowrap']);
        cellClasses.add('period-border');

        $tr = $('<tr>').appendTo($tbody);
        createTd({text: period.id}, cellClasses).appendTo($tr);
        dows.forEach((dow, dowIndex) => {
            let cell = result[dowIndex][periodIndex][subject.index];

            cellClasses.add('start-of-dow');

            createTd(cell, cellClasses, 1).appendTo($tr);
        })
    })

}

function renderMasterSchedule($table) {
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
            }, ['period-border'], 2 + (showGroups ? subjects.length * 2 : subjects.length)).appendTo($tr);
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
                        createTd(cell, cellClasses, undefined, groupSize).appendTo($tr);
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
                            }, cellClasses, undefined, groupSize).appendTo($tr);
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

function createTd(cell, classSet, colspan, rowspan) {
    if (colspan === undefined && cell && cell.fullWidth && showGroups) {
        colspan = 2;
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

    $('<p>', {
        html: 'Errors:'
    }).appendTo($remaining);

    for (let [remainsId, remains] of Object.entries(remaining)) {
        $('<p>', {
            html: JSON.stringify(remains)
        }).appendTo($remaining);
    }

    $remaining.toggle(Object.keys(remaining).length > 0);
}