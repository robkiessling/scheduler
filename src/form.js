import $ from "jquery";
import 'jquery-ui/ui/widgets/sortable.js';
import 'multiple-select/dist/multiple-select.js';

import {dows, generateN, grades, periods} from "./index";

export function loadForm(data) {
    if (data.grades) {
        gradesList.load(data.grades);
    }
    if (data.subjects) {
        subjectsList.load(data.subjects);
    }

    generateN(2);
}

export function getFormData() {
    return {
        grades: gradesList.data(),
        subjects: subjectsList.data()
    }
}

$('#generate').off('click').on('click', () => {
    generateN(2);
});


/**
 * An EditableList is a table where rows can be added, deleted, and reordered. Each row typically has one or more form inputs.
 *
 * `config` options:
 * - rowSetup (optional) callback triggered after the empty row element is added to the DOM
 * - rowLoaded (optional) callback triggered after the row's data has been inserted into the DOM
 * - deserializer (optional) callback to convert serialized rowData into a format that can be inserted into the DOM
 * - serializer (optional) callback to convert the DOM data into a serialized format for outside processing
 */
export class EditableList {
    constructor($container, config) {
        this.$container = $container;
        this.$tbody = this.$container.find('tbody');
        this.config = config;
        this.$template = this.$tbody.find('.template');

        this.setupAdd();
        this.setupDelete();
        this.setupReorder();
    }

    clear() {
        this.$tbody.find('tr:not(.template)').remove();
    }

    load(data) {
        this.clear();
        data.forEach(row => this.addRow(row));
    }

    data() {
        let data = this.$tbody.find('tr:not(.template)').map((i, tr) => {
            let obj = {};
            $(tr).find('[name]').each((j, input) => {
                let $input = $(input);
                obj[$input.attr('name')] = $input.val();
            });
            return obj;
        }).get();

        return this.config.serializer ? this.config.serializer(data) : data;
    }

    setupAdd() {
        this.$container.find('.add').off('click').on('click', evt => {
            evt.preventDefault();
            this.addRow();
        });
    }
    setupDelete() {
        this.$tbody.off('click', '.delete').on('click', '.delete', evt => {
            let $row = $(evt.currentTarget).closest('tr');
            $row.remove();
        });
    }
    setupReorder() {
        this.$tbody.sortable({
            axis: 'y',
            handle: '.reorder'
        });
    }

    addRow(data) {
        let $row = this.$template.clone();
        $row.removeClass('template');
        $row.appendTo(this.$tbody);

        if (this.config.rowSetup) {
            this.config.rowSetup($row, data);
        }

        if (data) {
            if (this.config.deserializer) {
                data = this.config.deserializer($.extend(true, {}, data));
            }

            for (let [name, value] of Object.entries(data)) {
                $row.find(`[name="${name}"]`).val(value);
            }
        }

        if (this.config.rowLoaded) {
            this.config.rowLoaded($row);
        }
    }

}

const gradesList = new EditableList($('#grades-list'), {
    deserializer: rowData => {
        rowData.classIds = rowData.classIds.join(', ');
        return rowData;
    },
    serializer: data => {
        data.forEach(row => {
            row.classIds = row.classIds.split(',').map(classId => classId.trim());
            // row.classIds = row.classIds.map(classId => `${classId} (${row.id})`);
        });
        return data.filter(row => row.classIds.some(classId => classId.length)); // remove grades with no classes
    }
});

const subjectsList = new EditableList($('#subjects-list'), {
    deserializer: rowData => {
        // Converts blockTods values such as 'W' or {dowId: 'W', periodIds: ['PER 1','PER 2']} into string options that
        // can be used in the multipleSelect
        let tods = [];
        rowData.blockTods.forEach(tod => {
            if (typeof tod === 'string') {
                periods.forEach(period => tods.push(writeTodValue(tod, period.id)));
            }
            else {
                tod.periodIds.forEach(periodId => tods.push(writeTodValue(tod.dowId, periodId)));
            }
        });
        rowData.blockTods = tods;

        return rowData;
    },
    serializer: data => {
        // Converts string options from the multipleSelect into blockTod values such as 'W' or {dowId: 'W', periodIds: ['PER 1','PER 2']}
        data.forEach(rowData => {
            let todLookup = {};
            rowData.blockTods.forEach(tod => {
                let { dowId, periodId } = readTodValue(tod);
                if (todLookup[dowId] === undefined) { todLookup[dowId] = []; }
                todLookup[dowId].push(periodId);
            });

            let blockTods = [];
            for (let [dowId, periodIds] of Object.entries(todLookup)) {
                // If all periods are selected, consolidate into just the dowId
                blockTods.push(periodIds.length === periods.length ? dowId : {dowId: dowId, periodIds: periodIds});
            }

            rowData.blockTods = blockTods;
        });
        return data;
    },
    rowSetup: ($row, data) => {
        let $blockTods = $row.find('[name="blockTods"]');
        dows.forEach(dow => {
            let $optGroup = $(`<optgroup label="${dow.name}">`).appendTo($blockTods);
            periods.forEach(period => {
                $('<option>', { html: period.id, value: writeTodValue(dow.id, period.id) }).appendTo($optGroup);
            });
        });

        // Custom text to display on the <select>
        function refreshBlockTods() {
            let numPeriods = $blockTods.multipleSelect('getSelects').length;
            let text = numPeriods ? `${numPeriods} periods` : '';
            $blockTods.siblings('.ms-parent').find('.ms-choice span:first-child').html(text);
        }

        $blockTods.multipleSelect({
            multiple: true,
            minimumCountSelected: 0,
            dropWidth: 460,
            multipleWidth: 110,
            onClick: () => refreshBlockTods(),
            onAfterCreate: () => refreshBlockTods(),
            onOptgroupClick: () => refreshBlockTods(),
        });

        let $blockGradeIds = $row.find('[name="blockGradeIds"]');
        grades.forEach(grade => {
            $('<option>', { html: grade.id, value: grade.id }).appendTo($blockGradeIds);
        })
        $blockGradeIds.multipleSelect({
            multiple: true,
            minimumCountSelected: 100,
            displayValues: true
        });
    },
    rowLoaded: ($row) => {
        $row.find('[name="blockTods"]').multipleSelect('refresh');
        $row.find('[name="blockGradeIds"]').multipleSelect('refresh');
    },
});


/**
 * Converts blockTods values such as 'W' or {dowId: 'W', periodIds: ['PER 1','PER 2']} into string options that
 * can be used in the multipleSelect
 */
const todSeparator = '__##__'; // random separator string that won't be found in an ID

function writeTodValue(dowId, periodId) {
    return `${dowId}${todSeparator}${periodId}`
}

function readTodValue(val) {
    let [dowId, periodId] = val.split(todSeparator);
    return {
        dowId: dowId,
        periodId: periodId
    }
}
