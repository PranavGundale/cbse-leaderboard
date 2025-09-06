// Pre-calculate totals and best of 5 for all students to determine ranks
        const processedStudents = studentsData.map(student => {
            let totalMarks = 0;
            let subjectTotals = [];
            let failed = false;

            student.subjects.forEach(subject => {
                const total = subject.th + subject.ia;
                totalMarks += total;
                subjectTotals.push({ code: subject.code, total });

                let passingThresholdTH;
                let passingThresholdTotal;

                if (subject.code === "402") {
                    passingThresholdTH = 50 * 0.33;
                    passingThresholdTotal = 100 * 0.33;
                } else {
                    passingThresholdTH = 80 * 0.33;
                    passingThresholdTotal = 100 * 0.33;
                }

                if (subject.th < passingThresholdTH || total < passingThresholdTotal) {
                    failed = true;
                }
            });

            // --- Modified Best of 5 calculation ---
            // Always include English (184) and Marathi/Hindi (085)
            const compulsoryCodes = ["184", "085"];
            let compulsorySubjects = subjectTotals.filter(sub => compulsoryCodes.includes(sub.code));
            let optionalSubjects = subjectTotals.filter(sub => !compulsoryCodes.includes(sub.code));

            // Sort optional subjects by marks, pick the top (5 - compulsory.length)
            optionalSubjects.sort((a, b) => b.total - a.total);
            let bestOptional = optionalSubjects.slice(0, 5 - compulsorySubjects.length);

            let bestFiveMarks = compulsorySubjects.reduce((sum, s) => sum + s.total, 0) +
                                bestOptional.reduce((sum, s) => sum + s.total, 0);

            const percentageOverall = ((totalMarks / (student.subjects.length * 100)) * 100).toFixed(2);
            const percentageBestFive = ((bestFiveMarks / 500) * 100).toFixed(2);

            return {
                ...student,
                totalMarks,
                bestFiveMarks,
                hasFailed: failed,
                percentageOverall: parseFloat(percentageOverall),
                percentageBestFive: parseFloat(percentageBestFive)
            };
        });

        // Get unique subjects for dropdown
        const uniqueSubjects = [];
        studentsData.forEach(student => {
            student.subjects.forEach(subject => {
                if (!uniqueSubjects.find(s => s.code === subject.code)) {
                    uniqueSubjects.push({
                        code: subject.code,
                        name: subject.name
                    });
                }
            });
        });

        // Populate subject dropdown
        function populateSubjectDropdown() {
            const dropdown = document.getElementById('subjectDropdown');
            dropdown.innerHTML = '<option value="">Select a Subject</option>';
            
            uniqueSubjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.code;
                option.textContent = `${subject.name} (${subject.code})`;
                dropdown.appendChild(option);
            });
        }

        // DENSE RANKING Function to assign ranks considering ties
        function assignRanks(studentsArray, scoreKey) {
            // Sort by score in descending order
            studentsArray.sort((a, b) => b[scoreKey] - a[scoreKey]);

            let currentRank = 1;
            for (let i = 0; i < studentsArray.length; i++) {
                if (i > 0 && studentsArray[i][scoreKey] < studentsArray[i - 1][scoreKey]) {
                    // Increment rank only by 1 when score changes (dense ranking)
                    currentRank++;
                }
                studentsArray[i][`${scoreKey}Rank`] = currentRank;
            }
        }

        // DENSE RANKING Function for subject-wise ranking
        function assignSubjectRanks(studentsArray) {
            // Sort by score in descending order
            studentsArray.sort((a, b) => b.score - a.score);

            let currentRank = 1;
            for (let i = 0; i < studentsArray.length; i++) {
                if (i > 0 && studentsArray[i].score < studentsArray[i - 1].score) {
                    // Increment rank only by 1 when score changes (dense ranking)
                    currentRank++;
                }
                studentsArray[i].rank = currentRank;
            }
        }

        // Initial assignment of ranks for all students
        assignRanks(processedStudents, 'totalMarks');
        assignRanks(processedStudents, 'bestFiveMarks');

        // Function to display subject-wise leaderboard
        function displaySubjectLeaderboard() {
            const selectedSubjectCode = document.getElementById('subjectDropdown').value;
            if (!selectedSubjectCode) return;

            const leaderboardTableBody = document.getElementById('leaderboardTableBody');
            leaderboardTableBody.innerHTML = '';

            // Create leaderboard data for selected subject
            const subjectLeaderboardData = [];
            
            processedStudents.forEach(student => {
                const subject = student.subjects.find(s => s.code === selectedSubjectCode);
                if (subject) {
                    const total = subject.th + subject.ia;
                    const maxMarks = subject.code === "402" ? 100 : 100; // Both have max 100 marks
                    const percentage = ((total / maxMarks) * 100).toFixed(2);
                    
                    subjectLeaderboardData.push({
                        name: student.name,
                        rollNo: student.rollNo,
                        score: total,
                        percentage: parseFloat(percentage),
                        th: subject.th,
                        ia: subject.ia
                    });
                }
            });

            // Use the improved ranking function
            assignSubjectRanks(subjectLeaderboardData);

            // Display the leaderboard
            subjectLeaderboardData.forEach(student => {
                const row = leaderboardTableBody.insertRow();
                row.innerHTML = `
                    <td class="rank">${student.rank}</td>
                    <td>${student.name}</td>
                    <td>${student.rollNo}</td>
                    <td class="score">${student.score}</td>
                    <td class="percentage">${student.percentage.toFixed(2)}%</td>
                `;
            });
        }

        // --- Leaderboard Functions ---
        function displayLeaderboard(type) {
            const leaderboardTableBody = document.getElementById('leaderboardTableBody');
            leaderboardTableBody.innerHTML = ''; // Clear previous entries
            const buttons = document.querySelectorAll('.leaderboard-buttons button');
            buttons.forEach(button => button.classList.remove('active'));
            
            const subjectSelector = document.getElementById('subjectSelector');

            if (type === 'subject') {
                document.querySelector('.leaderboard-buttons button:nth-child(3)').classList.add('active');
                subjectSelector.style.display = 'block';
                
                // If no subject is selected, show a message
                if (!document.getElementById('subjectDropdown').value) {
                    const row = leaderboardTableBody.insertRow();
                    row.innerHTML = `
                        <td colspan="5" style="text-align: center; padding: 20px; color: #6c757d; font-style: italic;">
                            Please select a subject from the dropdown above to view the leaderboard.
                        </td>
                    `;
                } else {
                    displaySubjectLeaderboard();
                }
                return;
            } else {
                subjectSelector.style.display = 'none';
            }

            let sortedList;
            let scoreKey;
            let rankKey;
            let percentageKey;

            if (type === 'overall') {
                document.querySelector('.leaderboard-buttons button:nth-child(1)').classList.add('active');
                sortedList = [...processedStudents].sort((a, b) => b.totalMarks - a.totalMarks);
                scoreKey = 'totalMarks';
                rankKey = 'totalMarksRank';
                percentageKey = 'percentageOverall';
            } else if (type === 'best5') {
                document.querySelector('.leaderboard-buttons button:nth-child(2)').classList.add('active');
                sortedList = [...processedStudents].sort((a, b) => b.bestFiveMarks - a.bestFiveMarks);
                scoreKey = 'bestFiveMarks';
                rankKey = 'bestFiveMarksRank';
                percentageKey = 'percentageBestFive';
            }

            // Re-assign ranks for the current sort order using improved ranking
            assignRanks(sortedList, scoreKey);

            sortedList.forEach(student => {
                const row = leaderboardTableBody.insertRow();
                row.innerHTML = `
                    <td class="rank">${student[rankKey]}</td>
                    <td>${student.name}</td>
                    <td>${student.rollNo}</td>
                    <td class="score">${student[scoreKey]}</td>
                    <td class="percentage">${student[percentageKey].toFixed(2)}%</td>
                `;
            });
        }

        // Initialize leaderboard on page load
        document.addEventListener('DOMContentLoaded', () => {
            populateSubjectDropdown();
            displayLeaderboard('best5'); // Display this leaderboard by default
        });