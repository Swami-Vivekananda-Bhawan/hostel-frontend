document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    const adminId = localStorage.getItem('userId');
    const API_URL = "http://localhost:3001";
    const SERVER_URL = "http://localhost:3001";

    if (!token || !adminId) {
        window.location.href = 'login.html';
        return;
    }
    const headers = { 'x-access-token': token };

    let allLeavesData = [], allComplaintsData = [], allQuestionsData = [], allStudentsData = [], currentQuestion = null;

    const socket = io(API_URL);
    socket.emit('admin:joinRoom');

    // --- DOM ELEMENTS ---
    const logoutBtn = document.getElementById('logout-btn');
    const confirmModal = document.getElementById('confirmation-modal');
    const questionList = document.getElementById('questions-list');
    const questionDisplay = document.getElementById('question-display');
    const answerForm = document.getElementById('answer-form');
    const answerInput = document.getElementById('answer-input');
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const leaveSearchInput = document.getElementById('leave-search');
    const studentSearchInput = document.getElementById('student-search');
    const complaintSearchInput = document.getElementById('complaint-search');
    const adminQnaSearchInput = document.getElementById('admin-qna-search');
    const qnaSubTabs = document.querySelectorAll('.qna-tab-btn');
    const addStudentBtn = document.getElementById('add-student-btn');
    const addStudentModal = document.getElementById('add-student-modal');
    const addStudentCloseBtn = document.getElementById('add-student-close-btn');
    const addStudentForm = document.getElementById('add-student-form');
    const addStudentError = document.getElementById('add-student-error');
    const editStudentModal = document.getElementById('edit-student-modal');
    const editStudentCloseBtn = document.getElementById('edit-student-close-btn');
    const editStudentForm = document.getElementById('edit-student-form');
    const editStudentError = document.getElementById('edit-student-error');
    const bulkAddBtn = document.getElementById('bulk-add-btn');
    const bulkAddModal = document.getElementById('bulk-add-modal');
    const bulkAddCloseBtn = document.getElementById('bulk-add-close-btn');
    const bulkSubmitBtn = document.getElementById('bulk-submit-btn');
    const bulkFileInput = document.getElementById('bulk-file-input');
    const bulkAddMessage = document.getElementById('bulk-add-message');
    const profileForm = document.getElementById('profile-form');
    const profileEmailInput = document.getElementById('profile-email');
    const profilePasswordInput = document.getElementById('profile-password');
    const profileConfirmPasswordInput = document.getElementById('profile-confirm-password');
    const profileMessage = document.getElementById('profile-message');

    // --- TAB SWITCHING LOGIC ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            tabContents.forEach(content => {
                content.style.display = (content.id === targetId) ? 'block' : 'none';
            });
            if (targetId === 'profile') {
                fetchAdminProfile();
            }
        });
    });

    // --- CONFIRMATION MODAL LOGIC ---
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');
    let confirmCallback = () => {};

    const showConfirmation = (title, message, onConfirm) => {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmCallback = onConfirm;
        confirmModal.classList.add('active');
    };

    confirmYesBtn.addEventListener('click', () => {
        confirmCallback();
        confirmModal.classList.remove('active');
    });

    confirmNoBtn.addEventListener('click', () => {
        confirmModal.classList.remove('active');
    });

    // --- GENERIC DATA FETCHER ---
    const fetchData = async (endpoint, containerId, tableGenerator, dataStorageCallback) => {
        try {
            const response = await fetch(`${API_URL}/api/admin/${endpoint}`, { headers });
            if (!response.ok) {
                if(response.status === 401 || response.status === 403) window.location.href = 'login.html';
                throw new Error(`Failed to fetch ${endpoint}`);
            }
            const data = await response.json();
            if (dataStorageCallback) dataStorageCallback(data);
            const container = document.getElementById(containerId);
            if(container) container.innerHTML = tableGenerator(data);
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
        }
    };
    
    // --- PROFILE LOGIC ---
    const fetchAdminProfile = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/profile`, { headers });
            if (!response.ok) throw new Error('Failed to fetch profile');
            const data = await response.json();
            profileEmailInput.value = data.email;
        } catch (error) {
            profileMessage.textContent = error.message;
            profileMessage.style.color = 'red';
        }
    };

    // --- Q&A (CHAT) LOGIC ---
    const fetchQuestions = async (view = 'unanswered') => {
        const endpoint = view === 'all' ? '/api/qna/all' : '/api/qna/unanswered';
        try {
            const res = await fetch(`${API_URL}${endpoint}`, { headers });
            if (!res.ok) throw new Error('Could not fetch questions from server.');
            const data = await res.json();
            allQuestionsData = data;
            renderQuestions(data);
        } catch (error) {
            console.error("An error occurred in fetchQuestions:", error);
            if(questionList) questionList.innerHTML = '<p class="no-data">Error loading questions.</p>';
        }
    };

    const renderQuestions = (questions) => {
        if (!questionList) return;
        if (questions.length === 0) {
            questionList.innerHTML = '<p class="no-data">No questions found in this view.</p>';
        } else {
            questionList.innerHTML = questions.map(q => 
                `<div class="question-item ${q.status}" data-id="${q.id}">
                    <p class="student-name">${q.full_name} (${q.scholar_number})</p>
                    <p class="question-preview">${q.question.substring(0, 50)}...</p>
                </div>`
            ).join('');
        }
    };
    
    // --- LEAVES, COMPLAINTS, STUDENTS LOGIC ---
    const handleLeaveStatusUpdate = async (id, status) => {
        try {
            const response = await fetch(`${API_URL}/api/admin/leaves/${id}/status`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error('Failed to update leave status');
            fetchData('leaves', 'leaves-table-container', createLeavesTable, (data) => { allLeavesData = data; });
        } catch (error) {
            console.error(`Error updating leave status:`, error);
            alert('Could not update leave status.');
        }
    };

    const handleComplaintStatusUpdate = async (id, status) => {
        try {
            const response = await fetch(`${API_URL}/api/admin/complaints/${id}/status`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error('Failed to update complaint status');
            fetchData('complaints', 'complaints-table-container', createComplaintsTable, (data) => { allComplaintsData = data; });
        } catch (error) {
            console.error(`Error updating complaint status:`, error);
            alert('Could not update complaint status.');
        }
    };
    
    const handleRemoveStudent = async (studentId) => {
        try {
            const response = await fetch(`${API_URL}/api/admin/students/${studentId}`, {
                method: 'DELETE',
                headers: { ...headers }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            fetchData('students', 'students-table-container', createStudentsTable, (data) => { allStudentsData = data; });
        } catch (error) {
            console.error('Error removing student:', error);
            alert('Failed to remove student.');
        }
    };

    // --- TABLE GENERATORS ---
    const createLeavesTable = (data) => {
        if (data.length === 0) return '<p class="no-data">No leave requests found.</p>';
        let table = '<table><thead><tr><th>Name</th><th>Scholar #</th><th>Room #</th><th>Dates</th><th>Reason</th><th>Address</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        data.forEach(item => {
            let actions = '';
            if (item.status === 'Pending') {
                actions = `
                    <button class="action-btn approve" data-id="${item.id}" data-status="Approved" data-type="leave" title="Approve"><i class="fas fa-check"></i></button>
                    <button class="action-btn reject" data-id="${item.id}" data-status="Rejected" data-type="leave" title="Reject"><i class="fas fa-times"></i></button>
                `;
            }
            table += `<tr>
                <td>${item.student_name}</td>
                <td>${item.scholar_number}</td>
                <td>${item.room_number}</td>
                <td>${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()}</td>
                <td><div class="message-cell">${item.reason}</div></td>
                <td><div class="message-cell">${item.address}</div></td>
                <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
                <td><div class="action-buttons">${actions}</div></td>
            </tr>`;
        });
        table += '</tbody></table>';
        return table;
    };
    
    const createComplaintsTable = (data) => {
        if (data.length === 0) return '<p class="no-data">No complaints found.</p>';
        let table = '<table><thead><tr><th>Name</th><th>Scholar #</th><th>Room #</th><th>Category</th><th>Message</th><th>Media</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        data.forEach(item => {
            let actions = '';
            if (item.status === 'Open') {
                actions = `
                    <button class="action-btn approve" data-id="${item.id}" data-status="Accepted" data-type="complaint" title="Accept"><i class="fas fa-check"></i></button>
                    <button class="action-btn reject" data-id="${item.id}" data-status="Rejected" data-type="complaint" title="Reject"><i class="fas fa-times"></i></button>
                `;
            } else if (item.status === 'Accepted') {
                actions = `<button class="action-btn resolve" data-id="${item.id}" data-status="Resolved" data-type="complaint" title="Resolve"><i class="fas fa-check-double"></i></button>`;
            }
            const mediaLink = item.media_path ? `<a href="${SERVER_URL}/${item.media_path.replace(/\\/g, '/')}" target="_blank" class="media-link">View Media</a>` : 'No Media';
            table += `<tr>
                <td>${item.student_name}</td>
                <td>${item.scholar_number}</td>
                <td>${item.room_number}</td>
                <td>${item.category}</td>
                <td><div class="message-cell">${item.message}</div></td>
                <td>${mediaLink}</td>
                <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
                <td><div class="action-buttons">${actions}</div></td>
            </tr>`;
        });
        table += '</tbody></table>';
        return table;
    };

    const createStudentsTable = (data) => {
        if (data.length === 0) return '<p class="no-data">No students found.</p>';
        let table = '<table><thead><tr><th>Full Name</th><th>Scholar #</th><th>Email</th><th>Mobile #</th><th>Room #</th><th>Actions</th></tr></thead><tbody>';
        data.forEach(student => {
            table += `<tr>
                <td>${student.full_name}</td>
                <td>${student.scholar_number}</td>
                <td>${student.email || '<i>Not Set Up</i>'}</td>
                <td>${student.mobile_number || 'N/A'}</td>
                <td>${student.room_number || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" data-id="${student.id}" title="Edit Student"><i class="fas fa-pencil-alt"></i></button>
                        <button class="action-btn remove" data-id="${student.id}" title="Remove Student"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>`;
        });
        table += '</tbody></table>';
        return table;
    };

    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });

    socket.on('admin:newQuestion', () => {
        const currentView = document.querySelector('.qna-tab-btn.active')?.dataset.view || 'unanswered';
        fetchQuestions(currentView);
    });

    if (questionList) {
        questionList.addEventListener('click', (e) => {
            const questionItem = e.target.closest('.question-item');
            if (questionItem) {
                const questionId = parseInt(questionItem.dataset.id);
                currentQuestion = allQuestionsData.find(q => q.id === questionId);
                
                if (currentQuestion) {
                    questionDisplay.innerHTML = `<p><strong>From:</strong> ${currentQuestion.full_name} (${currentQuestion.scholar_number})</p><p><strong>Question:</strong></p><p class="full-question">${currentQuestion.question}</p>${currentQuestion.answer ? `<p><strong>Your Answer:</strong></p><p class="full-question answered">${currentQuestion.answer}</p>` : ''}`;
                    answerForm.style.display = currentQuestion.status === 'unanswered' ? 'flex' : 'none';
                    answerInput.value = '';
                }
            }
        });
    }

    if (answerForm) {
        answerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const answer = answerInput.value.trim();
            if (!answer || !currentQuestion) return;
            socket.emit('admin:sendAnswer', {
                questionId: currentQuestion.id,
                studentId: currentQuestion.student_id,
                answer,
            });
            answerInput.value = '';
            answerForm.style.display = 'none';
            questionDisplay.innerHTML = `<p class="no-data">Answer sent! Select another question.</p>`;
            fetchQuestions(document.querySelector('.qna-tab-btn.active').dataset.view);
        });
    }

    document.body.addEventListener('click', (e) => {
        const actionButton = e.target.closest('.action-btn');
        if (!actionButton) return;

        const id = actionButton.dataset.id;
        const status = actionButton.dataset.status;
        const type = actionButton.dataset.type;

        if (type === 'leave') {
            showConfirmation(`Confirm ${status}`, `Are you sure you want to ${status.toLowerCase()} this leave request?`, () => handleLeaveStatusUpdate(id, status));
        } else if (type === 'complaint') {
            showConfirmation(`Confirm ${status}`, `Are you sure you want to ${status.toLowerCase()} this complaint?`, () => handleComplaintStatusUpdate(id, status));
        } else if (actionButton.classList.contains('edit')) {
            const student = allStudentsData.find(s => s.id === parseInt(id));
            if (student) {
                editStudentForm.elements['studentId'].value = student.id;
                editStudentForm.elements['fullName'].value = student.full_name;
                editStudentForm.elements['scholarNumber'].value = student.scholar_number;
                editStudentForm.elements['email'].value = student.email;
                editStudentForm.elements['mobileNumber'].value = student.mobile_number;
                editStudentForm.elements['roomNumber'].value = student.room_number;
                editStudentModal.classList.add('active');
            }
        } else if (actionButton.classList.contains('remove')) {
            const student = allStudentsData.find(s => s.id === parseInt(id));
            if (student) {
                showConfirmation('Confirm Removal', `Are you sure you want to remove ${student.full_name}?`, () => handleRemoveStudent(id));
            }
        }
    });
    
    if(leaveSearchInput) leaveSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = allLeavesData.filter(item => item.student_name.toLowerCase().includes(searchTerm) || item.scholar_number.toLowerCase().includes(searchTerm));
        document.getElementById('leaves-table-container').innerHTML = createLeavesTable(filteredData);
    });

    if(studentSearchInput) studentSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = allStudentsData.filter(student => student.full_name.toLowerCase().includes(searchTerm) || student.scholar_number.toLowerCase().includes(searchTerm) || (student.email && student.email.toLowerCase().includes(searchTerm)));
        document.getElementById('students-table-container').innerHTML = createStudentsTable(filteredData);
    });

    if(complaintSearchInput) complaintSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = allComplaintsData.filter(item => 
            item.student_name.toLowerCase().includes(searchTerm) ||
            item.scholar_number.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm) ||
            item.message.toLowerCase().includes(searchTerm)
        );
        document.getElementById('complaints-table-container').innerHTML = createComplaintsTable(filteredData);
    });

    if(adminQnaSearchInput) adminQnaSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = allQuestionsData.filter(q =>
            q.full_name.toLowerCase().includes(searchTerm) ||
            q.scholar_number.toLowerCase().includes(searchTerm) ||
            q.question.toLowerCase().includes(searchTerm)
        );
        renderQuestions(filteredData);
    });

    if(qnaSubTabs) qnaSubTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            qnaSubTabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const view = tab.dataset.view;
            fetchQuestions(view);
        });
    });

    if(addStudentBtn) addStudentBtn.addEventListener('click', () => addStudentModal.classList.add('active'));
    if(addStudentCloseBtn) addStudentCloseBtn.addEventListener('click', () => addStudentModal.classList.remove('active'));
    if(editStudentCloseBtn) editStudentCloseBtn.addEventListener('click', () => editStudentModal.classList.remove('active'));
    if(bulkAddBtn) bulkAddBtn.addEventListener('click', () => bulkAddModal.classList.add('active'));
    if(bulkAddCloseBtn) bulkAddCloseBtn.addEventListener('click', () => bulkAddModal.classList.remove('active'));

    if(addStudentForm) addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addStudentError.textContent = '';
        const formData = new FormData(addStudentForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_URL}/api/admin/students`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            addStudentModal.classList.remove('active');
            addStudentForm.reset();
            fetchData('students', 'students-table-container', createStudentsTable, (data) => { allStudentsData = data; });
        } catch (error) {
            addStudentError.textContent = error.message;
        }
    });

    if(editStudentForm) editStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editStudentError.textContent = '';
        const studentId = editStudentForm.elements['studentId'].value;
        const formData = new FormData(editStudentForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_URL}/api/admin/students/${studentId}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            editStudentModal.classList.remove('active');
            fetchData('students', 'students-table-container', createStudentsTable, (data) => { allStudentsData = data; });
        } catch (error) {
            editStudentError.textContent = error.message;
        }
    });

    if(profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            profileMessage.textContent = '';
            const newPassword = profilePasswordInput.value;
            const confirmPassword = profileConfirmPasswordInput.value;

            if (newPassword !== confirmPassword) {
                profileMessage.textContent = "Passwords do not match!";
                profileMessage.style.color = 'red';
                return;
            }

            const data = { email: profileEmailInput.value };
            if (newPassword) data.password = newPassword;

            try {
                const response = await fetch(`${API_URL}/api/admin/profile`, {
                    method: 'PUT',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                profileMessage.textContent = result.message;
                profileMessage.style.color = 'green';
                profilePasswordInput.value = '';
                profileConfirmPasswordInput.value = '';

            } catch (error) {
                profileMessage.textContent = error.message;
                profileMessage.style.color = 'red';
            }
        });
    }

    if(bulkSubmitBtn) bulkSubmitBtn.addEventListener('click', async () => {
        bulkAddMessage.textContent = '';
        const file = bulkFileInput.files[0];
        if (!file) {
            bulkAddMessage.textContent = 'Please select a file.';
            bulkAddMessage.style.color = 'red';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: ["full_name", "scholar_number", "mobile_number", "room_number"] });
            await processBulkData(json);
        };
        reader.readAsArrayBuffer(file);
    });

    async function processBulkData(students) {
        try {
            const response = await fetch(`${API_URL}/api/admin/students/bulk`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(students)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            bulkAddMessage.textContent = result.message;
            bulkAddMessage.style.color = 'green';
            bulkFileInput.value = '';
            fetchData('students', 'students-table-container', createStudentsTable, (data) => { allStudentsData = data; });
            setTimeout(() => bulkAddModal.classList.remove('active'), 2000);
        } catch (error) {
            bulkAddMessage.textContent = error.message;
            bulkAddMessage.style.color = 'red';
        }
    }

    // --- INITIAL DATA FETCH ---
    fetchData('leaves', 'leaves-table-container', createLeavesTable, (data) => { allLeavesData = data; });
    fetchData('complaints', 'complaints-table-container', createComplaintsTable, (data) => { allComplaintsData = data; });
    fetchQuestions('unanswered');
    fetchData('students', 'students-table-container', createStudentsTable, (data) => { allStudentsData = data; });
});
