document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("accessToken");
  const adminId = localStorage.getItem("userId");
  const API_URL = "http://localhost:3001";

  if (!token || !adminId) return;

  const questionList = document.getElementById("unanswered-questions-list");
  const questionDisplay = document.getElementById("question-display");
  const answerForm = document.getElementById("answer-form");
  const answerInput = document.getElementById("answer-input");

  let currentQuestion = null;
  let allQuestionsData = [];
  const socket = io(API_URL);
  socket.emit("admin:joinRoom");

  const renderQuestions = (questions) => {
    if (!questionList) return;
    if (questions.length === 0) {
      questionList.innerHTML =
        '<p class="no-data">No unanswered questions.</p>';
      return;
    }
    questionList.innerHTML = questions
      .map(
        (q) =>
          `<div class="question-item" data-id="${q.id}">
                <p class="student-name">${q.full_name} (${q.scholar_number})</p>
                <p class="question-preview">${q.question.substring(
                  0,
                  50
                )}...</p>
            </div>`
      )
      .join("");
  };

  const fetchUnanswered = async () => {
    try {
      const res = await fetch(`${API_URL}/api/qna/unanswered`, {
        headers: { "x-access-token": token },
      });
      if (!res.ok) throw new Error("Could not fetch questions");
      const data = await res.json();
      allQuestionsData = data;
      renderQuestions(data);
    } catch (error) {
      console.error(error);
    }
  };

  socket.on("admin:newQuestion", (newQuestion) => {
    fetchUnanswered();
  });

  questionList.addEventListener("click", (e) => {
    const questionItem = e.target.closest(".question-item");
    if (questionItem) {
      const questionId = parseInt(questionItem.dataset.id);
      currentQuestion = allQuestionsData.find((q) => q.id === questionId);

      if (currentQuestion) {
        questionDisplay.innerHTML = `
                    <p><strong>From:</strong> ${currentQuestion.full_name} (${currentQuestion.scholar_number})</p>
                    <p><strong>Question:</strong></p>
                    <p class="full-question">${currentQuestion.question}</p>
                `;
        answerForm.style.display = "flex";
        answerInput.value = "";
      }
    }
  });

  answerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const answer = answerInput.value.trim();
    if (!answer || !currentQuestion) return;

    socket.emit("admin:sendAnswer", {
      questionId: currentQuestion.id,
      studentId: currentQuestion.student_id,
      answer,
    });

    answerInput.value = "";
    answerForm.style.display = "none";
    questionDisplay.innerHTML = `<p class="no-data">Answer sent! Select another question.</p>`;
    fetchUnanswered();
  });

  const qnaTabButton = document.querySelector("button[onclick*=\"'chat'\"]");
  if (qnaTabButton) {
    qnaTabButton.addEventListener("click", fetchUnanswered);
  }

  fetchUnanswered();
});
