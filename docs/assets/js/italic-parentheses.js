(() => {
    'use strict';

    const SCRIPT_ID = 'ITALIC_TO_PARENTHESES_RUNTIME_V4';

    if (window[SCRIPT_ID]) {
        return;
    }

    window[SCRIPT_ID] = true;

    let updateScheduled = false;
    let updateRunning = false;

    /**
     * فك ترميز HTML مثل:
     * &amp; &quot; &#39;
     */
    function decodeHtml(value) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = String(value ?? '');
        return textarea.value;
    }

    /**
     * يحول محتوى HTML داخلي إلى نص عادي.
     */
    function innerMarkupToText(value) {
        return decodeHtml(
            String(value ?? '')
                .replace(/<br\s*\/?>/giu, ' ')
                .replace(/<[^>]+>/gu, '')
        )
            .replace(/\s+/gu, ' ')
            .trim();
    }

    /**
     * يمنع تكرار الأقواس:
     * ((wait)) تصبح (wait)
     */
    function normalizeRepeatedParentheses(value) {
        let text = String(value ?? '');

        for (let index = 0; index < 4; index += 1) {
            const previous = text;

            text = text.replace(
                /\(\s*\(\s*([^()]+?)\s*\)\s*\)/gu,
                '($1)'
            );

            if (text === previous) {
                break;
            }
        }

        return text;
    }

    /**
     * إصلاح أسماء التعليمات المدمجة.
     */
    function normalizeInstructionNames(value) {
        return String(value ?? '')
            .replace(/\bPastContinuous\b/giu, 'Past Continuous')
            .replace(/\bPresentContinuous\b/giu, 'Present Continuous')
            .replace(/\bPastSimple\b/giu, 'Past Simple')
            .replace(/\bPresentSimple\b/giu, 'Present Simple')
            .replace(/\bTrueFalse\b/giu, 'True/False')
            .replace(/\bMakeNegative\b/giu, 'Make Negative')
            .replace(/\bMakeQuestion\b/giu, 'Make Question');
    }

    /**
     * إذا بقيت تعليمة في نهاية الجملة من دون أقواس،
     * توضع داخل أقواس.
     */
    function wrapTrailingInstruction(value) {
        let text = String(value ?? '').trim();

        if (!text || /\([^()]+\)\s*$/u.test(text)) {
            return text;
        }

        const instructionPattern =
            /^(.*\S)\s+(Past\s+Continuous(?:\s*,\s*Question)?|Present\s+Continuous(?:\s*,\s*Question)?|Past\s+Simple(?:\s*,\s*Question)?|Present\s+Simple(?:\s*,\s*Question)?|Negative|Positive|Question|Make\s+Negative|Make\s+(?:a\s+)?Question|Comparative|Superlative|Passive|Active|Plural|Singular|Correct|Rewrite|Complete|True\s*\/\s*False)\s*$/iu;

        const match = text.match(instructionPattern);

        if (!match) {
            return text;
        }

        const sentence = match[1].trim();
        const instruction = match[2]
            .replace(/\s*,\s*/gu, ', ')
            .replace(/\s+/gu, ' ')
            .trim();

        return `${sentence} (${instruction})`;
    }

    /**
     * التحويل الأساسي:
     *
     * <i>wait</i>       => (wait)
     * <em>Negative</em> => (Negative)
     * *Question*        => (Question)
     * _Past Continuous_ => (Past Continuous)
     */
    function convertItalicMarkupToParentheses(rawValue) {
        let text = String(rawValue ?? '')
            .normalize('NFC')
            .replace(/\u00a0/gu, ' ')
            .replace(
                /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu,
                ''
            );

        /*
         * تحويل وسوم HTML المائلة.
         */
        text = text.replace(
            /<(i|em|cite|var)\b[^>]*>([\s\S]*?)<\/\1\s*>/giu,
            (_full, _tag, innerContent) => {
                const innerText = innerMarkupToText(innerContent);

                if (!innerText) {
                    return '';
                }

                return `(${innerText})`;
            }
        );

        /*
         * تحويل span الذي يحمل صنفًا يدل على الميل.
         */
        text = text.replace(
            /<span\b[^>]*class\s*=\s*["'][^"']*(?:italic|italics|font-italic)[^"']*["'][^>]*>([\s\S]*?)<\/span\s*>/giu,
            (_full, innerContent) => {
                const innerText = innerMarkupToText(innerContent);

                if (!innerText) {
                    return '';
                }

                return `(${innerText})`;
            }
        );

        /*
         * تحويل Markdown المائل:
         * *word*
         */
        text = text.replace(
            /(^|[^*])\*([^*\r\n]+?)\*(?!\*)/gu,
            (_full, prefix, innerContent) => {
                const innerText = String(innerContent).trim();

                if (!innerText) {
                    return prefix;
                }

                return `${prefix}(${innerText})`;
            }
        );

        /*
         * تحويل Markdown المائل:
         * _word_
         */
        text = text.replace(
            /(^|[\s([{])_([^_\r\n]+?)_(?=$|[\s)\]},.!?;:])/gu,
            (_full, prefix, innerContent) => {
                const innerText = String(innerContent).trim();

                if (!innerText) {
                    return prefix;
                }

                return `${prefix}(${innerText})`;
            }
        );

        /*
         * حذف بقية وسوم HTML مع إبقاء النص.
         */
        text = text
            .replace(/<br\s*\/?>/giu, ' ')
            .replace(/<[^>]+>/gu, ' ');

        text = decodeHtml(text);
        text = normalizeInstructionNames(text);
        text = normalizeRepeatedParentheses(text);

        /*
         * ضبط الفراغات من دون دمج الكلمات.
         */
        text = text
            .replace(/[ \t]+/gu, ' ')
            .replace(/\s+\)/gu, ')')
            .replace(/\(\s+/gu, '(')
            .replace(/([.!?])\(/gu, '$1 (')
            .replace(/\)([A-Za-z])/gu, ') $1')
            .trim();

        text = wrapTrailingInstruction(text);
        text = normalizeRepeatedParentheses(text);

        return text;
    }

    /**
     * الحصول على السؤال الحالي من التطبيق.
     */
    function getCurrentQuestion() {
        try {
            if (
                typeof questionById === 'function' &&
                typeof state !== 'undefined' &&
                state &&
                state.currentId
            ) {
                return questionById(state.currentId);
            }
        }
        catch (_error) {
        }

        try {
            if (
                typeof questions !== 'undefined' &&
                Array.isArray(questions) &&
                typeof state !== 'undefined'
            ) {
                return questions.find(
                    question => question.id === state.currentId
                ) || null;
            }
        }
        catch (_error) {
        }

        return null;
    }

    /**
     * استبدال أي عنصر مائل ظاهر داخل الصفحة بأقواس.
     */
    function replaceVisibleItalicElements(scope) {
        scope
            .querySelectorAll(
                'i, em, cite, var, .italic, .italics, .font-italic'
            )
            .forEach(element => {
                if (!element.isConnected) {
                    return;
                }

                const text = String(element.textContent ?? '')
                    .replace(/\s+/gu, ' ')
                    .trim();

                const span = document.createElement('span');
                span.className = 'italic-converted-to-parentheses';
                span.dir = 'ltr';
                span.lang = 'en';

                if (!text) {
                    span.textContent = '';
                }
                else if (/^\([^()]+\)$/u.test(text)) {
                    span.textContent = text;
                }
                else {
                    span.textContent = `(${normalizeInstructionNames(text)})`;
                }

                element.replaceWith(span);
            });
    }

    /**
     * تطبيق النص الأصلي لكل فرع من بيانات السؤال.
     * هذا هو الضمان الأساسي لاستعادة:
     * (wait)
     * (Past Continuous)
     */
    function applyOriginalBranchPrompts(question, scope) {
        if (!question || !Array.isArray(question.items)) {
            return;
        }

        const items = question.items;

        const inputCards = Array.from(
            scope.querySelectorAll(
                [
                    '.student-input .branch-answer-card',
                    '.student-input .english-branch-card',
                    '.structured-branches .branch-answer-card',
                    '.english-group-branches .english-branch-card'
                ].join(',')
            )
        );

        inputCards.forEach((card, index) => {
            const item = items[index];

            if (!item) {
                return;
            }

            const rawPrompt =
                item.prompt ??
                item.text ??
                item.question ??
                '';

            const finalPrompt =
                convertItalicMarkupToParentheses(rawPrompt);

            const label =
                card.querySelector('.english-branch-label > span') ||
                card.querySelector('.branch-label > span');

            if (!label || !finalPrompt) {
                return;
            }

            if (label.textContent !== finalPrompt) {
                label.textContent = finalPrompt;
            }

            label.classList.add('parentheses-prompt-text');
            label.setAttribute('dir', 'ltr');
            label.setAttribute('lang', 'en');
        });

        /*
         * بطاقات الإجابة بعد الكشف.
         */
        const answerCards = Array.from(
            scope.querySelectorAll(
                [
                    '.group-answer-results .group-answer-card',
                    '.revealed-answer .group-answer-card'
                ].join(',')
            )
        );

        answerCards.forEach((card, index) => {
            const item = items[index];

            if (!item) {
                return;
            }

            const rawPrompt =
                item.prompt ??
                item.text ??
                item.question ??
                '';

            const finalPrompt =
                convertItalicMarkupToParentheses(rawPrompt);

            const label =
                card.querySelector('.english-branch-label > span') ||
                card.querySelector('.branch-label > span');

            if (!label || !finalPrompt) {
                return;
            }

            if (label.textContent !== finalPrompt) {
                label.textContent = finalPrompt;
            }

            label.classList.add('parentheses-prompt-text');
            label.setAttribute('dir', 'ltr');
            label.setAttribute('lang', 'en');
        });

        /*
         * List A في أسئلة المطابقة.
         */
        const matchingItems = items.filter(
            item => item.mode === 'matching'
        );

        const matchingEntries = Array.from(
            scope.querySelectorAll(
                '.matching-list-a .match-entry'
            )
        );

        matchingEntries.forEach((entry, index) => {
            const item = matchingItems[index];

            if (!item) {
                return;
            }

            const rawPrompt =
                item.prompt ??
                item.text ??
                item.question ??
                '';

            const finalPrompt =
                convertItalicMarkupToParentheses(rawPrompt);

            if (!finalPrompt) {
                return;
            }

            if (entry.textContent !== finalPrompt) {
                entry.textContent = finalPrompt;
            }

            entry.classList.add('parentheses-prompt-text');
            entry.setAttribute('dir', 'ltr');
            entry.setAttribute('lang', 'en');
        });
    }

    /**
     * معالجة النصوص التي أصبحت نصًا عاديًا بسبب إصلاحات سابقة.
     */
    function repairBareInstructions(scope) {
        scope
            .querySelectorAll(
                [
                    '.english-branch-label > span',
                    '.branch-label > span',
                    '.strict-literal-english-prompt',
                    '.english-item-prompt'
                ].join(',')
            )
            .forEach(element => {
                const current = String(element.textContent ?? '').trim();

                if (!current) {
                    return;
                }

                const repaired = wrapTrailingInstruction(
                    normalizeInstructionNames(current)
                );

                if (repaired !== current) {
                    element.textContent = repaired;
                }

                element.classList.add('parentheses-prompt-text');
                element.setAttribute('dir', 'ltr');
                element.setAttribute('lang', 'en');
            });
    }

    /**
     * التطبيق النهائي.
     */
    function applyParenthesesSystem() {
        if (updateRunning) {
            return;
        }

        updateRunning = true;

        try {
            const scope =
                document.querySelector('.question-card') ||
                document.querySelector('#app') ||
                document.body;

            if (!scope) {
                return;
            }

            const question = getCurrentQuestion();

            applyOriginalBranchPrompts(question, scope);
            replaceVisibleItalicElements(scope);
            repairBareInstructions(scope);
        }
        finally {
            updateRunning = false;
        }
    }

    function scheduleUpdate() {
        if (updateScheduled) {
            return;
        }

        updateScheduled = true;

        requestAnimationFrame(() => {
            updateScheduled = false;
            applyParenthesesSystem();
        });
    }

    const observer = new MutationObserver(() => {
        scheduleUpdate();
    });

    function start() {
        const target =
            document.querySelector('#app') ||
            document.body;

        if (!target) {
            return;
        }

        observer.observe(target, {
            subtree: true,
            childList: true,
            characterData: true
        });

        scheduleUpdate();

        setTimeout(scheduleUpdate, 100);
        setTimeout(scheduleUpdate, 400);
        setTimeout(scheduleUpdate, 1000);
    }

    document.addEventListener(
        'click',
        () => setTimeout(scheduleUpdate, 0),
        true
    );

    document.addEventListener(
        'change',
        () => setTimeout(scheduleUpdate, 0),
        true
    );

    window.addEventListener('popstate', scheduleUpdate);
    window.addEventListener('hashchange', scheduleUpdate);
    window.addEventListener('load', start);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, {
            once: true
        });
    }
    else {
        start();
    }
})();