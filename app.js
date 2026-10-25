/**
 * 100-Day Challenge — Task Tracker
 * Dates: Oct 26, 2026 to Feb 2, 2027 (100 days)
 * Tasks: DSA (2 q), MCQs (10), English (90m), Project (2h), Trading (2 tasks)
 */

(function () {
  'use strict';

  // Constants & Challenge Configuration
  const START_DATE = new Date(2026, 9, 26); // Oct 26, 2026 (Month 9 is October)
  const TOTAL_DAYS = 100;
  const STORAGE_KEY = 'challenge_100_days_state_v1';
  const THEME_KEY = 'challenge_100_theme';

  const TASK_DEFINITIONS = [
    { id: 'dsa', name: 'DSA', detail: '2 questions', full: 'DSA — Solve 2 questions' },
    { id: 'mcqs', name: 'MCQs', detail: '10 MCQs', full: 'MCQs — Complete 10 MCQs' },
    { id: 'english', name: 'English', detail: '90 min', full: 'English Practice — 1 hour 30 minutes' },
    { id: 'project', name: 'Project', detail: '2 hours', full: 'Project Development — 2 hours' },
    { id: 'trading', name: 'Trading', detail: '2 tasks', full: 'Trading — Complete 2 trading tasks' }
  ];

  // Application State
  let daysList = [];
  let taskState = {}; // { 'YYYY-MM-DD': { dsa: true, mcqs: false, ... } }
  let currentFilter = 'all';
  let searchQuery = '';

  // DOM Elements
  const trackerTableBody = document.getElementById('trackerTableBody');
  const currentStreakValue = document.getElementById('currentStreakValue');
  const bestStreakValue = document.getElementById('bestStreakValue');
  const completedDaysValue = document.getElementById('completedDaysValue');
  const daysPercentSubtext = document.getElementById('daysPercentSubtext');
  const totalTasksValue = document.getElementById('totalTasksValue');
  const overallProgressBar = document.getElementById('overallProgressBar');
  const streakSubtext = document.getElementById('streakSubtext');

  const countAll = document.getElementById('countAll');
  const countCompleted = document.getElementById('countCompleted');
  const countInProgress = document.getElementById('countInProgress');
  const countUnstarted = document.getElementById('countUnstarted');

  const searchDayInput = document.getElementById('searchDayInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const noResultsMessage = document.getElementById('noResultsMessage');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const jumpTodayBtn = document.getElementById('jumpTodayBtn');
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  const saveStatusIndicator = document.getElementById('saveStatusIndicator');

  const dataMenuBtn = document.getElementById('dataMenuBtn');
  const dataMenu = document.getElementById('dataMenu');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importFileInput = document.getElementById('importFileInput');
  const resetDataBtn = document.getElementById('resetDataBtn');
  const toastNotification = document.getElementById('toastNotification');

  /**
   * Generates the 100 dates automatically starting from Mon, 26 Oct 2026 to Tue, 2 Feb 2027.
   */
  function generate100Days() {
    const list = [];
    const cur = new Date(START_DATE.getTime());

    for (let i = 0; i < TOTAL_DAYS; i++) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const dateNum = cur.getDate();
      const dayOfWeek = cur.getDay(); // 0 is Sunday, 6 is Saturday

      // Format ISO string YYYY-MM-DD using local time
      const monthStr = String(month + 1).padStart(2, '0');
      const dateStr = String(dateNum).padStart(2, '0');
      const isoKey = `${year}-${monthStr}-${dateStr}`;

      // Format human-readable string: e.g. "Mon, 26 Oct 2026"
      const dayName = cur.toLocaleDateString('en-GB', { weekday: 'short' });
      const monthName = cur.toLocaleDateString('en-GB', { month: 'short' });
      const displayDate = `${dayName}, ${dateNum} ${monthName} ${year}`;

      list.push({
        dayNumber: i + 1,
        isoKey: isoKey,
        displayDate: displayDate,
        dayName: dayName,
        dateNum: dateNum,
        monthName: monthName,
        year: year,
        isWeekend: (dayOfWeek === 0 || dayOfWeek === 6)
      });

      // Advance one day
      cur.setDate(cur.getDate() + 1);
    }

    return list;
  }

  /**
   * Helper to format current local date as YYYY-MM-DD
   */
  function getTodayIsoKey() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Load stored state from localStorage
   */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        taskState = JSON.parse(raw) || {};
      } else {
        taskState = {};
      }
    } catch (err) {
      console.error('Failed to load state from localStorage:', err);
      taskState = {};
    }
  }

  /**
   * Save current state to localStorage automatically
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taskState));
      showSaveIndicator();
    } catch (err) {
      console.error('Failed to save state to localStorage:', err);
      showToast('Error saving data to local storage', 'danger');
    }
  }

  /**
   * Visual indicator when data is saved
   */
  let saveTimeout;
  function showSaveIndicator() {
    if (!saveStatusIndicator) return;
    saveStatusIndicator.classList.add('saving');
    const dot = saveStatusIndicator.querySelector('.indicator-dot');
    const text = saveStatusIndicator.querySelector('.indicator-text');
    if (text) text.textContent = 'Saving...';

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveStatusIndicator.classList.remove('saving');
      if (text) text.textContent = 'All changes saved';
    }, 400);
  }

  /**
   * Show toast feedback
   */
  let toastTimeout;
  function showToast(message, type = 'success') {
    if (!toastNotification) return;
    toastNotification.textContent = message;
    toastNotification.className = `toast toast-${type}`;
    toastNotification.classList.remove('hidden');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, 2800);
  }

  /**
   * Toggle a specific task for a specific date
   */
  function toggleTask(isoKey, taskId) {
    if (!taskState[isoKey]) {
      taskState[isoKey] = {};
    }
    const currentState = !!taskState[isoKey][taskId];
    taskState[isoKey][taskId] = !currentState;

    // Clean up empty objects
    const hasAny = Object.values(taskState[isoKey]).some(v => !!v);
    if (!hasAny) {
      delete taskState[isoKey];
    }

    saveState();
    updateRowUI(isoKey);
    updateDashboardStats();
    updateFilterCounts();
  }

  /**
   * Calculate statistics for a single date
   */
  function getDayProgress(isoKey) {
    const dayData = taskState[isoKey] || {};
    let completedCount = 0;
    for (const task of TASK_DEFINITIONS) {
      if (dayData[task.id]) {
        completedCount++;
      }
    }
    const percent = Math.round((completedCount / TASK_DEFINITIONS.length) * 100);
    const isFullyCompleted = (completedCount === TASK_DEFINITIONS.length);
    return {
      completedCount,
      totalCount: TASK_DEFINITIONS.length,
      percent,
      isFullyCompleted,
      isInProgress: completedCount > 0 && !isFullyCompleted,
      isUnstarted: completedCount === 0
    };
  }

  /**
   * Update the UI of a single row without re-rendering the whole table
   */
  function updateRowUI(isoKey) {
    const row = document.getElementById(`row-${isoKey}`);
    if (!row) return;

    const progress = getDayProgress(isoKey);
    const dayData = taskState[isoKey] || {};

    // Update row classes
    row.classList.toggle('is-completed', progress.isFullyCompleted);

    // Update each task cell
    TASK_DEFINITIONS.forEach(task => {
      const cell = row.querySelector(`.task-cell[data-task-id="${task.id}"]`);
      if (cell) {
        const isChecked = !!dayData[task.id];
        cell.setAttribute('aria-checked', isChecked ? 'true' : 'false');
        const box = cell.querySelector('.custom-checkbox');
        if (box) {
          box.setAttribute('aria-checked', isChecked ? 'true' : 'false');
          box.title = isChecked ? 'Completed ✅ (Click to uncheck)' : 'Incomplete ☐ (Click to complete)';
        }
      }
    });

    // Update progress column
    const fractionEl = row.querySelector('.progress-fraction');
    const percentEl = row.querySelector('.progress-percent');
    const fillEl = row.querySelector('.daily-bar-fill');

    if (fractionEl) fractionEl.textContent = `${progress.completedCount}/${progress.totalCount}`;
    if (percentEl) percentEl.textContent = `${progress.percent}%`;
    if (fillEl) {
      fillEl.style.width = `${progress.percent}%`;
      fillEl.classList.toggle('complete', progress.isFullyCompleted);
    }
  }

  /**
   * Calculate overall stats (streaks, total completed days, total tasks)
   */
  function updateDashboardStats() {
    let fullyCompletedDays = 0;
    let totalTasksChecked = 0;

    // Consecutive streak calculation
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const todayIso = getTodayIsoKey();

    // Loop through all 100 days to calculate total tasks and best streak
    daysList.forEach((day) => {
      const prog = getDayProgress(day.isoKey);
      totalTasksChecked += prog.completedCount;

      if (prog.isFullyCompleted) {
        fullyCompletedDays++;
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    });

    // Calculate current streak relative to today
    // If today is within or past the challenge, find consecutive completed days leading up to today
    let todayIndex = daysList.findIndex(d => d.isoKey === todayIso);

    if (todayIndex === -1) {
      // Check if today is after the challenge end
      const lastDay = daysList[daysList.length - 1];
      if (todayIso > lastDay.isoKey) {
        // Count backwards from the last day
        let c = 0;
        for (let i = daysList.length - 1; i >= 0; i--) {
          if (getDayProgress(daysList[i].isoKey).isFullyCompleted) {
            c++;
          } else {
            break;
          }
        }
        currentStreak = c;
      } else {
        // Today is before Day 1 (challenge hasn't started yet),
        // or user has checked early days: count consecutive streak from Day 1
        let c = 0;
        for (let i = 0; i < daysList.length; i++) {
          if (getDayProgress(daysList[i].isoKey).isFullyCompleted) {
            c++;
          } else {
            break;
          }
        }
        currentStreak = c;
      }
    } else {
      // Today is in the 100-day window
      const todayProg = getDayProgress(daysList[todayIndex].isoKey);

      if (todayProg.isFullyCompleted) {
        // Today is completed: count today + consecutive previous days
        let count = 1;
        for (let i = todayIndex - 1; i >= 0; i--) {
          if (getDayProgress(daysList[i].isoKey).isFullyCompleted) {
            count++;
          } else {
            break;
          }
        }
        currentStreak = count;
      } else {
        // Today is still in progress: check if yesterday was completed
        let count = 0;
        for (let i = todayIndex - 1; i >= 0; i--) {
          if (getDayProgress(daysList[i].isoKey).isFullyCompleted) {
            count++;
          } else {
            break;
          }
        }
        currentStreak = count;
      }
    }

    // Update DOM
    if (currentStreakValue) {
      currentStreakValue.innerHTML = `${currentStreak} <span class="stat-unit">days</span>`;
    }

    if (bestStreakValue) {
      bestStreakValue.innerHTML = `${bestStreak} <span class="stat-unit">days</span>`;
    }

    if (completedDaysValue) {
      completedDaysValue.innerHTML = `${fullyCompletedDays} <span class="stat-unit">/ ${TOTAL_DAYS}</span>`;
    }

    if (daysPercentSubtext) {
      const pct = Math.round((fullyCompletedDays / TOTAL_DAYS) * 100);
      daysPercentSubtext.textContent = `${pct}% of total challenge days`;
    }

    if (totalTasksValue) {
      const maxPossible = TOTAL_DAYS * TASK_DEFINITIONS.length;
      totalTasksValue.innerHTML = `${totalTasksChecked} <span class="stat-unit">/ ${maxPossible}</span>`;
    }

    if (overallProgressBar) {
      const maxPossible = TOTAL_DAYS * TASK_DEFINITIONS.length;
      const pct = Math.round((totalTasksChecked / maxPossible) * 100);
      overallProgressBar.style.width = `${pct}%`;
    }

    if (streakSubtext) {
      if (currentStreak > 0) {
        streakSubtext.textContent = `🔥 Keep it going! ${currentStreak} consecutive day${currentStreak > 1 ? 's' : ''} completed.`;
      } else {
        streakSubtext.textContent = 'Complete all 5 tasks for a day to build your streak!';
      }
    }
  }

  /**
   * Update count badges in filter chips
   */
  function updateFilterCounts() {
    let completed = 0;
    let inProgress = 0;
    let unstarted = 0;

    daysList.forEach(day => {
      const prog = getDayProgress(day.isoKey);
      if (prog.isFullyCompleted) completed++;
      else if (prog.isInProgress) inProgress++;
      else unstarted++;
    });

    if (countAll) countAll.textContent = daysList.length;
    if (countCompleted) countCompleted.textContent = completed;
    if (countInProgress) countInProgress.textContent = inProgress;
    if (countUnstarted) countUnstarted.textContent = unstarted;
  }

  /**
   * Render the entire 100-day table
   */
  function renderTable() {
    if (!trackerTableBody) return;

    const todayIso = getTodayIsoKey();
    const rowsHtml = [];

    daysList.forEach(day => {
      const isoKey = day.isoKey;
      const progress = getDayProgress(isoKey);
      const isToday = (isoKey === todayIso);
      const dayData = taskState[isoKey] || {};

      let rowClass = '';
      if (isToday) rowClass += ' is-today';
      if (progress.isFullyCompleted) rowClass += ' is-completed';

      let tasksHtml = '';
      TASK_DEFINITIONS.forEach(task => {
        const isChecked = !!dayData[task.id];
        tasksHtml += `
          <td class="task-cell" data-iso="${isoKey}" data-task-id="${task.id}" aria-checked="${isChecked ? 'true' : 'false'}" role="gridcell" tabindex="0">
            <div class="task-cell-inner">
              <div class="custom-checkbox" aria-checked="${isChecked ? 'true' : 'false'}" title="${isChecked ? 'Completed ✅ (Click to uncheck)' : 'Incomplete ☐ (Click to complete)'}">
                <span class="check-icon">✓</span>
              </div>
              <span class="task-label-text">${task.detail}</span>
            </div>
          </td>
        `;
      });

      rowsHtml.push(`
        <tr id="row-${isoKey}" class="${rowClass.trim()}" data-iso="${isoKey}">
          <td class="col-date sticky-col">
            <div class="date-cell-content">
              <div class="day-index-badge">
                <span class="day-index-label">DAY</span>
                <span class="day-index-number">${day.dayNumber}</span>
              </div>
              <div class="date-text-wrapper">
                <div class="date-string">${day.displayDate}</div>
                <div class="date-tags">
                  ${isToday ? '<span class="tag-today">TODAY</span>' : ''}
                  ${day.isWeekend ? '<span class="tag-weekend">Weekend</span>' : ''}
                </div>
              </div>
            </div>
          </td>
          ${tasksHtml}
          <td class="col-progress">
            <div class="progress-cell-inner">
              <div class="progress-header">
                <span class="progress-fraction">${progress.completedCount}/${progress.totalCount}</span>
                <span class="progress-percent">${progress.percent}%</span>
              </div>
              <div class="daily-bar-track">
                <div class="daily-bar-fill ${progress.isFullyCompleted ? 'complete' : ''}" style="width: ${progress.percent}%"></div>
              </div>
            </div>
          </td>
        </tr>
      `);
    });

    trackerTableBody.innerHTML = rowsHtml.join('');
    applyFilterAndSearch();
  }

  /**
   * Filter and search handling
   */
  function applyFilterAndSearch() {
    let visibleCount = 0;
    const query = searchQuery.trim().toLowerCase();

    daysList.forEach(day => {
      const row = document.getElementById(`row-${day.isoKey}`);
      if (!row) return;

      const progress = getDayProgress(day.isoKey);

      // Check Filter Chip
      let passesFilter = true;
      if (currentFilter === 'completed') {
        passesFilter = progress.isFullyCompleted;
      } else if (currentFilter === 'in-progress') {
        passesFilter = progress.isInProgress;
      } else if (currentFilter === 'unstarted') {
        passesFilter = progress.isUnstarted;
      }

      // Check Search Query
      let passesSearch = true;
      if (query) {
        const textToMatch = `${day.displayDate} day ${day.dayNumber} ${day.isoKey}`.toLowerCase();
        passesSearch = textToMatch.includes(query);
      }

      if (passesFilter && passesSearch) {
        row.classList.remove('hidden');
        visibleCount++;
      } else {
        row.classList.add('hidden');
      }
    });

    if (noResultsMessage) {
      noResultsMessage.classList.toggle('hidden', visibleCount > 0);
    }
  }

  /**
   * Event delegation for clicking task cells / checkboxes
   */
  function setupTableEvents() {
    if (!trackerTableBody) return;

    // Click handler
    trackerTableBody.addEventListener('click', (e) => {
      const cell = e.target.closest('.task-cell');
      if (!cell) return;

      const isoKey = cell.getAttribute('data-iso');
      const taskId = cell.getAttribute('data-task-id');
      if (isoKey && taskId) {
        toggleTask(isoKey, taskId);
      }
    });

    // Keyboard accessibility: Enter or Space toggles checkbox
    trackerTableBody.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        const cell = e.target.closest('.task-cell');
        if (cell) {
          e.preventDefault();
          const isoKey = cell.getAttribute('data-iso');
          const taskId = cell.getAttribute('data-task-id');
          if (isoKey && taskId) {
            toggleTask(isoKey, taskId);
          }
        }
      }
    });
  }

  /**
   * Toolbar, search, and jump button interactions
   */
  function setupControls() {
    // Filter chips
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        currentFilter = chip.getAttribute('data-filter') || 'all';
        applyFilterAndSearch();
      });
    });

    // Search input
    if (searchDayInput) {
      searchDayInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('hidden', !searchQuery);
        }
        applyFilterAndSearch();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchDayInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        searchDayInput.focus();
        applyFilterAndSearch();
      });
    }

    // Jump to Today button
    if (jumpTodayBtn) {
      jumpTodayBtn.addEventListener('click', () => {
        const todayIso = getTodayIsoKey();
        let targetRow = document.getElementById(`row-${todayIso}`);

        // If today is not in the list, scroll to Day 1
        if (!targetRow && daysList.length > 0) {
          targetRow = document.getElementById(`row-${daysList[0].isoKey}`);
          showToast(`Today (${todayIso}) is outside challenge range. Showing Day 1.`, 'success');
        }

        if (targetRow) {
          // If row is hidden by filter, reset to all
          if (targetRow.classList.contains('hidden')) {
            const allChip = document.querySelector('.filter-chip[data-filter="all"]');
            if (allChip) allChip.click();
            if (searchDayInput) {
              searchDayInput.value = '';
              searchQuery = '';
              if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
            }
            applyFilterAndSearch();
          }

          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRow.style.transition = 'outline 0.3s ease';
          targetRow.style.outline = '3px solid var(--accent-primary)';
          setTimeout(() => {
            targetRow.style.outline = 'none';
          }, 1800);
        }
      });
    }

    // Scroll to Top button
    if (scrollTopBtn) {
      scrollTopBtn.addEventListener('click', () => {
        const container = document.getElementById('tableContainer') || window;
        if (container.scrollTo) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // Theme toggle
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        try {
          localStorage.setItem(THEME_KEY, newTheme);
        } catch (e) {}
      });
    }

    // Data dropdown menu
    if (dataMenuBtn && dataMenu) {
      dataMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dataMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!dataMenu.contains(e.target) && e.target !== dataMenuBtn) {
          dataMenu.classList.add('hidden');
        }
      });
    }

    // Export Backup
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => {
        const backupData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          challengeName: '100-Day Challenge',
          dateRange: { start: '2026-10-26', end: '2027-02-02' },
          taskState: taskState
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `100-day-challenge-backup-${getTodayIsoKey()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        dataMenu.classList.add('hidden');
        showToast('Backup successfully downloaded!', 'success');
      });
    }

    // Import Backup
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            if (parsed && typeof parsed.taskState === 'object') {
              taskState = parsed.taskState;
            } else if (parsed && typeof parsed === 'object') {
              taskState = parsed;
            } else {
              throw new Error('Invalid format');
            }
            saveState();
            renderTable();
            updateDashboardStats();
            updateFilterCounts();
            showToast('Backup restored successfully!', 'success');
          } catch (err) {
            console.error('Failed to parse backup JSON:', err);
            showToast('Failed to import backup: invalid JSON format', 'danger');
          }
          importFileInput.value = '';
          dataMenu.classList.add('hidden');
        };
        reader.readAsText(file);
      });
    }

    // Reset Data
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        dataMenu.classList.add('hidden');
        const confirmReset = window.confirm(
          'Are you sure you want to reset all tracked challenge data? This cannot be undone unless you have an exported backup.'
        );
        if (confirmReset) {
          taskState = {};
          saveState();
          renderTable();
          updateDashboardStats();
          updateFilterCounts();
          showToast('All challenge data has been reset.', 'danger');
        }
      });
    }
  }

  /**
   * Load theme preference
   */
  function loadTheme() {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        document.body.setAttribute('data-theme', savedTheme);
      }
    } catch (e) {}
  }

  /**
   * App Initialization
   */
  function init() {
    loadTheme();
    daysList = generate100Days();
    loadState();
    renderTable();
    updateDashboardStats();
    updateFilterCounts();
    setupTableEvents();
    setupControls();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
