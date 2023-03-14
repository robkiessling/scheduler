import $ from "jquery";
import 'jquery-ui/ui/widgets/sortable.js';
import 'multiple-select/dist/multiple-select.js';

import {dows, generate, grades} from "./index";

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

        return this.config.formatter ? this.config.formatter(data) : data;
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

        if (this.config.rowSetup) {
            this.config.rowSetup($row, data);
        }

        if (data) {
            for (let [name, value] of Object.entries(data)) {
                $row.find(`[name="${name}"]`).val(value);
            }
        }

        $row.appendTo(this.$tbody);
    }

}

export function loadForm(data) {
    if (data.grades) {
        gradesList.load(data.grades.map(grade => {
            let clone = $.extend(true, {}, grade);
            clone.classIds = clone.classIds.join(', ');
            return clone;
        }));
    }
    if (data.subjects) {
        // subjectsList.load(data.subjects.map(subject => {
        //     let clone = $.extend(true, {}, subject);
        //     return clone;
        // }));
        subjectsList.load(data.subjects);
    }

    generate();
}

export function getFormData() {
    return {
        grades: gradesList.data(),
        subjects: subjectsList.data()
    }
}

const gradesList = new EditableList($('#grades-list'), {
    formatter: data => {
        data.forEach(row => {
            row.classIds = row.classIds.split(',').map(classId => classId.trim());
            // row.classIds = row.classIds.map(classId => `${classId} (${row.id})`);
        });
        return data.filter(row => row.classIds.some(classId => classId.length)); // remove grades with no classes
    }
});

const subjectsList = new EditableList($('#subjects-list'), {
    // formatter: data => {
    //     data.forEach(row => {
    //     });
    //     return data;
    // },
    rowSetup: ($row, data) => {
        let $blockDowIds = $row.find('[name="blockDowIds"]');
        dows.forEach(dow => {
            $('<option>', { html: dow.name, value: dow.id }).appendTo($blockDowIds);
        })
        window.setTimeout(() => {
            $blockDowIds.multipleSelect({
                minimumCountSelected: 100,
                displayValues: true
            });
        }, 1);
        
        let $blockGradeIds = $row.find('[name="blockGradeIds"]');
        grades.forEach(grade => {
            $('<option>', { html: grade.id, value: grade.id }).appendTo($blockGradeIds);
        })
        window.setTimeout(() => {
            $blockGradeIds.multipleSelect({
                minimumCountSelected: 100,
                displayValues: true
            });
        }, 1);
    }
});

$('#generate').off('click').on('click', () => {
    generate();
})
