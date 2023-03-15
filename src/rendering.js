
import $ from "jquery";
import 'jquery-ui/ui/widgets/tabs.js';
import {dows, periods, result, subjects} from "./index";
import {downloadExcel} from "./helpers";


const $output = $('#outputs');
let outputTabsInitialized = false;
let currentTabIndex = 0;
let $masterTable, $subjectsTable;

const $errors = $('#errors');

// keala feedback: both false
const SHOW_GROUP_INFO = false;
const REMOVE_TOP_BORDER = false; // removes lightgrey border between cells when SHOW_GROUP_INFO is false

/**
 * We have to manually apply styles in order for Excel export to work (cannot use CSS classes)
 * This gets to be a little painful for borders and such, but not sure there is a better way
 */
const DOW_FULL_WIDTH = 'width:130px;';
const DOW_HALF_WIDTH = 'width:50px;';
const PERIOD_HEADER_COLOR = 'moccasin';
const EMPTY_PERIOD_HEADER_COLOR = '#aaa';
const PERIOD_WIDTH = 'width:90px;';

// In general, we only apply bottom and right borders, because those have priority over top and left.
// The only exception is for cells on the very left and top of the table, since those outer edges need borders.
const BOTTOM_BORDER = 'border-bottom:thin solid black;';
const RIGHT_BORDER = 'border-right:thin solid black;';
const LEFT_BORDER = 'border-left:thin solid black;';
const TOP_BORDER = 'border-top:thin solid black;';

const PRE_LINE = 'white-space:pre-line;';
const NOWRAP = 'white-space:nowrap;';
const ALIGN_CENTER = 'text-align:center;vertical-align:middle;';
const BOLD = 'font-weight:bold;';

function bgColor(color) {
    return color ? `background-color:${color};` : '';
}

export function renderSchedules() {
    if (outputTabsInitialized) {
        $output.tabs('destroy');
        $output.empty();
    }

    $('<ul>', { id: "output-tabs" }).appendTo($output);

    $masterTable = createTab(`output-tab-master`, 'Master Schedule').$table;
    renderMasterSchedule($masterTable);

    $subjectsTable = createTab(`output-tab-subjects`, 'By Subject').$table;
    renderAllSubjectsSchedule($subjectsTable);

    subjects.forEach(subject => {
        let { $table } = createTab(`output-tab-${subject.id.replace(/\s/g, "")}`, subject.id);
        renderSubjectSchedule($table, subject);
    });
    
    $output.tabs({
        active: currentTabIndex,
        activate: (event, ui) => {
            currentTabIndex = ui.newTab.index();
            updateDownloadName();
        }
    });

    let $download = $('<a>', {
        id: "download",
        html: "<span class='ri ri-fw ri-file-download-line'></span> <span class='text'>Download</span>"
    }).appendTo($output);

    $download.on('click', (evt) => {
        evt.preventDefault();

        let $table = $output.find('.output-table').eq(currentTabIndex);
        downloadExcel($table.get(0), $table.data('tab-name'));
    });

    updateDownloadName();

    // Note: This doesn't change dynamically anymore, so we don't actually need to put it in a method and call it every tab change
    function updateDownloadName() {
        $download.html("<span class='ri ri-fw ri-file-download-line'></span> <span class='text'>Download</span>")
    }

    outputTabsInitialized = true;
}

function createTab(tabId, tabName) {
    let $tab = $(`<li><a href="#${tabId}">${tabName}</a></li>`).appendTo($output.find('#output-tabs'));

    let $tabPanel = $('<div>', {
        id: tabId,
        "class": 'tab-content'
    }).appendTo($output);

    // let $tabContent = $('<div>', {
    //     "class": 'tab-content'
    // }).appendTo($tabPanel);

    $('<div>', {
        html: `<table class='output-table' id='${tabId}-table' data-tab-name="${tabName}"></table>`
    }).appendTo($tabPanel);

    return {
        $table: $tabPanel.find('.output-table')
    }
}


function renderMasterSchedule($table) {
    // -------------------------------------------- <thead> element
    const $thead = $('<thead>').appendTo($table);
    let $tr = $('<tr>').appendTo($thead);

    // blank cell over period names
    $('<th>', { style: `${BOTTOM_BORDER}${LEFT_BORDER}${TOP_BORDER}` }).appendTo($tr);

    // blank cell over subject names
    $('<th>', { style: `${BOTTOM_BORDER}${RIGHT_BORDER}${TOP_BORDER}` }).appendTo($tr);

    // dow header cells
    dows.forEach(dow => {
        $('<th>', {
            html: dow.name,
            style: `${DOW_FULL_WIDTH}${ALIGN_CENTER}${RIGHT_BORDER}${BOTTOM_BORDER}${TOP_BORDER}`,
            colspan: SHOW_GROUP_INFO ? 2 : 1
        }).appendTo($tr);
    })

    // -------------------------------------------- <tbody> element
    const $tbody = $('<tbody>').appendTo($table);
    periods.forEach((period, periodIndex) => {
        // -------------------------------------------- period header row
        if (period.header) {
            $tr = $('<tr>', {}).appendTo($tbody);
            $('<td>', {
                html: period.header,
                style: `${bgColor(period.header.trim().length ? PERIOD_HEADER_COLOR : EMPTY_PERIOD_HEADER_COLOR)}` +
                    `${ALIGN_CENTER}${BOTTOM_BORDER}${LEFT_BORDER}${RIGHT_BORDER}`,
                colspan: 2 + (SHOW_GROUP_INFO ? dows.length * 2 : dows.length)
            }).appendTo($tr);
        }

        // -------------------------------------------- normal subject rows
        subjects.forEach((subject, subjectIndex) => {
            let style = `${DOW_HALF_WIDTH}${ALIGN_CENTER}`;
            if (subjectIndex === subjects.length - 1) {
                style += `${BOTTOM_BORDER}`;
            }

            $tr = $('<tr>').appendTo($tbody);

            // period name
            if (subjectIndex === 0) {
                $('<td>', {
                    html: `${period.id}\n${period.timeRange}`,
                    style: `${PERIOD_WIDTH}${ALIGN_CENTER}${PRE_LINE}${LEFT_BORDER}${TOP_BORDER}${BOTTOM_BORDER}`,
                    rowspan: subjects.length
                }).appendTo($tr);
            }

            // subject name
            $('<td>', { html: subject.id, style: `${style}${NOWRAP}${RIGHT_BORDER}` }).appendTo($tr);

            // -------------------------------------------- create cells for each dow
            dows.forEach((dow, dowIndex) => {
                let cell = result[dowIndex][periodIndex][subjectIndex];

                let {
                    isGroup: isGroup,
                    size: groupSize,
                    startOfGroup: startOfGroup,
                    reachesEndOfPeriod: groupReachesEndOfPeriod
                } = groupInfo(cell, dowIndex, periodIndex, subjectIndex);

                let cellStyle = style;
                if (!SHOW_GROUP_INFO && isGroup && !cell.mergeTopAndBottom) {
                    cellStyle += BOLD;
                }

                // Special case - for groups that merge adjacent cells (e.g. EARLY_RELEASE, SPECIALS_ARTIC)
                if (isGroup && cell.mergeTopAndBottom) {
                    if (startOfGroup) {
                        $('<td>', {
                            html: cell ? cell.text : '',
                            // Note: LEFT_BORDER is required due to rowspan
                            style: `${cellStyle}${RIGHT_BORDER}${LEFT_BORDER}${bgColor(cell ? cell.color : '')}` +
                                `${groupReachesEndOfPeriod ? BOTTOM_BORDER : ''}`,
                            colspan: SHOW_GROUP_INFO ? 2 : undefined,
                            rowspan: groupSize
                        }).appendTo($tr);
                    }
                    // Only create cell for startOfGroup since it spans all of the rows
                    return;
                }

                if (SHOW_GROUP_INFO) {
                    if (isGroup) {
                        $('<td>', {
                            html: cell ? cell.text : '',
                            style: `${cellStyle}${bgColor(cell ? cell.color : '')}`,
                        }).appendTo($tr);

                        if (startOfGroup) {
                            $('<td>', {
                                html: cell.group,
                                style: `${cellStyle}${PRE_LINE}${bgColor(cell.color)}${RIGHT_BORDER}` +
                                    `${groupReachesEndOfPeriod ? BOTTOM_BORDER : ''}`,
                                rowspan: groupSize
                            }).appendTo($tr);
                        }
                    }
                    else {
                        $('<td>', {
                            html: cell ? cell.text : '',
                            style: `${cellStyle}${bgColor(cell ? cell.color : '')}${RIGHT_BORDER}` +
                                `${cell && cell.borders ? `${TOP_BORDER}${BOTTOM_BORDER}` : ''}`,
                            colspan: 2
                        }).appendTo($tr);
                    }
                }
                else {
                    // If not showing group info, we just create a normal <td> for the cell
                    $('<td>', {
                        html: cell ? cell.text : '',
                        style: `${cellStyle}${bgColor(cell ? cell.color : '')}${RIGHT_BORDER}` +
                            `${cell && cell.borders ? `${TOP_BORDER}${BOTTOM_BORDER}` : ''}` +
                            `${!(cell && cell.borders) && REMOVE_TOP_BORDER ? 'border-top:none;' : ''}`
                    }).appendTo($tr);
                }
            })
        });
    })
}

function renderSubjectSchedule($table, subject) {
    const $tbody = $('<tbody>').appendTo($table);
    mergeSubjectSchedule($tbody, subject);
}

function renderAllSubjectsSchedule($table) {
    const $tbody = $('<tbody>').appendTo($table);
    subjects.forEach(subject => {
        mergeSubjectSchedule($tbody, subject);
    });
}

function mergeSubjectSchedule($tbody, subject) {
    // -------------------------------------------- subject name
    let $tr = $('<tr>').appendTo($tbody);
    $('<td>', {
        html: `${subject.id} Schedule`,
        style: `${BOLD}border-top:none;border-left:none;`,
        colspan: 1 + dows.length
    }).appendTo($tr);

    $tr = $('<tr>').appendTo($tbody);

    // blank cell over period names
    $('<td>', { style: `${BOTTOM_BORDER}${LEFT_BORDER}${RIGHT_BORDER}${TOP_BORDER}` }).appendTo($tr);

    // dow header cells
    dows.forEach(dow => {
        $('<td>', {
            html: dow.name,
            style: `${BOLD}${DOW_FULL_WIDTH}${ALIGN_CENTER}${RIGHT_BORDER}${BOTTOM_BORDER}${TOP_BORDER}`
        }).appendTo($tr);
    });

    periods.forEach((period, periodIndex) => {
        // -------------------------------------------- period header row
        if (period.header) {
            $tr = $('<tr>', {}).appendTo($tbody);
            $('<td>', {
                html: period.header,
                style: `${bgColor(period.header.trim().length ? PERIOD_HEADER_COLOR : EMPTY_PERIOD_HEADER_COLOR)}` +
                    `${ALIGN_CENTER}${BOTTOM_BORDER}${LEFT_BORDER}${RIGHT_BORDER}`,
                colspan: 1 + dows.length
            }).appendTo($tr);
        }

        let style = `${DOW_FULL_WIDTH}${ALIGN_CENTER}${RIGHT_BORDER}${BOTTOM_BORDER}`;

        $tr = $('<tr>').appendTo($tbody);

        // period name
        $('<td>', {
            html: `${period.id}\n${period.timeRange}`,
            // style: `${style}${NOWRAP}${LEFT_BORDER}`
            style: `${style}${PRE_LINE}${LEFT_BORDER}`
        }).appendTo($tr);

        dows.forEach((dow, dowIndex) => {
            let cell = result[dowIndex][periodIndex][subject.index];

            $('<td>', {
                html: cell ? cell.text : '',
                style: `${style}${bgColor(cell ? cell.color : '')}`
            }).appendTo($tr);
        });
    });

    $tr = $('<tr>').appendTo($tbody);
    $('<td>', {
        html: '&nbsp;',
        style: `${ALIGN_CENTER}border-top:none;border-left:none;`,
        colspan: 1 + dows.length
    }).appendTo($tr);
}

function groupInfo(cell, dowIndex, periodIndex, subjectIndex) {
    // A group is a set of consecutive cells with the same 'group' attribute
    let isGroup = cell && cell.group;
    let size = 0;
    let startOfGroup = false;
    let reachesEndOfPeriod = false;
    if (isGroup) {
        for (let i = 0; i < subjects.length; i++) {
            let otherCell = result[dowIndex][periodIndex][i];
            if (otherCell && otherCell.group === cell.group) {
                if (size === 0) {
                    startOfGroup = subjectIndex === i;
                }
                if (i === subjects.length - 1) {
                    reachesEndOfPeriod = true;
                }
                size++;
            }
        }
    }

    return {
        isGroup: isGroup,
        size: size,
        startOfGroup: startOfGroup,
        reachesEndOfPeriod: reachesEndOfPeriod
    }
}

export function renderErrors(errors) {
    $errors.empty();

    if (errors.length) {
        $('<p>', {
            html: `<b>${errors.length} errors occurred:</b>`
        }).appendTo($errors);

        errors.forEach(error => {
            $('<p>', {
                html: `&bull; ${error}`
            }).appendTo($errors);
        })
    }

    $errors.toggle(errors.length > 0);
}