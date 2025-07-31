document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const API_URL = "http://localhost:3001";

    const qnaContainer = document.getElementById('qna-container');
    const loginPrompt = document.getElementById('qna-login-prompt');
    const qnaWindow = document.getElementById('qna-window');
    const questionForm = document.getElementById('question-form');
    const questionInput = document.getElementById('question-input');
    const historyList = document.getElementById('history-list');

    if (!token || !userId) {
        loginPrompt.style.display = 'block';
        qnaWindow.style.display = 'none';
        return;
    }

    loginPrompt.style.display = 'none';
    qnaWindow.style.display = 'block';

    const socket = io(API_URL);
    socket.emit('joinRoom', parseInt(userId));

    const renderHistory = (history) => {
        if (!historyList) return;
        if (history.length === 0) {
            historyList.innerHTML = '<p class="no-data">You have no pending questions.</p>';
            return;
        }
        historyList.innerHTML = history.map(item => `
            <div class="qna-item" id="qna-item-${item.id}">
                <p class="qna-question"><strong>Q:</strong> ${item.question}</p>
                <p class="qna-answer"><strong>A:</strong> ${item.answer || '<em>Waiting for answer...</em>'}</p>
                ${item.answer ? `<button class="dismiss-btn" data-id="${item.id}">Dismiss</button>` : ''}
            </div>
        `).join('');
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/api/qna/history`, {
                headers: { 'x-access-token': token }
            });
            if (!res.ok) throw new Error("Could not fetch history");
            const data = await res.json();
            renderHistory(data);
        } catch (error) {
            console.error("Could not fetch history:", error);
        }
    };

    socket.on('student:newAnswer', (data) => {
        fetchHistory(); 
    });

    questionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const question = questionInput.value.trim();
        if (!question) return;

        socket.emit('student:askQuestion', {
            studentId: parseInt(userId),
            question,
        });
        
        questionInput.value = '';
        // Optimistically add to UI
        historyList.innerHTML = `
            <div class="qna-item">
                <p class="qna-question"><strong>Q:</strong> ${question}</p>
                <p class="qna-answer"><strong>A:</strong> <em>Waiting for answer...</em></p>
            </div>
        ` + historyList.innerHTML;
    });

    historyList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('dismiss-btn')) {
            const questionId = e.target.dataset.id;
            try {
                const response = await fetch(`${API_URL}/api/qna/${questionId}/seen`, {
                    method: 'PATCH',
                    headers: { 'x-access-token': token }
                });
                if (!response.ok) throw new Error('Failed to dismiss');
                
                const itemToRemove = document.getElementById(`qna-item-${questionId}`);
                if (itemToRemove) {
                    itemToRemove.remove();
                }
                if (historyList.children.length === 0) {
                    historyList.innerHTML = '<p class="no-data">You have no pending questions.</p>';
                }

            } catch (error) {
                console.error("Dismiss error:", error);
                alert("Could not dismiss the message.");
            }
        }
    });

   

    fetchHistory();
});
