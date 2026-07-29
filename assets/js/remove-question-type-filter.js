(() => {
    'use strict';

    const TARGET_TEXT = 'كل أنواع الأسئلة';
    const RUNTIME_KEY = '__REMOVE_QUESTION_TYPE_FILTER_V1__';

    if (window[RUNTIME_KEY]) {
        return;
    }

    window[RUNTIME_KEY] = true;

    function normalizeText(value) {
        return String(value ?? '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isTargetSelect(select) {
        if (!(select instanceof HTMLSelectElement)) {
            return false;
        }

        const selectedText = normalizeText(
            select.options[select.selectedIndex]?.textContent
        );

        const hasTargetOption = Array.from(select.options).some(
            option => normalizeText(option.textContent) === TARGET_TEXT
        );

        return selectedText === TARGET_TEXT || hasTargetOption;
    }

    function wrapperContainsOtherControls(wrapper, targetSelect) {
        if (!wrapper) {
            return false;
        }

        return Array.from(
            wrapper.querySelectorAll('select, input, button, textarea')
        ).some(control => control !== targetSelect);
    }

    function findSafeWrapper(select) {
        /*
         * الأولوية للحاويات الصغيرة الخاصة بحقل واحد فقط.
         * لا نحذف شريط الفلاتر الكامل أو الحاوية التي تضم حقولًا أخرى.
         */
        const selectors = [
            '[data-filter="question-type"]',
            '[data-filter-type="question-type"]',
            '.question-type-filter',
            '.filter-item',
            '.filter-field',
            '.select-field',
            '.select-wrapper',
            '.select-wrap',
            '.form-field',
            '.control-field',
            'label'
        ];

        for (const selector of selectors) {
            const wrapper = select.closest(selector);

            if (
                wrapper &&
                !wrapperContainsOtherControls(wrapper, select)
            ) {
                return wrapper;
            }
        }

        const parent = select.parentElement;

        if (
            parent &&
            !wrapperContainsOtherControls(parent, select)
        ) {
            return parent;
        }

        return select;
    }

    function removeQuestionTypeFilter() {
        const selects = Array.from(document.querySelectorAll('select'))
            .filter(isTargetSelect);

        selects.forEach(select => {
            const wrapper = findSafeWrapper(select);

            if (!wrapper || !wrapper.isConnected) {
                return;
            }

            wrapper.setAttribute(
                'data-removed-question-type-filter',
                'true'
            );

            wrapper.remove();
        });

        /*
         * احتياط إضافي إذا كانت الخانة مبنية كزر أو عنصر مخصص
         * وليست select حقيقية.
         */
        document.querySelectorAll(
            '[role="combobox"], .custom-select, .dropdown'
        ).forEach(element => {
            if (
                normalizeText(element.textContent) !== TARGET_TEXT
            ) {
                return;
            }

            const wrapper =
                element.closest(
                    '.filter-item, .filter-field, .select-field, .select-wrapper, .form-field, label'
                ) || element;

            if (
                wrapper.querySelectorAll(
                    'select, input, button, textarea, [role="combobox"]'
                ).length <= 1
            ) {
                wrapper.remove();
            }
        });
    }

    let scheduled = false;

    function scheduleRemoval() {
        if (scheduled) {
            return;
        }

        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            removeQuestionTypeFilter();
        });
    }

    const observer = new MutationObserver(scheduleRemoval);

    function start() {
        removeQuestionTypeFilter();

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        setTimeout(removeQuestionTypeFilter, 100);
        setTimeout(removeQuestionTypeFilter, 500);
        setTimeout(removeQuestionTypeFilter, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, {
            once: true
        });
    }
    else {
        start();
    }

    document.addEventListener('click', scheduleRemoval, true);
    window.addEventListener('popstate', scheduleRemoval);
    window.addEventListener('hashchange', scheduleRemoval);
})();