document.addEventListener('DOMContentLoaded', () => {
    const jsonUpload = document.getElementById('jsonUpload');
    const minGpaInput = document.getElementById('minGpa');
    const maxGpaInput = document.getElementById('maxGpa');
    const printBtn = document.getElementById('printBtn');
    const tbody = document.querySelector('#resultsTable tbody');

    // Print / Export PDF listener
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Filter event listeners
    minGpaInput.addEventListener('input', applyFilters);
    maxGpaInput.addEventListener('input', applyFilters);

    // Dynamic GPA update when an Honors checkbox is toggled
    tbody.addEventListener('change', (event) => {
        if (event.target && event.target.classList.contains('honors-checkbox')) {
            const row = event.target.closest('tr');
            if (row) {
                updateRowGpa(row);
                applyFilters(); // Re-evaluate filter visibility when GPA changes
            }
        }
    });

    jsonUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    processData(data);
                } catch (error) {
                    alert("Error parsing JSON file. Please ensure it is correctly formatted.");
                    console.error("JSON Error:", error);
                }
            };
            reader.readAsText(file);
        }
    });

    function processData(data) {
        tbody.innerHTML = '';

        for (const studentId in data) {
            if (!Object.prototype.hasOwnProperty.call(data, studentId)) continue;

            const student = data[studentId];
            const name = student.name || '';
            const periods = student.periods || {};

            let totalGpaPoints = 0;
            let classCount = 0;
            const periodGrades = {};

            // Safely iterate periods 0 through 8
            for (let p = 0; p <= 8; p++) {
                periodGrades[p] = '<span class="grade-none">-</span>'; // Default display when omitted

                const periodObj = periods[p];

                // Only include in GPA if period exists and contains a non-empty grade field
                if (periodObj && periodObj.grade !== undefined && periodObj.grade !== null && String(periodObj.grade).trim() !== '') {
                    const parsedGrade = parseGrade(periodObj.grade);
                    if (parsedGrade) {
                        periodGrades[p] = formatGradeBadgeWithHonors(parsedGrade.letter, parsedGrade.gpa);
                        totalGpaPoints += parsedGrade.gpa;
                        classCount++;
                    }
                }
            }

            // Calculate initial overall GPA
            const rawGpa = classCount > 0 ? (totalGpaPoints / classCount).toFixed(2) : 'N/A';
            const formattedGpa = formatGpaBadge(rawGpa);

            // Insert student row into the table
            const tr = document.createElement('tr');
            tr.dataset.gpa = rawGpa; // Store raw GPA value on row for filtering
            tr.innerHTML = `
                <td>${escapeHtml(studentId)}</td>
                <td>${escapeHtml(name)}</td>
                <td class="gpa-cell">${formattedGpa}</td>
                <td>${periodGrades[0]}</td>
                <td>${periodGrades[1]}</td>
                <td>${periodGrades[2]}</td>
                <td>${periodGrades[3]}</td>
                <td>${periodGrades[4]}</td>
                <td>${periodGrades[5]}</td>
                <td>${periodGrades[6]}</td>
                <td>${periodGrades[7]}</td>
                <td>${periodGrades[8]}</td>
            `;
            tbody.appendChild(tr);
        }

        applyFilters();
    }

    /**
     * Filters student rows based on minimum and maximum GPA thresholds.
     */
    function applyFilters() {
        const minVal = parseFloat(minGpaInput.value);
        const maxVal = parseFloat(maxGpaInput.value);

        const hasMin = !isNaN(minVal);
        const hasMax = !isNaN(maxVal);

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const rawGpaAttr = row.dataset.gpa;

            // Handle non-numeric or missing GPA
            if (!rawGpaAttr || rawGpaAttr === 'N/A') {
                row.style.display = (hasMin || hasMax) ? 'none' : '';
                return;
            }

            const gpa = parseFloat(rawGpaAttr);
            let visible = true;

            // Check if GPA is at least minVal
            if (hasMin && gpa < minVal) {
                visible = false;
            }

            // Check if GPA is lower than maxVal
            if (hasMax && gpa >= maxVal) {
                visible = false;
            }

            row.style.display = visible ? '' : 'none';
        });
    }

    /**
     * Recalculates GPA for a given student row based on base points and honors selections.
     */
    function updateRowGpa(row) {
        const checkboxes = row.querySelectorAll('.honors-checkbox');
        let totalGpaPoints = 0;
        const classCount = checkboxes.length;

        checkboxes.forEach(checkbox => {
            const baseGpa = parseFloat(checkbox.dataset.baseGpa) || 0;
            const isHonors = checkbox.checked;
            totalGpaPoints += baseGpa + (isHonors ? 1.0 : 0.0);
        });

        const rawGpa = classCount > 0 ? (totalGpaPoints / classCount).toFixed(2) : 'N/A';
        row.dataset.gpa = rawGpa;

        const gpaCell = row.querySelector('.gpa-cell');
        if (gpaCell) {
            gpaCell.innerHTML = formatGpaBadge(rawGpa);
        }
    }

    /**
     * Formats a letter grade badge wrapped with an Honors checkbox.
     */
    function formatGradeBadgeWithHonors(letter, baseGpa) {
        if (!letter || letter === '-') {
            return '<span class="grade-none">-</span>';
        }

        const baseLetter = letter.charAt(0).toUpperCase();
        let badgeClass = 'grade-none';

        switch (baseLetter) {
            case 'A': badgeClass = 'grade-A'; break;
            case 'B': badgeClass = 'grade-B'; break;
            case 'C': badgeClass = 'grade-C'; break;
            case 'D': badgeClass = 'grade-D'; break;
            case 'F': badgeClass = 'grade-F'; break;
        }

        return `
            <div class="grade-cell">
                <span class="grade-badge ${badgeClass}">${escapeHtml(letter)}</span>
                <label class="honors-label">
                    <input type="checkbox" class="honors-checkbox" data-base-gpa="${baseGpa}"> Honors
                </label>
            </div>
        `;
    }

    /**
     * Formats a GPA numerical value as a colored badge span based on its grade band.
     */
    function formatGpaBadge(gpaVal) {
        if (gpaVal === 'N/A' || gpaVal === null || gpaVal === undefined) {
            return '<span class="grade-none">N/A</span>';
        }

        const numericGpa = parseFloat(gpaVal);
        if (isNaN(numericGpa)) {
            return `<span class="grade-none">${escapeHtml(gpaVal)}</span>`;
        }

        let badgeClass = 'grade-F';

        if (numericGpa >= 3.5)      badgeClass = 'grade-A'; // Green (A Range)
        else if (numericGpa >= 2.5) badgeClass = 'grade-B'; // Blue  (B Range)
        else if (numericGpa >= 1.5) badgeClass = 'grade-C'; // Yellow(C Range)
        else if (numericGpa >= 0.5) badgeClass = 'grade-D'; // Orange(D Range)
        else                        badgeClass = 'grade-F'; // Red   (F Range)

        return `<span class="grade-badge ${badgeClass}">${escapeHtml(gpaVal)}</span>`;
    }

    /**
     * Converts raw grade string (letter or percentage with '%') to letter grade and GPA points.
     */
    function parseGrade(rawGrade) {
        let strGrade = String(rawGrade).trim();
        if (!strGrade) return null;

        // Check if grade is a percentage (e.g., "95%", "87.5%")
        const isPercentage = strGrade.includes('%') || !isNaN(parseFloat(strGrade));

        if (isPercentage) {
            const numericVal = parseFloat(strGrade.replace('%', ''));
            if (isNaN(numericVal)) return null;

            let letter = 'F';
            let gpa = 0.0;

            if (numericVal >= 95)      { letter = 'A';  gpa = 4.0; }
            else if (numericVal >= 90) { letter = 'A-'; gpa = 3.7; }
            else if (numericVal >= 87) { letter = 'B+'; gpa = 3.3; }
            else if (numericVal >= 83) { letter = 'B';  gpa = 3.0; }
            else if (numericVal >= 80) { letter = 'B-'; gpa = 2.7; }
            else if (numericVal >= 77) { letter = 'C+'; gpa = 2.3; }
            else if (numericVal >= 73) { letter = 'C';  gpa = 2.0; }
            else if (numericVal >= 70) { letter = 'C-'; gpa = 1.7; }
            else if (numericVal >= 67) { letter = 'D+'; gpa = 1.3; }
            else if (numericVal >= 63) { letter = 'D';  gpa = 1.0; }
            else if (numericVal >= 60) { letter = 'D-'; gpa = 0.7; }
            else                       { letter = 'F';  gpa = 0.0; }

            return { letter, gpa };
        }

        // Process direct letter grades (e.g., "A+", "B-", "C")
        const upperLetter = strGrade.toUpperCase();

        if (upperLetter === 'A+' || upperLetter === 'A') {
            return { letter: upperLetter, gpa: 4.0 };
        }

        const baseLetter = upperLetter.charAt(0);
        const modifier = upperLetter.length > 1 ? upperLetter.charAt(1) : '';

        let baseGpa = 0.0;
        switch (baseLetter) {
            case 'A': baseGpa = 4.0; break;
            case 'B': baseGpa = 3.0; break;
            case 'C': baseGpa = 2.0; break;
            case 'D': baseGpa = 1.0; break;
            case 'F': baseGpa = 0.0; break;
            default: return null;
        }

        if (baseLetter !== 'F') {
            if (modifier === '+') baseGpa += 0.3;
            else if (modifier === '-') baseGpa -= 0.3;
        }

        return { 
            letter: upperLetter, 
            gpa: Math.round(baseGpa * 100) / 100 
        };
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
