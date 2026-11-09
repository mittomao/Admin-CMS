/**
 * Treecraft CMS - Universal Custom Field System
 * Conditional Visibility Engine (Reactive client-side evaluations)
 */

(function () {
  'use strict';

  function parseTargetValue(rawVal) {
    if (rawVal === undefined || rawVal === null || rawVal === '') return '';
    try {
      return JSON.parse(rawVal);
    } catch {
      return rawVal;
    }
  }

  function getFieldValue(fieldName, form) {
    const root = form || document;
    // Check radio buttons first
    const checkedRadio = root.querySelector(`input[type="radio"][name="fields[${fieldName}]"]:checked`);
    if (checkedRadio) return checkedRadio.value;

    // Check checkboxes
    const checkbox = root.querySelector(`input[type="checkbox"][name="fields[${fieldName}]"]`);
    if (checkbox) return checkbox.checked;

    // General inputs (select, text, number, textarea, hidden)
    const input = root.querySelector(`[name="fields[${fieldName}]"]`);
    if (!input) return null;

    return input.value;
  }

  function evaluateCondition(actualVal, operator, targetVal) {
    const op = (operator || 'equals').toLowerCase();

    switch (op) {
      case 'truthy':
        return Boolean(actualVal) && actualVal !== 'false' && actualVal !== '0' && actualVal !== '';

      case 'falsy':
        return !actualVal || actualVal === 'false' || actualVal === '0' || actualVal === '';

      case 'equals':
        return String(actualVal ?? '').trim() === String(targetVal ?? '').trim();

      case 'notequals':
        return String(actualVal ?? '').trim() !== String(targetVal ?? '').trim();

      case 'contains':
        return String(actualVal ?? '')
          .toLowerCase()
          .includes(String(targetVal ?? '').toLowerCase());

      case 'in': {
        const list = Array.isArray(targetVal)
          ? targetVal.map(String)
          : String(targetVal || '')
              .split(',')
              .map((s) => s.trim());
        return list.includes(String(actualVal ?? '').trim());
      }

      case 'notin': {
        const list = Array.isArray(targetVal)
          ? targetVal.map(String)
          : String(targetVal || '')
              .split(',')
              .map((s) => s.trim());
        return !list.includes(String(actualVal ?? '').trim());
      }

      default:
        return true;
    }
  }

  function evaluateAllConditions(form) {
    const dependentWrappers = document.querySelectorAll('[data-condition-depends]');
    if (!dependentWrappers || dependentWrappers.length === 0) return;

    dependentWrappers.forEach((wrapper) => {
      const dependsOn = wrapper.dataset.conditionDepends;
      const operator = wrapper.dataset.conditionOp || 'equals';
      const targetVal = parseTargetValue(wrapper.dataset.conditionVal);

      if (!dependsOn) return;

      const actualVal = getFieldValue(dependsOn, form);
      const isVisible = evaluateCondition(actualVal, operator, targetVal);

      if (isVisible) {
        wrapper.classList.remove('d-none');
        wrapper.querySelectorAll('input, select, textarea').forEach((el) => {
          if (!el.dataset.permanentlyDisabled) {
            el.removeAttribute('disabled');
          }
        });
      } else {
        wrapper.classList.add('d-none');
      }
    });
  }

  function initConditionalVisibility() {
    evaluateAllConditions();

    // Listen on input & change events for reactive form updates
    document.addEventListener('input', function (e) {
      if (e.target && e.target.name && e.target.name.startsWith('fields[')) {
        evaluateAllConditions();
      }
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.name && e.target.name.startsWith('fields[')) {
        evaluateAllConditions();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConditionalVisibility);
  } else {
    initConditionalVisibility();
  }

  window.TreecraftVisibility = {
    evaluateAll: evaluateAllConditions,
    evaluate: evaluateCondition,
  };
})();

